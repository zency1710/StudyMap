document.addEventListener('DOMContentLoaded', () => {
    initLayout();

    const form = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const resetCard = document.getElementById('reset-password-card');
    const successCard = document.getElementById('reset-success-card');

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        Toast.show('Error', 'Invalid or missing password reset token.', 'error');
        // Disable form to prevent submissions
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => input.disabled = true);
        return;
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            Toast.show('Error', 'Passwords do not match.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            Toast.show('Error', 'Password must be at least 6 characters.', 'error');
            return;
        }

        const btnIcon = document.querySelector('#reset-submit .icon use');
        const originalIconHref = btnIcon.getAttribute('href');
        btnIcon.setAttribute('href', '../assets/icons.svg#loader');
        btnIcon.parentElement.classList.add('animate-spin');

        try {
            const result = await API.resetPassword(token, newPassword);

            if (result.error) {
                Toast.show('Error', result.error, 'error');
                btnIcon.setAttribute('href', originalIconHref);
                btnIcon.parentElement.classList.remove('animate-spin');
            } else {
                // Show success view
                resetCard.style.display = 'none';
                successCard.style.display = 'block';
                successCard.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            Toast.show('Error', 'Failed to reset password. The link might be expired.', 'error');
            btnIcon.setAttribute('href', originalIconHref);
            btnIcon.parentElement.classList.remove('animate-spin');
        }
    };
});
