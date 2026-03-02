// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');
if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('open');
    });
    // Close mobile menu when a link is clicked
    mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('open');
        });
    });
}

// Get Started button handler
function handleGetStarted() {
    const saved = localStorage.getItem('studymap_user') || localStorage.getItem('studymap-user');
    if (saved) {
        window.location.href = '../dashboard/dashboard.html';
    } else {
        window.location.href = '../auth/auth.html';
    }
}

document.getElementById('navCta')?.addEventListener('click', handleGetStarted);
document.getElementById('mobileCta')?.addEventListener('click', handleGetStarted);
document.getElementById('heroCta')?.addEventListener('click', handleGetStarted);
document.getElementById('ctaBtn')?.addEventListener('click', handleGetStarted);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Pause animations until in view
document.querySelectorAll('.animate-slide-up, .animate-fade-in').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
});
