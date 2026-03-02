"""
pdf_pipeline.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Robust PDF → Unit/Topic/Sub-Topic extraction pipeline.

Pipeline stages:
  Step 1 – PDF Cleaning        (page number removal, header/footer stripping,
                                 bounding-box filtering, line merging)
  Step 2 – Structure Detection (heading detection, number/uppercase/bold cues)
  Step 3 – AI Extraction       (clean prompt, strict JSON enforcement)
  Step 4 – Fallback parser     (regex-based manual parser + JSON validation)
  Step 5 – Per-syllabus isolation (caller passes syllabus_id)
  Step 6 – Chunked processing  (2-4 pages per AI request, safe JSON merge)
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter
from typing import Any, Optional

import pdfplumber

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

PAGE_NUMBER_PATTERNS: list[re.Pattern] = [
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*page\s*\d+(\s*of\s*\d+)?\s*$", re.IGNORECASE),
    re.compile(r"^\s*\d+\s*/\s*\d+\s*$"),
    re.compile(r"^\s*-\s*\d+\s*-\s*$"),
]

# Words that are almost always noise and must never appear as topic names
NOISE_KEYWORDS: list[str] = [
    "assessment", "evaluation", "credit", "credits", "reference", "bibliography",
    "textbook", "outcome", "objectives", "prerequisite", "schedule", "contact",
    "email", "phone", "office", "project submission", "assignment", "grading",
    "marks", "publisher", "copyright", "isbn", "edition", "author", "revised",
    "all rights reserved", "printed",
]

# Patterns for major structural headers (UNIT, MODULE, CHAPTER, PART, etc.)
UNIT_PATTERN = re.compile(
    r"^(?:UNIT|MODULE|CHAPTER|PART|SECTION)\s*[\-–]?\s*(\d+|[IVXLCDM]+)\s*[:\-–]?\s*(.*)$",
    re.IGNORECASE,
)
NUMBERED_TOPIC = re.compile(r"^\d+\.\s+(.+)$")           # 1. Topic name
NUMBERED_TOPIC_LOOSE = re.compile(r"^\d+\.?\s+(.+)$")   # 3 Input and Output (no dot)
NUMBERED_SUBTOPIC = re.compile(r"^\d+\.\d+\.?\s*(.+)$") # 1.1 or 1.1. SubTopic
LONE_NUMBER = re.compile(r"^\d+\.\d+\.?$")              # Dangling "2.1." lines only
LONE_TOP_NUMBER = re.compile(r"^\d+\.$")                 # Dangling "3." lines (require dot)

CHUNK_SIZE = 4   # pages per AI call (Step 6)

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1 – PDF CLEANING
# ──────────────────────────────────────────────────────────────────────────────

def _is_page_number(line: str) -> bool:
    stripped = line.strip()
    return any(p.match(stripped) for p in PAGE_NUMBER_PATTERNS)


def _extract_page_lines(page) -> list[str]:
    """
    Extract lines from a single pdfplumber Page object.
    Uses bounding-box filtering: skip top 8% and bottom 10% of the page.
    Falls back to plain text extraction if word-level data unavailable.
    """
    try:
        height = page.height
        top_cutoff = height * 0.08
        bottom_cutoff = height * 0.90

        # Try char-level extraction for bounding box support
        words = page.extract_words(keep_blank_chars=False)
        if not words:
            raw = page.extract_text()
            return raw.splitlines() if raw else []

        # Filter by vertical position
        filtered_words = [
            w for w in words
            if w["top"] >= top_cutoff and w["bottom"] <= bottom_cutoff
        ]
        if not filtered_words:
            return []

        # Re-assemble lines by grouping words with similar vertical position
        lines: list[str] = []
        current_line_words: list[dict] = []
        current_y: Optional[float] = None

        for word in sorted(filtered_words, key=lambda w: (round(w["top"], 0), w["x0"])):
            y = round(word["top"], 0)
            if current_y is None or abs(y - current_y) > 3:
                if current_line_words:
                    lines.append(" ".join(w["text"] for w in current_line_words))
                current_line_words = [word]
                current_y = y
            else:
                current_line_words.append(word)

        if current_line_words:
            lines.append(" ".join(w["text"] for w in current_line_words))

        return lines

    except Exception:
        # Fallback: plain text
        raw = page.extract_text()
        return raw.splitlines() if raw else []


def _detect_repeated_lines(all_page_lines: list[list[str]], min_freq: int = 3) -> set[str]:
    """
    Detect lines that repeat across ≥ min_freq pages (likely headers/footers).
    """
    counter: Counter = Counter()
    for page_lines in all_page_lines:
        seen_on_page = set()
        for line in page_lines:
            stripped = line.strip()
            if stripped and stripped not in seen_on_page:
                counter[stripped] += 1
                seen_on_page.add(stripped)
    repeated = {line for line, count in counter.items() if count >= min_freq}
    return repeated


def _merge_broken_lines(lines: list[str]) -> list[str]:
    """
    Merge lines that are continuation fragments of the previous line.
    A fragment is a non-empty line that:
      - doesn't start with a number
      - doesn't start with an uppercase letter (unlikely to be a new heading)
      - is very short (< 4 words)
    Only merges if the previous line doesn't end with punctuation already.
    """
    merged: list[str] = []
    for raw in lines:
        line = raw.strip()
        if not line:
            merged.append("")
            continue
        if (
            merged
            and merged[-1]
            and not re.match(r"^\d", line)
            and not line[0].isupper()
            and len(line.split()) < 4
            and not merged[-1].endswith((".", ":", ";", "?", "!"))
        ):
            merged[-1] = merged[-1] + " " + line
        else:
            merged.append(line)
    return merged


def clean_pdf(filepath: str) -> list[list[str]]:
    """
    STEP 1: Open PDF, extract per-page lines, apply all cleaning steps.
    Returns a list of pages, where each page is a list of clean strings.
    """
    all_page_lines: list[list[str]] = []

    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            lines = _extract_page_lines(page)
            all_page_lines.append(lines)

    # Detect repeated headers/footers across pages
    repeated = _detect_repeated_lines(all_page_lines, min_freq=3)

    cleaned_pages: list[list[str]] = []
    for raw_lines in all_page_lines:
        clean: list[str] = []
        for line in raw_lines:
            stripped = line.strip()
            if not stripped:
                continue
            if _is_page_number(stripped):
                continue
            if stripped in repeated:
                continue
            clean.append(stripped)

        # Merge continuation fragments
        clean = _merge_broken_lines(clean)
        clean = [l for l in clean if l.strip()]
        cleaned_pages.append(clean)

    return cleaned_pages


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2 – STRUCTURE DETECTION
# ──────────────────────────────────────────────────────────────────────────────

def _is_likely_heading(line: str) -> bool:
    """
    Heuristic: a line is likely a structural heading if it:
    - Matches UNIT/MODULE/CHAPTER patterns, or
    - Is fully uppercase with >= 3 chars, or
    - Starts with a numbered pattern.
    """
    s = line.strip()
    if not s:
        return False
    if UNIT_PATTERN.match(s):
        return True
    if NUMBERED_TOPIC.match(s):
        return True
    if NUMBERED_SUBTOPIC.match(s):
        return True
    # All-uppercase lines of 3+ meaningful words
    words = s.split()
    if len(words) >= 2 and s == s.upper() and s.isalpha() is False:
        upper_ratio = sum(1 for c in s if c.isupper()) / max(1, len(s))
        if upper_ratio > 0.7:
            return True
    return False


def structure_pages(cleaned_pages: list[list[str]]) -> str:
    """
    STEP 2: Produce a single string of only structurally relevant lines
    to send to the AI, keeping noise out.
    """
    result_lines: list[str] = []
    for page_lines in cleaned_pages:
        for line in page_lines:
            # Always include headings; include non-noise text lines too
            if _is_likely_heading(line) or (
                len(line) > 5
                and not any(kw in line.lower() for kw in NOISE_KEYWORDS)
            ):
                result_lines.append(line)
    return "\n".join(result_lines)


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3 – AI EXTRACTION
# ──────────────────────────────────────────────────────────────────────────────

AI_SYSTEM_PROMPT = (
    "You are an expert academic curriculum parser. "
    "Your ONLY job is to extract the hierarchical structure of a syllabus. "
    "IGNORE: page numbers, university names, publisher info, repeated titles, "
    "footers, schedules, grading policies, references, or any non-academic content. "
    "Output ONLY valid JSON — no explanations, no extra text."
)

AI_USER_PROMPT_TEMPLATE = """\
Extract the syllabus hierarchy from the text below.

