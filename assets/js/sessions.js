// Traducir.
function getLang() {
    if (typeof window.getSudokuLang === "function") {
        return window.getSudokuLang();
    }
    return localStorage.getItem("sudoku_lang") || "es";
}

function t(key) {
    const lang = getLang();
    return (window.texts && window.texts[lang] && window.texts[lang][key]) || key;
}

function showMessage(form, text, type = 'error') {
    let box = form.querySelector('.form-message');
    if (!box) {
        box = document.createElement('p');
        box.className = 'form-message';
        box.setAttribute('aria-live', 'polite');
        form.appendChild(box);
    }

    box.textContent = text;
    box.style.margin = '8px 0 0';
    box.style.fontWeight = '700';
    box.style.opacity = '0.95';
    box.style.color = type === 'ok' ? 'rgba(34,197,94,0.95)' : 'rgba(248,113,113,0.95)';
}

// Comprobar correo.
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Registro.
function registerValidation(form) {
    const username = form.querySelector('#username');
    const email = form.querySelector('#email');
    const password = form.querySelector('#password');
    const confirm = form.querySelector('#password_confirm');

    form.addEventListener('submit', (e) => {
        const un = (username?.value ?? '').trim();
        const em = (email?.value ?? '').trim();
        const pw = password?.value ?? '';
        const cf = confirm?.value ?? '';

        if (un.length < 3 || un.length > 20) {
            e.preventDefault();
            showMessage(form, t('session_username_length'));
            username?.focus();
            return;
        }
        if (!isValidEmail(em)) {
            e.preventDefault();
            showMessage(form, t('session_invalid_email'));
            email?.focus();
            return;
        }
        if (pw.length < 6) {
            e.preventDefault();
            showMessage(form, t('session_password_short'));
            password?.focus();
            return;
        }
        if (pw !== cf) {
            e.preventDefault();
            showMessage(form, t('session_password_mismatch'));
            confirm?.focus();
            return;
        }
        if (form.getAttribute('action') === '#') {
            e.preventDefault();
            showMessage(form, t('session_register_ok'), 'ok');
        }
    });
}

// Inicio sesión.
function loginValidation(form) {
    const email = form.querySelector('#email');
    const password = form.querySelector('#password');

    form.addEventListener('submit', (e) => {
        const em = (email?.value ?? '').trim();
        const pw = password?.value ?? '';

        if (!isValidEmail(em)) {
            e.preventDefault();
            showMessage(form, t('session_invalid_email'));
            email?.focus();
            return;
        }
        if (pw.length < 6) {
            e.preventDefault();
            showMessage(form, t('session_password_short'));
            password?.focus();
            return;
        }
        if (form.getAttribute('action') === '#') {
            e.preventDefault();
            showMessage(form, t('session_login_ok'), 'ok');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;

    const isRegister = !!(form.querySelector('#password_confirm') && form.querySelector('#username'));
    if (isRegister) registerValidation(form);
    else loginValidation(form);
});
