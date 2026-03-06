(async () => {
    async function getUserSession() {
        try {
            const res = await fetch('php/user_session.php', { credentials: 'include' });
            if (!res.ok) return { loggedIn: false, username: null };
            return await res.json();
        } catch {
            return { loggedIn: false, username: null };
        }
    }

    async function setCsrfToken() {
        const inputs = document.querySelectorAll('input[name="csrf_token"]');
        if (!inputs.length) return;

        try {
            const res = await fetch('php/csrf_token.php', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.ok || !data.csrf_token) return;
            inputs.forEach((input) => {
                input.value = data.csrf_token;
            });
        } catch {
            // Sin bloqueo.
        }
    }

    const us = await getUserSession();

    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    const navDelete = document.getElementById('nav-delete-account');

    if (us.loggedIn) {
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';
        if (navLogout) navLogout.style.display = '';
        if (navDelete) navDelete.style.display = '';
        localStorage.setItem('sudoku_current_user', us.username);
    } else {
        if (navLogin) navLogin.style.display = '';
        if (navRegister) navRegister.style.display = '';
        if (navLogout) navLogout.style.display = 'none';
        if (navDelete) navDelete.style.display = 'none';
        localStorage.removeItem('sudoku_current_user');
    }

    const userStrong = document.querySelector('.user-badge strong');
    if (userStrong) {
        userStrong.textContent = us.loggedIn ? us.username : 'Invitado';
    }

    const logoutBtn = document.getElementById('btn-logout');
    const deleteBtn = document.getElementById('btn-delete-account');

    if (us.loggedIn) {
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }

    await setCsrfToken();
})();
