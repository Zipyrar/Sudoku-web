async function initPageI18n() {
    function getLangFromUrlOrStorage() {
        const params = new URLSearchParams(window.location.search);
        return params.get("lang") || localStorage.getItem("sudoku_lang") || "es";
    }

    function setCurrentLang(lang) {
        localStorage.setItem("sudoku_lang", lang);

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("lang", lang);
        window.history.replaceState({}, "", currentUrl);

        document.documentElement.lang = lang;
        window.currentSudokuLang = lang;
    }

    function getDict(lang) {
        return (window.texts && window.texts[lang]) ? window.texts[lang] : {};
    }

    function translateElement(el, dict) {
        const key = el.dataset.i18n;
        if (!key || !dict[key]) return;

        const tag = el.tagName.toLowerCase();

        if (tag === "input") {
            const type = (el.getAttribute("type") || "").toLowerCase();
            if (type === "submit" || type === "button" || type === "reset") {
                el.value = dict[key];
            } else {
                el.placeholder = dict[key];
            }
            return;
        }

        if (tag === "option") {
            el.textContent = dict[key];
            return;
        }

        el.textContent = dict[key];
    }

    function applyTranslations(lang) {
        const dict = getDict(lang);

        document.querySelectorAll("[data-i18n]").forEach((el) => {
            translateElement(el, dict);
        });

        const langButton = document.getElementById("langButton");
        if (langButton) {
            langButton.textContent = lang.toUpperCase() + " ▼";
        }

        document.documentElement.lang = lang;
        window.currentSudokuLang = lang;
    }

    window.applyTranslations = applyTranslations;
    window.getSudokuLang = () =>
        window.currentSudokuLang || localStorage.getItem("sudoku_lang") || "es";

    let lang = getLangFromUrlOrStorage();
    setCurrentLang(lang);
    applyTranslations(lang);

    const guestMenu = document.getElementById("guestMenu");
    const userMenu = document.getElementById("userMenu");
    const userButton = document.getElementById("userButton");

    if (guestMenu && userMenu && userButton) {
        try {
            const res = await fetch("php/user_session.php", { credentials: "include" });
            const data = await res.json();

            if (data.loggedIn) {
                guestMenu.classList.add("hidden");
                userMenu.classList.remove("hidden");
                userButton.textContent = data.username + " ▼";
            } else {
                guestMenu.classList.remove("hidden");
                userMenu.classList.add("hidden");
                userButton.textContent = getDict(lang).user_guest || "Usuario ▼";
            }
        } catch {
            guestMenu.classList.remove("hidden");
            userMenu.classList.add("hidden");
            userButton.textContent = getDict(lang).user_guest || "Usuario ▼";
        }
    }

    const deleteBtn = document.getElementById("deleteAccountBtn");
    if (deleteBtn && !deleteBtn.dataset.listenerAdded) {
        deleteBtn.dataset.listenerAdded = "true";
        deleteBtn.addEventListener("click", (e) => {
            const message = getDict(window.getSudokuLang()).confirm_delete || "¿Seguro que quieres eliminar tu cuenta?";
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    }

    document.querySelectorAll('.dropdown-content a[href*="?lang="]').forEach((link) => {
        if (link.dataset.langBound) return;
        link.dataset.langBound = "true";

        link.addEventListener("click", (e) => {
            e.preventDefault();

            const href = link.getAttribute("href");
            if (!href) return;

            const url = new URL(href, window.location.href);
            const newLang = url.searchParams.get("lang") || "es";

            lang = newLang;
            setCurrentLang(lang);
            applyTranslations(lang);

            if (guestMenu && userMenu && userButton && !userMenu.classList.contains("hidden")) {
                // Mantener nombre del usuario
            } else if (userButton) {
                userButton.textContent = getDict(lang).user_guest || "Usuario ▼";
            }

            document.dispatchEvent(new CustomEvent("languageChanged", {
                detail: { lang }
            }));
        });
    });
}

document.addEventListener("DOMContentLoaded", initPageI18n);
window.addEventListener("pageshow", () => {
    if (typeof window.applyTranslations === "function") {
        const lang = localStorage.getItem("sudoku_lang") || "es";
        window.applyTranslations(lang);
        document.dispatchEvent(new CustomEvent("languageChanged", {
            detail: { lang }
        }));
    }
});