(() => {
    const CURRENT_USER_KEY = 'sudoku_current_user';
    const GUEST_STATS_KEY = 'sudoku_guest_stats_v1';
    const GUEST_HIST_KEY = 'sudoku_guest_history_v1';

    function getCurrentUser() {
        const u = (localStorage.getItem(CURRENT_USER_KEY) || '').trim();
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
        const x = String(d || '').toLowerCase().trim();
        if (['easy', 'facil', 'fácil'].includes(x)) return 'easy';
        if (['medium', 'medio', 'normal'].includes(x)) return 'medium';
        if (['hard', 'dificil', 'difícil'].includes(x)) return 'hard';
        if (['expert', 'experto'].includes(x)) return 'expert';
        return x || 'unknown';
    }

    function difficultyLabel(d) {
        const map = { easy: 'Fácil', medium: 'Media', hard: 'Difícil', expert: 'Experta' };
        return map[d] || d || '-';
    }

    function favoriteDifficultyLabel(counts) {
        const entries = Object.entries(counts || {}).filter(([key]) => key !== 'unknown');
        if (!entries.length) return '-';
        entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
        const [key, value] = entries[0];
        return value ? difficultyLabel(key) : '-';
    }

    function formatTime(sec) {
        if (sec == null || !Number.isFinite(sec)) return '--:--';
        sec = Math.max(0, Math.floor(sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function formatDateISO(d = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
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

    function guestLoad() {
        const stats = safeParse(GUEST_STATS_KEY, null) || defaultStats();
        const history = safeParse(GUEST_HIST_KEY, []);
        return {
            stats: { ...defaultStats(), ...stats },
            history: Array.isArray(history) ? history : [],
        };
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

    function getDomRefs() {
        return {
            userStrong: document.querySelector('.user-badge strong'),
            statNumbers: document.querySelectorAll('.stats-card .stat-number'),
            historyPhrase: document.querySelector('.history .history-phrase'),
            historyTbody: document.querySelector('.history tbody'),
            btnReset: document.getElementById('btn-reset-stats'),
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
        refs.historyTbody.innerHTML = '';

        const rows = Array.isArray(history) ? history : [];
        if (!rows.length) {
            refs.historyTbody.innerHTML = `
                <tr>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td><span class="badge badge-muted">Sin datos</span></td>
                </tr>`;
            return;
        }

        rows.forEach((h) => {
            const timeText = h.timeSec != null ? formatTime(h.timeSec) : '-';
            const diffText = h.difficultyLabel || difficultyLabel(h.difficulty);
            const correctText = Number.isFinite(h.correct) ? h.correct : '-';
            const mistakesText = Number.isFinite(h.mistakes) ? h.mistakes : '-';
            const isWin = h.status === 'win';
            const badgeClass = isWin ? 'badge' : 'badge badge-muted';
            const badgeText = isWin ? 'Completada' : (h.status === 'loss' ? 'Fallida' : 'Abandonada');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${h.date || '-'}</td>
                <td>${diffText || '-'}</td>
                <td>${timeText}</td>
                <td>${correctText}</td>
                <td>${mistakesText}</td>
                <td><span class="${badgeClass}">${badgeText}</span></td>`;
            refs.historyTbody.appendChild(tr);
        });
    }

    async function fetchJson(url) {
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
            throw new Error(data.error || 'Error de servidor');
        }
        return data;
    }

    async function initStatsPage() {
        const refs = getDomRefs();
        const username = getCurrentUser();

        if (!username) {
            if (refs.userStrong) refs.userStrong.textContent = 'Invitado';
            const data = guestLoad();
            renderStatsBlock(refs, data.stats);
            renderHistory(refs, data.history.slice(-20).reverse());
            if (refs.historyPhrase) refs.historyPhrase.textContent = 'Estas son tus últimas partidas (modo invitado)';
            if (refs.btnReset) {
                refs.btnReset.disabled = false;
                refs.btnReset.onclick = () => {
                    const fresh = guestReset();
                    renderStatsBlock(refs, fresh.stats);
                    renderHistory(refs, fresh.history);
                };
            }
            return;
        }

        if (refs.userStrong) refs.userStrong.textContent = username;
        if (refs.historyPhrase) refs.historyPhrase.textContent = 'Estas son tus últimas partidas';
        if (refs.btnReset) {
            refs.btnReset.disabled = false;
            refs.btnReset.onclick = async () => {
                const ok = confirm('¿Seguro que quieres reiniciar tus estadísticas?');
                if (!ok) return;

                try {
                    const res = await fetch('php/reset_stats.php', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    if (!res.ok || data.ok === false) {
                        throw new Error(data.error || 'No se pudieron reiniciar las estadísticas');
                    }

                    renderStatsBlock(refs, data.stats);
                    renderHistory(refs, []);
                } catch (err) {
                    alert(err.message || 'No se pudieron reiniciar las estadísticas.');
                }
            };
        }

        try {
            const [statsData, historyData] = await Promise.all([
                fetchJson('php/get_stats.php'),
                fetchJson('php/get_history.php'),
            ]);
            renderStatsBlock(refs, statsData.stats);
            renderHistory(refs, historyData.history);
        } catch {
            const data = guestLoad();
            renderStatsBlock(refs, data.stats);
            renderHistory(refs, data.history.slice(-20).reverse());
        }
    }

    function recordStart({ difficulty } = {}) {
        const d = normalizeDifficulty(difficulty);
        const username = getCurrentUser();
        if (username) return true;

        const data = guestLoad();
        data.stats.played += 1;
        data.stats.difficultyCounts[d] = (data.stats.difficultyCounts[d] || 0) + 1;
        guestSave(data);
        return true;
    }

    function recordWin({ difficulty, timeSec, correct = 0, mistakes = 0 } = {}) {
        const d = normalizeDifficulty(difficulty);
        const username = getCurrentUser();
        const t = Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : null;

        if (!username) {
            const data = guestLoad();
            data.stats.played += 1;
            data.stats.wins += 1;
            data.stats.totalCorrect += Number(correct) || 0;
            data.stats.totalMistakes += Number(mistakes) || 0;
            data.stats.difficultyCounts[d] = (data.stats.difficultyCounts[d] || 0) + 1;
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
                status: 'win',
            });
            guestSave(data);
            return true;
        }

        return true;
    }

    function recordLoss({ difficulty, timeSec, correct = 0, mistakes = 0 } = {}) {
        const d = normalizeDifficulty(difficulty);
        const username = getCurrentUser();
        const t = Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : null;

        if (!username) {
            const data = guestLoad();
            data.stats.played += 1;
            data.stats.losses += 1;
            data.stats.totalCorrect += Number(correct) || 0;
            data.stats.totalMistakes += Number(mistakes) || 0;
            data.stats.difficultyCounts[d] = (data.stats.difficultyCounts[d] || 0) + 1;
            data.history.push({
                date: formatDateISO(new Date()),
                difficulty: d,
                difficultyLabel: difficultyLabel(d),
                timeSec: t,
                correct: Number(correct) || 0,
                mistakes: Number(mistakes) || 0,
                status: 'loss',
            });
            guestSave(data);
            return true;
        }

        return true;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initStatsPage();
    });

    window.SudokuStats = {
        recordStart,
        recordWin,
        recordLoss,
    };
})();
