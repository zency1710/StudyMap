function setupSettings() {
    // Populate Profile
    if (State.user) {
        document.getElementById('settings-name').value = State.user.name || '';
        document.getElementById('settings-email').value = State.user.email || '';
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('#theme-icon use');
    const themeSubtitle = document.getElementById('theme-subtitle');

    function updateThemeUI() {
        if (State.theme === 'dark') {
            themeToggle.classList.add('active');
            themeIcon.setAttribute('href', '../assets/icons.svg#moon');
            themeSubtitle.textContent = 'Dark mode is active';
        } else {
            themeToggle.classList.remove('active');
            themeIcon.setAttribute('href', '../assets/icons.svg#sun');
            themeSubtitle.textContent = 'Light mode is active';
        }
    }

    updateThemeUI();

    if (themeToggle) {
        themeToggle.onclick = () => {
            State.toggleTheme();
            updateThemeUI();
            // Also update header theme toggle via initLayout's listener if necessary, 
            // but updateThemeIcons in common.js handles standard toggles.
            // We just need to ensure common.js updates this specific page's unique UI too.
        };
    }

    // Save Profile
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const name = document.getElementById('settings-name').value;
            const email = document.getElementById('settings-email').value;

            if (!name || !email) {
                Toast.show('Error', 'Name and email are required.', 'destructive');
                return;
            }

            try {
                // Show loading state
                const originalText = saveProfileBtn.innerHTML;
                saveProfileBtn.innerHTML = '<svg class="icon icon-spin"><use href="../assets/icons.svg#loader"></use></svg> Saving...';
                saveProfileBtn.disabled = true;

                const response = await API.updateProfile(name, email);

                if (response.error) {
                    throw new Error(response.error);
                }

                if (State.user && response.user) {
                    State.user = response.user;
                    State.save();

                    // Update Sidebar
                    updateUserProfileUI();

                    Toast.show('Profile updated', 'Your profile information has been saved.');
                }
            } catch (error) {
                Toast.show('Update Failed', error.message, 'destructive');
            } finally {
                // Restore button
                saveProfileBtn.innerHTML = 'Save Changes';
                saveProfileBtn.disabled = false;
            }
        };
    }

    // Change Password
    const changePassBtn = document.getElementById('change-password');
    if (changePassBtn) {
        changePassBtn.onclick = async () => {
            const currentPass = document.getElementById('current-password').value;
            const newPass = document.getElementById('new-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (!currentPass) {
                Toast.show('Missing Input', 'Please enter your current password.', 'destructive');
                return;
            }

            if (newPass !== confirmPass) {
                Toast.show("Passwords don't match", 'Please make sure your new passwords match.', 'destructive');
                return;
            }

            if (newPass.length < 6) {
                Toast.show('Password too short', 'Password must be at least 6 characters.', 'destructive');
                return;
            }

            try {
                // Show loading state
                const originalText = changePassBtn.innerHTML;
                changePassBtn.innerHTML = '<svg class="icon icon-spin"><use href="../assets/icons.svg#loader"></use></svg> Changing...';
                changePassBtn.disabled = true;

                const response = await API.changePassword(currentPass, newPass);

                if (response.error) {
                    throw new Error(response.error);
                }

                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';

                Toast.show('Password changed', 'Your password has been updated successfully.');
            } catch (error) {
                Toast.show('Update Failed', error.message, 'destructive');
            } finally {
                changePassBtn.innerHTML = 'Update Password';
                changePassBtn.disabled = false;
            }
        };
    }

}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    State.load();
    if (!State.user) {
        window.location.href = '../auth/auth.html';
        return;
    }

    initLayout();
    setupSettings();
});
