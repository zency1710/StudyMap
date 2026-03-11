function setupAuthPage() {
    let isLogin = true;
    const form = document.getElementById('auth-form');
    const toggle = document.getElementById('auth-toggle');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('auth-toggle-text');
    const btnText = document.getElementById('auth-btn-text');
    const nameGroup = document.getElementById('name-group');

    // Forgot Password elements
    const forgotLink = document.getElementById('forgot-password-link');
    const mainAuthCard = document.getElementById('main-auth-card');
    const forgotPasswordCard = document.getElementById('forgot-password-card');
    const backToLoginBtn = document.getElementById('back-to-login');
    const forgotForm = document.getElementById('forgot-password-form');

    forgotLink.onclick = (e) => {
        e.preventDefault();
        mainAuthCard.style.display = 'none';
        forgotPasswordCard.style.display = 'block';
        forgotPasswordCard.classList.remove('hidden');
    };

    backToLoginBtn.onclick = () => {
        forgotPasswordCard.style.display = 'none';
        mainAuthCard.style.display = 'block';
    };

    forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const btnIcon = document.querySelector('#forgot-submit .icon use');
        
        const originalIconHref = btnIcon.getAttribute('href');
        btnIcon.setAttribute('href', '../assets/icons.svg#loader');
        btnIcon.parentElement.classList.add('animate-spin');

        try {
            // we calculate the base url for the reset link
            const baseUrl = window.location.origin + window.location.pathname.replace('auth.html', 'reset-password.html');
            const result = await API.forgotPassword(email, baseUrl);
            
            if (result.error) {
                Toast.show('Error', result.error, 'error');
            } else {
                Toast.show('Email Sent', result.message || 'If an account exists, a password reset link has been sent.', 'success');
                // return to login screen
                forgotPasswordCard.style.display = 'none';
                mainAuthCard.style.display = 'block';
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            Toast.show('Error', 'Something went wrong. Please try again.', 'error');
        } finally {
            btnIcon.setAttribute('href', originalIconHref);
            btnIcon.parentElement.classList.remove('animate-spin');
        }
    };


    toggle.onclick = () => {
        isLogin = !isLogin;
        if (isLogin) {
            title.textContent = 'Welcome back!';
            subtitle.textContent = 'Enter your credentials to continue';
            toggleText.textContent = "Don't have an account?";
            toggle.textContent = 'Sign up';
            btnText.textContent = 'Sign In';
            nameGroup.classList.add('hidden');
            if (forgotLink) forgotLink.style.display = 'inline-block';
        } else {
            title.textContent = 'Create account';
            subtitle.textContent = 'Start your learning journey today';
            toggleText.textContent = 'Already have an account?';
            toggle.textContent = 'Sign in';
            btnText.textContent = 'Create Account';
            nameGroup.classList.remove('hidden');
            if (forgotLink) forgotLink.style.display = 'none';
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value;
        const btnIcon = document.querySelector('#auth-submit .icon use');

        // Show loading state
        const originalIconHref = btnIcon.getAttribute('href');
        btnIcon.setAttribute('href', '../assets/icons.svg#loader');
        btnIcon.parentElement.classList.add('animate-spin');

        try {
            let result;

            if (isLogin) {
                // Login with backend API
                result = await API.login(email, password);
            } else {
                // Register with backend API
                result = await API.register(email, password, name);
            }

            // Check for errors
            if (result.error) {
                Toast.show(
                    'Error',
                    result.error,
                    'error'
                );
                // Reset button
                btnIcon.setAttribute('href', originalIconHref);
                btnIcon.parentElement.classList.remove('animate-spin');
                return;
            }

            // Save token to localStorage
            if (result.token) {
                localStorage.setItem('studymap-token', result.token);
            }

            // Save user data to State
            State.user = result.user;
            State.save();

            Toast.show(
                isLogin ? 'Welcome back!' : 'Account created!',
                isLogin ? "You've successfully logged in." : 'Welcome to StudyMap.'
            );

            // Redirect based on role
            if (result.user.role === 'admin') {
                window.location.href = '../admin/admin.html';
            } else {
                // Check if user has any syllabi to determine landing page
                try {
                    const syllabiResponse = await API.getSyllabi();
                    if (syllabiResponse.syllabi && syllabiResponse.syllabi.length > 0) {
                        window.location.href = '../dashboard/dashboard.html';
                    } else {
                        window.location.href = '../upload/upload.html';
                    }
                } catch (error) {
                    console.error('Error checking syllabi count:', error);
                    window.location.href = '../dashboard/dashboard.html';
                }
            }

        } catch (error) {
            console.error('Auth error:', error);
            Toast.show(
                'Error',
                'Something went wrong. Please try again.',
                'error'
            );
            // Reset button
            btnIcon.setAttribute('href', originalIconHref);
            btnIcon.parentElement.classList.remove('animate-spin');
        }
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    State.load();

    // Check if user is already logged in
    const token = localStorage.getItem('studymap-token');
    if (token) {
        try {
            const result = await API.getCurrentUser();
            if (result.user) {
                State.user = result.user;
                State.save();

                // Redirect to appropriate page
                if (result.user.role === 'admin') {
                    window.location.href = '../admin/admin.html';
                } else {
                    window.location.href = '../dashboard/dashboard.html';
                }
                return;
            }
        } catch (error) {
            // Token invalid, clear it
            localStorage.removeItem('studymap-token');
        }
    }

    initLayout();
    setupAuthPage();
});
