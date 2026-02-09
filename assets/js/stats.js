/* Manejar aquí los datos del Invitado. 
Para los demás usuarios, se manejarán en el PHP y MariaDB */
(() => {
    // Claves.
    const CURRENT_USER_KEY = "sudoku_current_user";      // Si hay, es usuario registrado.
    const GUEST_STATS_KEY  = "sudoku_guest_stats_v1";
    const GUEST_HIST_KEY   = "sudoku_guest_history_v1";

    const USERS_CACHE_KEY  = "sudoku_users_cache_v1";

    /* Pillar usuario */
    function getCurrentUser() {
        const u = (localStorage.getItem(CURRENT_USER_KEY) || "").trim();
        return u || null;
    }

    function defaultStats() {
        return {
            played: 0,
            wins: 0,
            losses: 0,
            bestTimeSec: null,
            difficultyCounts: { easy: 0, medium: 0, hard: 0, expert: 0 },
            totalCorrect: 0,
            totalMistakes: 0,
        };
    }

    function normalizeDifficulty(d) {
        const x = String(d || "").toLowerCase().trim();
        if (["easy", "facil", "fácil"].includes(x)) return "easy";
        if (["medium", "medio", "normal"].includes(x)) return "medium";
        if (["hard", "dificil", "difícil"].includes(x)) return "hard";
        if (["expert", "experto"].includes(x)) return "expert";
        return x || "unknown";
    }

    function difficultyLabel(d) {
        const map = { easy: "Fácil", medium: "Media", hard: "Difícil", expert: "Experta" };
        return map[d] || d || "-";
    }

    function favoriteDifficultyLabel(counts) {
        const entries = Object.entries(counts || {}).filter(([k]) => k !== "unknown");
        if (!entries.length) return "-";
        entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
        const [key, val] = entries[0];
        if (!val) return "-";
        return difficultyLabel(key);
    }

    function formatTime(sec) {
        if (sec == null || !Number.isFinite(sec)) return "--:--";
        sec = Math.max(0, Math.floor(sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function formatDateISO(d = new Date()) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function safeParse(key, fallback) {
        try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
        } catch {
        return fallback;
        }
    }

    function safeSave(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    /* Inviado */
    function guestLoad() {
        const stats = safeParse(GUEST_STATS_KEY, null) || defaultStats();
        const history = safeParse(GUEST_HIST_KEY, []);
        return { stats: { ...defaultStats(), ...stats }, history: Array.isArray(history) ? history : [] };
    }

    function guestSave(data) {
        safeSave(GUEST_STATS_KEY, data.stats);
        safeSave(GUEST_HIST_KEY, data.history);
    }

    function guestReset() {
        const data = { stats: defaultStats(), history: [] };
        guestSave(data);
        return data;
    }

    /* Cache para PHP */
    function userCacheLoad(username) {
        const all = safeParse(USERS_CACHE_KEY, {});
        const u = all[username] || { stats: defaultStats(), history: [] };
        u.stats = { ...defaultStats(), ...(u.stats || {}) };
        u.history = Array.isArray(u.history) ? u.history : [];
        return { all, u };
    }

    function userCacheSave(username, u, all) {
        all[username] = u;
        safeSave(USERS_CACHE_KEY, all);
    }

    /* Datos del html */
    function getDomRefs() {
        return {
            userStrong: document.querySelector(".user-badge strong"),
            statNumbers: document.querySelectorAll(".stats-card .stat-number"),
            historyPhrase: document.querySelector(".history .history-phrase"),
            historyTbody: document.querySelector(".history tbody"),
            btnReset: document.getElementById("btn-reset-stats")
        };
    }

    function renderStatsBlock(refs, stats) {
        if (!refs.statNumbers || refs.statNumbers.length < 4) return;

        refs.statNumbers[0].textContent = String(stats.played || 0);
        refs.statNumbers[1].textContent = String(stats.wins || 0);
        refs.statNumbers[2].textContent = formatTime(stats.bestTimeSec);
        refs.statNumbers[3].textContent = favoriteDifficultyLabel(stats.difficultyCounts);
    }

    function renderHistory(refs, history) {
        if (!refs.historyTbody) return;

        const rows = Array.isArray(history) ? history : [];
        const last = rows.slice(-20).reverse(); // Últimas 20, de más nueva a más vieja.
        refs.historyTbody.innerHTML = "";

        if (!rows.length) {
        refs.historyTbody.innerHTML = `
            <tr>
            <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
            <td><span class="badge badge-muted">Sin datos</span></td>
            </tr>`;
        return;
        }

        last.forEach((h) => {
            const timeText = h.timeSec != null ? formatTime(h.timeSec) : "-";
            const diffText = h.difficultyLabel || difficultyLabel(h.difficulty);
            const correctText = Number.isFinite(h.correct) ? h.correct : "-";
            const mistakesText = Number.isFinite(h.mistakes) ? h.mistakes : "-";

            const isWin = h.status === "win";
            const badgeClass = isWin ? "badge" : "badge badge-muted";
            const badgeText = isWin ? "Completada" : (h.status === "loss" ? "Fallida" : "Abandonada");

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${h.date || "-"}</td>
                <td>${diffText || "-"}</td>
                <td>${timeText}</td>
                <td>${correctText || "-"}</td>
                <td>${mistakesText || "-"}</td>

                <td><span class="${badgeClass}">${badgeText}</span></td>
            `;
            refs.historyTbody.appendChild(tr);
        });
    }

    /* Cargar estadísticas */
    function initStatsPage() {
        const refs = getDomRefs();
        const username = getCurrentUser();

        // Invitado.
        if (!username) {
        if (refs.userStrong) refs.userStrong.textContent = "Invitado";
        const data = guestLoad();
        renderStatsBlock(refs, data.stats);
        renderHistory(refs, data.history);
        if (refs.historyPhrase) refs.historyPhrase.textContent = "Estas son tus últimas partidas (modo invitado)";
        if (refs.btnReset) {
            refs.btnReset.disabled = false;
            refs.btnReset.onclick = () => {
            const d = guestReset();
            renderStatsBlock(refs, d.stats);
            renderHistory(refs, d.history);
            };
        }
        return;
        }

        // Usuario (por ahora, cache local)
        if (refs.userStrong) refs.userStrong.textContent = username;

        const { all, u } = userCacheLoad(username);
        userCacheSave(username, u, all);

        renderStatsBlock(refs, u.stats);
        renderHistory(refs, u.history);

        if (refs.historyPhrase) refs.historyPhrase.textContent = "Estas son tus últimas partidas";
        if (refs.btnReset) {
        refs.btnReset.disabled = false;
        refs.btnReset.onclick = () => {
            u.stats = defaultStats();
            u.history = [];
            userCacheSave(username, u, all);
            renderStatsBlock(refs, u.stats);
            renderHistory(refs, u.history);
        };
        }
    }

    /* API para el juego  */
    function recordStart({ difficulty } = {}) {
        const d = normalizeDifficulty(difficulty);
        const username = getCurrentUser();

        if (!username) {
        const data = guestLoad();
        data.stats.played++;
        data.stats.difficultyCounts[d] = (data.stats.difficultyCounts[d] || 0) + 1;
        guestSave(data);
        return true;
        }

        const { all, u } = userCacheLoad(username);
        u.stats.played++;
        u.stats.difficultyCounts[d] = (u.stats.difficultyCounts[d] || 0) + 1;
        userCacheSave(username, u, all);
        return true;
    }

    function recordWin({ difficulty, timeSec, correct = 0, mistakes = 0 } = {}) {
        const d = normalizeDifficulty(difficulty);
        const username = getCurrentUser();

        const t = Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : null;

        if (!username) {
            const data = guestLoad();
            data.stats.wins++;
            data.stats.totalCorrect += (Number(correct) || 0);
            data.stats.totalMistakes += (Number(mistakes) || 0);
            if (t != null && (data.stats.bestTimeSec == null || t < data.stats.bestTimeSec)) {
                data.stats.bestTimeSec = t;
            }
            data.history.push({
                date: formatDateISO(new Date()),
                difficulty: d,
                difficultyLabel: difficultyLabel(d),
                timeSec: t,
                correct: Number(correct) || 0,
                mistakes: Number(mistakes) || 0,
                status: "win"
            });
            guestSave(data);
            return true;
        }

        const { all, u } = userCacheLoad(username);
        u.stats.wins++;
        u.stats.totalCorrect += (Number(correct) || 0);
        u.stats.totalMistakes += (Number(mistakes) || 0);
        if (t != null && (u.stats.bestTimeSec == null || t < u.stats.bestTimeSec)) {
        u.stats.bestTimeSec = t;
        }
        u.history.push({
            date: formatDateISO(new Date()),
            difficulty: d,
            difficultyLabel: difficultyLabel(d),
            timeSec: t,
            correct: Number(correct) || 0,
            mistakes: Number(mistakes) || 0,
            status: "win"
        });
        userCacheSave(username, u, all);
        return true;
    }

    function recordLoss({ difficulty, timeSec, correct = 0, mistakes = 0 } = {}) {
        const d = normalizeDifficulty(difficulty);
        const username = getCurrentUser();

        const t = Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : null;

        if (!username) {
        const data = guestLoad();
        data.stats.losses++;
        data.stats.totalCorrect += (Number(correct) || 0);
        data.stats.totalMistakes += (Number(mistakes) || 0);
        data.history.push({
            date: formatDateISO(new Date()),
            difficulty: d,
            difficultyLabel: difficultyLabel(d),
            timeSec: t,
            correct: Number(correct) || 0,
            mistakes: Number(mistakes) || 0,
            status: "loss"
        });
        guestSave(data);
        return true;
        }

        const { all, u } = userCacheLoad(username);
        u.stats.losses++;
        u.stats.totalCorrect += (Number(correct) || 0);
        u.stats.totalMistakes += (Number(mistakes) || 0);
        u.history.push({
        date: formatDateISO(new Date()),
        difficulty: d,
        difficultyLabel: difficultyLabel(d),
        timeSec: t,
        correct: Number(correct) || 0,
        mistakes: Number(mistakes) || 0,
        status: "loss"
        });
        userCacheSave(username, u, all);
        return true;
    }

    // init
    document.addEventListener("DOMContentLoaded", () => {
        initStatsPage();
    });

    window.SudokuStats = {
        recordStart,
        recordWin,
        recordLoss
    };
})();