STRICT RULES:
1. Identify UNITS (or MODULES/CHAPTERS) → TOPICS → SUBTOPICS.
2. Remove numbering prefixes from names (e.g., "1.1 Topic" → "Topic").
3. Do NOT include page numbers, headers, footers, or publisher text.
4. If you are unsure whether a line is structure or noise → discard it.

Return ONLY this JSON structure:
{{
  "units": [
    {{
      "unit_title": "string",
      "topics": [
        {{
          "topic_title": "string",
          "subtopics": ["string"]
        }}
      ]
    }}
  ]
}}

Syllabus text:
{text}
"""


def _call_ai(client, text: str) -> Optional[dict]:
    """Call OpenAI and return parsed JSON or None on failure."""
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": AI_SYSTEM_PROMPT},
                {"role": "user", "content": AI_USER_PROMPT_TEMPLATE.format(text=text)},
            ],
            response_format={"type": "json_object"},
            timeout=90.0,
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"[pdf_pipeline] AI call failed: {e}")
        return None


# ──────────────────────────────────────────────────────────────────────────────
# STEP 4 – MANUAL FALLBACK PARSER + JSON VALIDATION
# ──────────────────────────────────────────────────────────────────────────────

def _is_valid_name(name: str) -> bool:
    """Filter noise strings from topic/subtopic names."""
    if not name:
        return False
    n = name.strip()
    if len(n) < 3 or len(n) > 150:
        return False
    lower = n.lower()
    if any(kw in lower for kw in NOISE_KEYWORDS):
        return False
    if re.search(r"https?://", lower):
        return False
    punct_ratio = sum(1 for c in n if c in ",;:()[]{}|\\/") / max(1, len(n))
    if punct_ratio > 0.3:
        return False
    return True


def _preprocess_lines(lines: list[str]) -> list[str]:
    """
    Rejoin dangling numbering lines (e.g., "2.1." alone) with the following
    text lines, emitting complete numbered entries like "2.1. Some Topic".
    Multiple pending numbers drain sequentially into the next text lines.
    """
    pending: list[str] = []
    output: list[str] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if LONE_NUMBER.match(line) or LONE_TOP_NUMBER.match(line):
            pending.append(line)
        else:
            if pending:
                num = pending.pop(0)
                output.append(f"{num} {line}")
                # Any remaining pending numbers still float — they'll grab the next lines
            else:
                output.append(line)

    return output


def manual_parse(cleaned_pages: list[list[str]]) -> list[dict]:
    """
    STEP 4 fallback: rule-based hierarchical parser.
    Returns list of subjects/units in the internal format:
    [{"name": str, "topics": [{"name": str, "subtopics": [{"name": str}]}]}]
    """
    # Flatten all page lines
    all_lines: list[str] = []
    for page_lines in cleaned_pages:
        all_lines.extend(page_lines)

    # Pre-process to rejoin dangling numbers
    lines = _preprocess_lines(all_lines)

    subjects: list[dict] = []
    current_subject: Optional[dict] = None
    current_topic: Optional[dict] = None

    for line in lines:
        # ── Unit / Module / Chapter heading ──────────────────────────────────
        unit_m = UNIT_PATTERN.match(line)
        if unit_m:
            suffix = unit_m.group(2).strip()
            unit_num = unit_m.group(1).strip()
            subject_name = suffix if suffix else f"Unit {unit_num}"
            if current_subject:
                subjects.append(current_subject)
            current_subject = {"name": subject_name, "topics": []}
            current_topic = None
            continue

        if current_subject is None:
            # No unit started yet — skip any title-level lines rather than
            # treating them as subject headers. This avoids "PYTHON PROGRAMMING"
            # or other document titles being parsed as a unit.
            continue

        # ── Numbered subtopic: 1.1 / 1.1. / 1.1Name ─────────────────────────
        sub_m = NUMBERED_SUBTOPIC.match(line)
        if sub_m:
            name = sub_m.group(1).strip()
            if _is_valid_name(name):
                target = current_topic or (
                    current_subject["topics"][-1] if current_subject["topics"] else None
                )
                if target:
                    target.setdefault("subtopics", []).append({"name": name})
            continue

        # ── Numbered topic: 1. Topic / 3 Topic (no dot) ────────────────────
        top_m = NUMBERED_TOPIC.match(line) or NUMBERED_TOPIC_LOOSE.match(line)
        if top_m:
            name = top_m.group(1).strip()
            # Extra guard: if it actually matched a subtopic pattern, skip
            if not NUMBERED_SUBTOPIC.match(line) and _is_valid_name(name):
                current_topic = {"name": name, "subtopics": []}
                current_subject["topics"].append(current_topic)
            continue

        # ── Bullet / dash ─────────────────────────────────────────────────────
        bullet_m = re.match(r"^[•\-\*–—]\s+(.+)$", line)
        if bullet_m:
            name = bullet_m.group(1).strip()
            if _is_valid_name(name):
                if current_topic:
                    current_topic.setdefault("subtopics", []).append({"name": name})
                else:
                    current_topic = {"name": name, "subtopics": []}
                    current_subject["topics"].append(current_topic)
            continue

        # ── Plain text ────────────────────────────────────────────────────────
        if _is_valid_name(line) and len(line.split()) < 12:
            if current_topic:
                current_topic.setdefault("subtopics", []).append({"name": line})
            else:
                current_topic = {"name": line, "subtopics": []}
                current_subject["topics"].append(current_topic)

    if current_subject:
        subjects.append(current_subject)

    if not subjects:
        subjects = [{"name": "General Topics", "topics": []}]

    return subjects


def _validate_and_normalise(data: Any, syllabus_id: Optional[int] = None) -> list[dict]:
    """
    STEP 4 (validation): Accept either the AI JSON format ({"units": [...]})
    or the internal format ([{"name": ..., "topics": [...]}]) and normalise
    to the internal format.  Attaches syllabus_id metadata if provided.
    """
    try:
        if isinstance(data, dict):
            units = data.get("units") or data.get("subjects") or []
        elif isinstance(data, list):
            units = data
        else:
            return []

        normalised: list[dict] = []
        for u in units:
            # Support both AI format ("unit_title") and internal ("name")
            name = (u.get("unit_title") or u.get("name") or "").strip()
            if not name:
                continue
            topics_raw = u.get("topics") or []
            topics: list[dict] = []
            for t in topics_raw:
                t_name = (t.get("topic_title") or t.get("name") or "").strip()
                if not t_name or not _is_valid_name(t_name):
                    continue
                # Support both ["string"] and [{"name": "string"}] subtopics
                raw_subs = t.get("subtopics") or []
                subs: list[dict] = []
                for s in raw_subs:
                    if isinstance(s, str):
                        s_name = s.strip()
                    elif isinstance(s, dict):
                        s_name = (s.get("name") or "").strip()
                    else:
                        continue
                    if _is_valid_name(s_name):
                        subs.append({"name": s_name})
                topics.append({"name": t_name, "subtopics": subs})

            entry: dict = {"name": name, "topics": topics}
            if syllabus_id is not None:
                entry["syllabus_id"] = syllabus_id
            normalised.append(entry)

        return normalised
    except Exception as e:
        print(f"[pdf_pipeline] Validation error: {e}")
        return []


def _merge_unit_lists(base: list[dict], extra: list[dict]) -> list[dict]:
    """
    Safely merge two unit lists by name, combining topics.
    Used in Step 6 chunked processing.
    """
    index = {u["name"]: u for u in base}
    for unit in extra:
        name = unit["name"]
        if name in index:
            # Merge topics (deduplicate by name)
            existing_topics = {t["name"] for t in index[name]["topics"]}
            for t in unit["topics"]:
                if t["name"] not in existing_topics:
                    index[name]["topics"].append(t)
                    existing_topics.add(t["name"])
        else:
            index[name] = unit
            base.append(unit)
    return base


# ──────────────────────────────────────────────────────────────────────────────
# STEP 5 & 6 – MAIN ENTRY POINT (per-syllabus, chunked)
# ──────────────────────────────────────────────────────────────────────────────

def extract_syllabus_structure(
    filepath: str,
    syllabus_id: Optional[int] = None,
    openai_client=None,
) -> list[dict]:
    """
    Full pipeline entry point.

    Args:
        filepath:       Path to the uploaded PDF file.
        syllabus_id:    ID to attach to this extraction (Step 5 isolation).
        openai_client:  An initialised openai.OpenAI client, or None to use
                        only the fallback manual parser.

    Returns:
        List of normalised subject/unit dicts:
        [
            {
                "name": "Unit 1 – Introduction",
                "topics": [
                    {"name": "Intro to Python", "subtopics": [{"name": "Variables"}]}
                ]
            },
            ...
        ]
    """
    print(f"[pdf_pipeline] Starting extraction: {filepath} (syllabus_id={syllabus_id})")

    # ── Step 1: Clean PDF ─────────────────────────────────────────────────────
    try:
        cleaned_pages = clean_pdf(filepath)
    except Exception as e:
        print(f"[pdf_pipeline] PDF cleaning failed: {e}")
        return []

    total_pages = len(cleaned_pages)
    print(f"[pdf_pipeline] Cleaned {total_pages} pages")

    if total_pages == 0:
        print("[pdf_pipeline] No content extracted.")
        return []

    # ── No AI available → fallback immediately ────────────────────────────────
    api_key = os.environ.get("OPENAI_API_KEY", "")
    has_ai = openai_client is not None and api_key and api_key not in ("your-openai-api-key", "")

    if not has_ai:
        print("[pdf_pipeline] No AI available. Using manual parser.")
        result = manual_parse(cleaned_pages)
        return _validate_and_normalise(result, syllabus_id)

    # ── Steps 2, 3, 6: Chunked AI extraction ─────────────────────────────────
    merged_units: list[dict] = []
    chunks = [cleaned_pages[i : i + CHUNK_SIZE] for i in range(0, total_pages, CHUNK_SIZE)]

    for chunk_idx, chunk_pages in enumerate(chunks):
        print(f"[pdf_pipeline] Processing chunk {chunk_idx + 1}/{len(chunks)} ({len(chunk_pages)} pages)")

        # Step 2 – structure detection on this chunk
        chunk_text = structure_pages(chunk_pages)

        if not chunk_text.strip():
            print(f"[pdf_pipeline] Chunk {chunk_idx + 1} is empty after cleaning, skipping.")
            continue

        # Cap text size per AI call to stay within token budget
        chunk_text_trimmed = chunk_text[:12000]

        # Step 3 – AI call
        ai_result = _call_ai(openai_client, chunk_text_trimmed)

        if ai_result:
            normalised = _validate_and_normalise(ai_result, syllabus_id)
            if normalised:
                merged_units = _merge_unit_lists(merged_units, normalised)
                continue

        # AI failed for this chunk → manual fallback for the chunk
        print(f"[pdf_pipeline] Falling back to manual parser for chunk {chunk_idx + 1}.")
        manual_result = manual_parse(chunk_pages)
        normalised = _validate_and_normalise(manual_result, syllabus_id)
        merged_units = _merge_unit_lists(merged_units, normalised)

    # Final deduplication pass
    if not merged_units:
        print("[pdf_pipeline] AI produced no output; running full manual parse.")
        manual_result = manual_parse(cleaned_pages)
        merged_units = _validate_and_normalise(manual_result, syllabus_id)

    print(f"[pdf_pipeline] Extraction complete: {len(merged_units)} unit(s) found.")
    return merged_units
