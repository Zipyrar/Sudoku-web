function showMessage(form, text, type = "error") {
    let box = form.querySelector(".form-message");
    if (!box) {
        box = document.createElement("p");
        box.className = "form-message";
        box.setAttribute("aria-live", "polite");
        form.appendChild(box);
    }

    box.textContent = text;
    box.style.margin = "8px 0 0";
    box.style.fontWeight = "700";
    box.style.opacity = "0.95";
    box.style.color = type === "ok" ? "rgba(34,197,94,0.95)" : "rgba(248,113,113,0.95)";
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function registerValidaton(form) {
    const username = form.querySelector("#username");
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");
    const confirm = form.querySelector("#password_confirm");

    form.addEventListener("submit", (e) => {
        const un = username?.value.trim() ?? "";
        const em = email?.value.trim() ?? "";
        const pw = password?.value ?? "";
        const cf = confirm?.value ?? "";

        // Validaciones.
        if (un < 3 || un > 20) {
            e.preventDefault();
            showMessage(form, "El nombre de usuario debe tener entre 3 y 20 caracteres.");
            username.focus();
            return;
        }

        if(!isValidEmail(em)) {
            e.preventDefault();
            showMessage(form, "El correo no es válido.");
            email.focus();
            return;
        }

        if(pw < 6) {
            e.preventDefault();
            showMessage(form, "La contraseña debe tener un mínimo de 6 caracteres.");
            pw.focus();
            return;
        }

        if(pw !== cf) {
            e.preventDefault();
            showMessage(form, "Las contraseñas no coinciden.");
            cf.focus();
            return;
        }

        // Si todo fue correcto (evitar enviar por ahora).
        if (form.getAttribute("action") === "#") {
            e.preventDefault();
            showMessage(form, "Registro correcto.", "ok");
        }
    });
}

function registerValidaton(form) {
    const email = form.querySelector("#email");
    const password = form.querySelector("#password");

    form.addEventListener("submit", (e) => {
        const em = email?.value.trim() ?? "";
        const pw = password?.value ?? "";

        // Validaciones.
        if(!isValidEmail(em)) {
            e.preventDefault();
            showMessage(form, "El correo no es válido.");
            email.focus();
            return;
        }

        if(pw < 6) {
            e.preventDefault();
            showMessage(form, "La contraseña debe tener un mínimo de 6 caracteres.");
            pw.focus();
            return;
        }

        // Si todo fue correcto (evitar enviar por ahora).
        if (form.getAttribute("action") === "#") {
            e.preventDefault();
            showMessage(form, "Inicio de sesión correcto.", "ok");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    if (!form) return;

    const hasRegisterFields = form.querySelector("#password_confirm") && form.querySelector("#username");
    if (hasRegisterFields) registerValidation(form);
    else loginValidation(form);
});