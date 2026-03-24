(() => {
    'use strict';

    /* Estado */
    let currentCategory   = 'most_wins';
    let currentDifficulty = 'all';
    let currentUser       = null;

    /* Configuración por categoría */
    const CATEGORIES = {
        most_wins: {
            label: 'Más victorias',
            desc:  'Jugadores con mayor número de partidas ganadas.',
            minNote: false,
            heads: () => ['#', 'Jugador', 'Victorias', 'Tiempo medio'],
            row:   (r, pos, me) => [
                rankCell(pos),
                userCell(r.username, me),
                `<span class="stat-val">${r.wins}</span><span class="stat-sub">victorias</span>`,
                `<span class="stat-val">${formatTime(r.avg_time)}</span>`,
            ],
        },
        best_time: {
            label: 'Mejor tiempo',
            desc:  'Tiempo más rápido en completar un sudoku ganado.',
            minNote: false,
            heads: () => ['#', 'Jugador', 'Mejor tiempo', 'Victorias'],
            row:   (r, pos, me) => [
                rankCell(pos),
                userCell(r.username, me),
                `<span class="stat-val">${formatTime(r.best_time)}</span>`,
                `<span class="stat-val">${r.wins}</span><span class="stat-sub">victorias</span>`,
            ],
        },
        best_accuracy: {
            label: 'Mejor precisión',
            desc:  'Jugadores con menor número de errores de media. Mínimo 3 victorias.',
            minNote: true,
            heads: () => ['#', 'Jugador', 'Errores (media)', 'Victorias'],
            row:   (r, pos, me) => [
                rankCell(pos),
                userCell(r.username, me),
                `<span class="stat-val">${r.avg_mistakes.toFixed(2)}</span><span class="stat-sub">errores/partida</span>`,
                `<span class="stat-val">${r.wins}</span><span class="stat-sub">victorias</span>`,
            ],
        },
        fewest_hints: {
            label: 'Menos pistas',
            desc:  'Jugadores que menos pistas usaron de media. Mínimo 3 victorias.',
            minNote: true,
            heads: () => ['#', 'Jugador', 'Pistas (media)', 'Total pistas'],
            row:   (r, pos, me) => [
                rankCell(pos),
                userCell(r.username, me),
                `<span class="stat-val">${r.avg_hints.toFixed(2)}</span><span class="stat-sub">pistas/partida</span>`,
                `<span class="stat-val">${r.total_hints}</span>`,
            ],
        },
    };

    const DIFF_LABELS = {
        all:    'Todas las dificultades',
        easy:   'Fácil',
        medium: 'Media',
        hard:   'Difícil',
        expert: 'Experta',
    };

    /* Helpers de formato */
    function formatTime(sec) {
        if (sec == null || !Number.isFinite(+sec)) return '--:--';
        sec = Math.max(0, Math.floor(+sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function medal(pos) {
        if (pos === 1) return '🥇';
        if (pos === 2) return '🥈';
        if (pos === 3) return '🥉';
        return null;
    }

    function rankCell(pos) {
        const m = medal(pos);
        return m
            ? `<div class="rank-cell"><span class="medal">${m}</span></div>`
            : `<div class="rank-cell"><span class="rank-num">${pos}</span></div>`;
    }

    function userCell(username, me) {
        const youTag = (me && username === me)
            ? `<span class="you-badge">Tú</span>`
            : '';
        return `<span class="username-cell">${escHtml(username)}${youTag}</span>`;
    }

    function diffBadge(diff) {
        const cls = diff === 'all' ? 'badge-all' : `badge-${diff}`;
        return `<span class="badge ${cls}">${DIFF_LABELS[diff] || diff}</span>`;
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* Obtener usuario actual */
    function getCurrentUser() {
        const u = (localStorage.getItem('sudoku_current_user') || '').trim();
        return u || null;
    }

    /* Render */
    function setLoading() {
        document.getElementById('ranking-tbody').innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="ranking-loading">
                        <div class="spinner"></div>
                        <p>Cargando ranking…</p>
                    </div>
                </td>
            </tr>`;
    }

    function renderHeader() {
        const cat  = CATEGORIES[currentCategory];
        const diff = currentDifficulty;

        document.getElementById('ranking-title').innerHTML =
            `${cat.label} · ${diffBadge(diff)}`;
        document.getElementById('ranking-desc').textContent = cat.desc;

        const minNote = document.getElementById('min-note');
        minNote.style.display = cat.minNote ? '' : 'none';
    }

    function renderTable(rows) {
        const cat  = CATEGORIES[currentCategory];
        const me   = currentUser;
        const thead = document.getElementById('ranking-thead');
        const tbody = document.getElementById('ranking-tbody');

        /* Cabeceras */
        const heads = cat.heads();
        thead.innerHTML = `<tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>`;

        /* Filas vacías */
        if (!rows || rows.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${heads.length}">
                        <div class="ranking-empty">
                            Todavía no hay datos suficientes para este ranking.
                        </div>
                    </td>
                </tr>`;
            return;
        }

        /* Filas de datos */
        tbody.innerHTML = rows.map((r, i) => {
            const cells = cat.row(r, i + 1, me);
            return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
        }).join('');
    }

    /* Fetch */
    async function loadRanking() {
        setLoading();
        renderHeader();

        const params = new URLSearchParams({
            category:   currentCategory,
            difficulty: currentDifficulty,
        });

        try {
            const res  = await fetch(`php/get_ranking.php?${params}`);
            const data = await res.json();

            if (data.ok) {
                renderTable(data.rows);
            } else {
                renderTable([]);
            }
        } catch {
            document.getElementById('ranking-tbody').innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="ranking-empty">
                            Error al cargar el ranking. Comprueba tu conexión.
                        </div>
                    </td>
                </tr>`;
        }
    }

    /* Tabs */
    function bindTabs(groupId, dataAttr, onChange) {
        const group = document.getElementById(groupId);
        group.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                onChange(btn.dataset[dataAttr]);
            });
        });
    }

    /* Init */
    function init() {
        currentUser = getCurrentUser();

        bindTabs('cat-tabs', 'cat', val => {
            currentCategory = val;
            loadRanking();
        });

        bindTabs('diff-tabs', 'diff', val => {
            currentDifficulty = val;
            loadRanking();
        });

        loadRanking();
    }

    document.addEventListener('DOMContentLoaded', init);
})();