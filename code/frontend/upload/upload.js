function setupUpload() {
    const zone = document.getElementById('upload-zone');
    const zoneContent = document.getElementById('upload-zone-content');
    const filePreview = document.getElementById('file-preview');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const removeFile = document.getElementById('remove-file');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadStatus = document.getElementById('upload-status');
    const uploadPercentage = document.getElementById('upload-percentage');
    const progressFill = document.getElementById('progress-fill');

    let selectedFile = null;

    browseBtn.onclick = () => fileInput.click();

    // Bind click on text area as well, but prevent double triggering if button inside is clicked
    zoneContent.onclick = (e) => {
        if (e.target !== browseBtn) {
            fileInput.click();
        }
    };

    if (zone) {
        zone.ondragover = (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        };

        zone.ondragleave = (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
        };

        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                selectFile(file);
            } else {
                Toast.show('Invalid file type', 'Please upload a PDF file', 'destructive');
            }
        };
    }

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            selectFile(file);
        } else {
            Toast.show('Invalid file type', 'Please upload a PDF file', 'destructive');
        }
    };

    function selectFile(file) {
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        zoneContent.classList.add('hidden');
        filePreview.classList.remove('hidden');
    }

    removeFile.onclick = (e) => {
        e.stopPropagation();
        selectedFile = null;
        zoneContent.classList.remove('hidden');
        filePreview.classList.add('hidden');
        fileInput.value = '';
    };

    uploadBtn.onclick = async () => {
        if (!selectedFile) return;

        const token = localStorage.getItem('studymap-token');
        if (!token) {
            Toast.show('Authentication error', 'Please log in again', 'destructive');
            setTimeout(() => window.location.href = '../auth/auth.html', 2000);
            return;
        }

        uploadBtn.classList.add('hidden');
        uploadProgress.classList.remove('hidden');
        removeFile.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', selectedFile);

        let currentProgress = 0;
        uploadStatus.textContent = 'Uploading and analyzing...';
        const progressInterval = setInterval(() => {
            if (currentProgress < 90) {
                const increment = Math.max(0.5, (90 - currentProgress) * 0.1);
                currentProgress += increment;
                const displayValue = Math.min(99, Math.round(currentProgress));
                uploadPercentage.textContent = displayValue + '%';
                progressFill.style.width = displayValue + '%';
            }
        }, 500);

        try {
            // Use the API service
            const result = await API.uploadSyllabus(selectedFile, selectedFile.name.replace('.pdf', ''));

            clearInterval(progressInterval);

            if (result.error) {
                throw new Error(result.error);
            }

            uploadStatus.textContent = 'Upload successful!';
            uploadPercentage.textContent = '100%';
            progressFill.style.width = '100%';

            Toast.show('Success', 'Syllabus uploaded and analyzed!');

            setTimeout(() => {
                window.location.href = `../extract/extract.html?syllabus_id=${result.syllabus.id}`;
            }, 1500);

        } catch (error) {
            clearInterval(progressInterval);
            console.error('Upload error:', error);
            Toast.show('Upload failed', error.message, 'destructive');
            uploadBtn.classList.remove('hidden');
            uploadProgress.classList.add('hidden');
            removeFile.classList.remove('hidden');
            uploadPercentage.textContent = '0%';
            progressFill.style.width = '0%';
        }
    };

}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }

    initLayout();
    setupUpload();
});
