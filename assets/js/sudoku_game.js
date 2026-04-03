document.addEventListener("DOMContentLoaded", () => {
    const cells = Array.from(document.querySelectorAll(".cell"));
    const statusEl = document.getElementById("status");
    const padButtons = document.querySelectorAll(".pad-btn");

    const btnNew = document.getElementById("btn-new-game");
    const btnReset = document.getElementById("btn-reset");
    const btnPause = document.getElementById("btn-pause");
    const btnNotes = document.getElementById("btn-notes");
    const btnHint = document.getElementById("btn-hint");
    const btnAbandon = document.getElementById("btn-abandon");
    const btnSave = document.getElementById("btn-save");
    const btnLoad = document.getElementById("btn-load");

    const difficultySel = document.getElementById("difficulty");
    const timerEl = document.getElementById("timer");
    const boardPause = document.getElementById("board-pause");

    let savedGameId = null;

    // Traducir.
    function getLang() {
        if (typeof window.getSudokuLang === "function") {
            return window.getSudokuLang();
        }
        return localStorage.getItem("sudoku_lang") || "es";
    }

    function t(key, vars = {}) {
        const lang = getLang();
        const dict =
            (window.texts && window.texts[lang]) ||
            (typeof texts !== "undefined" && texts[lang]) ||
            {};

        let text = dict[key] || key;

        Object.keys(vars).forEach((k) => {
            text = text.replaceAll(`{${k}}`, String(vars[k]));
        });

        return text;
    }

    function isLoggedIn() {
        return !!(localStorage.getItem("sudoku_current_user") || "").trim();
    }

    async function postJson(url, payload) {
        const res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return res.json();
    }

    if (!cells.length) return;

    const CONFIG = {
        easy: { holes: 38, maxMistakes: 8, maxHints: 5 },
        medium: { holes: 48, maxMistakes: 5, maxHints: 3 },
        hard: { holes: 56, maxMistakes: 3, maxHints: 1 },
        expert: { holes: 70, maxMistakes: 1, maxHints: 0 },
    };

    let notesMode = false;
    let paused = false;

    const notesByCell = new Map();

    function serializeState() {
        const cellsState = cells.map((cell, idx) => ({
            idx,
            value: cell.value || "",
            fixed: cell.classList.contains("fixed"),
            disabled: !!cell.disabled,
        }));

        const notesState = Array.from(notesByCell.entries()).map(([idx, set]) => [idx, Array.from(set)]);
        return {
            cells: cellsState,
            notes: notesState,
            solution: currentSolution,
            mistakes,
            hintsUsed,
            maxMistakes,
            maxHints,
            seconds,
            difficulty: difficultySel?.value ?? "easy",
            correctCount,
            correctlyFixedCells: Array.from(correctlyFixedCells),
            penalizedCells: Array.from(penalizedCells.entries()),
        };
    }

    function restoreState(state) {
        if (!state || !Array.isArray(state.cells) || !Array.isArray(state.solution)) return false;

        currentSolution = state.solution;
        mistakes = Number(state.mistakes) || 0;
        hintsUsed = Number(state.hintsUsed) || 0;
        maxMistakes = Number(state.maxMistakes) || CONFIG.easy.maxMistakes;
        maxHints = Number(state.maxHints) || CONFIG.easy.maxHints;
        seconds = Number(state.seconds) || 0;
        correctCount = Number(state.correctCount) || 0;
        gameOver = false;
        gameWon = false;
        paused = false;

        notesByCell.clear();
        for (let i = 0; i < cells.length; i++) notesByCell.set(i, new Set());
        (state.notes || []).forEach(([idx, values]) => {
            notesByCell.set(Number(idx), new Set(values || []));
        });

        correctlyFixedCells.clear();
        (state.correctlyFixedCells || []).forEach((idx) => correctlyFixedCells.add(Number(idx)));

        penalizedCells.clear();
        (state.penalizedCells || []).forEach(([idx, value]) => penalizedCells.set(Number(idx), !!value));

        state.cells.forEach((item) => {
            const cell = cells[item.idx];
            if (!cell) return;
            cell.value = item.value || "";
            cell.classList.remove("error", "correct", "selected", "fixed");
            if (item.fixed) cell.classList.add("fixed");
            cell.disabled = !!item.disabled;
        });

        cells.forEach((_, idx) => renderNotes(idx));
        if (difficultySel && state.difficulty) difficultySel.value = state.difficulty;
        if (timerEl) timerEl.textContent = formatTime(seconds);
        if (btnHint) btnHint.disabled = hintsUsed >= maxHints;
        if (btnPause) btnPause.disabled = false;
        if (btnReset) btnReset.disabled = false;
        if (btnAbandon) btnAbandon.disabled = false;
        if (btnSave) btnSave.disabled = false;
        if (btnLoad) btnLoad.disabled = false;
        refreshStatus();
        setNotesMode(notesMode);
        return true;
    }

    async function saveCurrentGameState() {
        if (!currentSolution) {
            alert(t("sudoku_alert_start_first"));
            return;
        }
        if (!isLoggedIn()) {
            alert(t("sudoku_alert_login_save"));
            return;
        }
        const payload = {
            game_id: savedGameId,
            difficulty: difficultySel?.value ?? "easy",
            status: "in_progress",
            time: seconds,
            correct: correctCount,
            mistakes,
            hints_used: hintsUsed,
            state_json: serializeState(),
        };
        try {
            const data = await postJson("php/save_game.php", payload);
            if (!data.ok) throw new Error(data.error || t("sudoku_save_error"));
            savedGameId = data.game_id ?? savedGameId;
            setStatus(t("sudoku_save_ok"), "sudoku_save_ok");
        } catch (err) {
            alert(err.message || t("sudoku_save_error"));
        }
    }

    async function loadSavedGameState() {
        if (!isLoggedIn()) {
            alert(t("sudoku_alert_login_load"));
            return;
        }
        try {
            const res = await fetch("php/load_state.php", { credentials: "include" });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || t("sudoku_no_saved_games"));
            const game = data.game;
            savedGameId = game.game_id;
            if (!restoreState(game.state)) throw new Error(t("sudoku_load_invalid"));
            stopTimer();
            startTimer();
            focusByIndex(0);
            setStatus(t("sudoku_load_ok"), "sudoku_load_ok");
        } catch (err) {
            alert(err.message || t("sudoku_load_error"));
        }
    }

    if (btnSave) {
        btnSave.addEventListener("click", saveCurrentGameState);
    }
    if (btnLoad) {
        btnLoad.addEventListener("click", loadSavedGameState);
    }

    function buildNotesUI() {
        cells.forEach((cell, idx) => {
            const wrap = document.createElement("div");
            wrap.className = "cell-wrap";

            cell.parentNode.insertBefore(wrap, cell);
            wrap.appendChild(cell);

            const notes = document.createElement("div");
            notes.className = "notes";
            notes.dataset.idx = String(idx);

            for (let n = 1; n <= 9; n++) {
                const sp = document.createElement("div");
                sp.className = "note";
                sp.dataset.n = String(n);
                sp.textContent = String(n);
                notes.appendChild(sp);
            }

            wrap.appendChild(notes);
            notesByCell.set(idx, new Set());
        });
    }

    function renderNotes(idx) {
        const wrap = cells[idx]?.closest(".cell-wrap");
        if (!wrap) return;
        const notesEl = wrap.querySelector(".notes");
        if (!notesEl) return;

        const set = notesByCell.get(idx) ?? new Set();
        notesEl.querySelectorAll(".note").forEach((nEl) => {
            const n = Number(nEl.dataset.n);
            nEl.classList.toggle("on", set.has(n));
        });
    }

    function clearNotes(idx) {
        const set = notesByCell.get(idx);
        if (set) set.clear();
        renderNotes(idx);
    }

    function clearAllNotes() {
        notesByCell.forEach((set, idx) => {
            set.clear();
            renderNotes(idx);
        });
    }

    function setNotesMode(on) {
        notesMode = !!on;
        if (btnNotes) {
            btnNotes.textContent = notesMode ? t("sudoku_notes_on") : t("sudoku_notes_off");
            btnNotes.classList.toggle("on", notesMode);
        }
    }

    buildNotesUI();

    if (btnNotes) {
        btnNotes.addEventListener("click", () => {
            if (!currentSolution) return;
            if (gameOver || gameWon) return;
            setNotesMode(!notesMode);
        });

        setNotesMode(false);
    }

    function getActiveCell() {
        const selected = document.querySelector(".cell.selected");
        if (selected) return selected;

        const active = document.activeElement;
        if (active && active.classList && active.classList.contains("cell")) return active;

        return null;
    }

    function writeNumber(cell, n) {
        if (!cell) return;
        if (!currentSolution) return;
        if (paused) return;
        if (gameOver || gameWon) return;
        if (cell.classList.contains("fixed") || cell.disabled) return;

        const idx = getIndex(cell);
        if (idx == null || idx < 0) return;

        if (typeof notesMode !== "undefined" && notesMode) {
            const set = notesByCell.get(idx) ?? new Set();
            if (set.has(n)) set.delete(n);
            else set.add(n);
            notesByCell.set(idx, set);
            renderNotes(idx);
            return;
        }

        cell.value = String(n);
        cell.classList.remove("error", "correct");

        if (typeof clearNotes === "function") clearNotes(idx);

        updateCellStateAndPenalty(cell);

        if (typeof refreshStatus === "function") refreshStatus();

        if (typeof isSolved === "function" && typeof winGame === "function") {
            if (isSolved()) winGame();
        }
    }

    padButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const cell = getActiveCell();
            if (!cell) return;

            const n = Number(btn.dataset.n);
            if (!Number.isInteger(n) || n < 1 || n > 9) return;

            writeNumber(cell, n);
            cell.focus();
        });
    });

    function setBoardEnabled(enabled) {
        cells.forEach(cell => {
            if (cell.classList.contains("fixed")) return;
            if (gameOver || gameWon) return;
            cell.disabled = !enabled;
        });
    }

    function setPaused(on) {
        paused = !!on;

        if (paused) {
            stopTimer();
            setBoardEnabled(false);
            if (btnPause) {
                btnPause.textContent = t("sudoku_resume");
                if (btnHint) btnHint.disabled = true;
                if (btnReset) btnReset.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnLoad) btnLoad.disabled = true;
            }
            if (boardPause) {
                boardPause.classList.add("show");
                boardPause.setAttribute("aria-hidden", "false");
            }
        } else {
            startTimer();
            setBoardEnabled(true);
            if (btnPause) {
                btnPause.textContent = t("sudoku_pause");
                if (btnHint) btnHint.disabled = false;
                if (btnReset) btnReset.disabled = false;
                if (btnSave) btnSave.disabled = false;
                if (btnLoad) btnLoad.disabled = false;
            }
            if (boardPause) {
                boardPause.classList.remove("show");
                boardPause.setAttribute("aria-hidden", "true");
            }
        }
    }

    if (btnPause) {
        btnPause.addEventListener("click", () => {
            if (!currentSolution) return;
            if (gameOver || gameWon) return;
            setPaused(!paused);
        });
    }

    let currentSolution = null;

    let correctCount = 0;
    const correctlyFixedCells = new Set();
    let maxMistakes = CONFIG.easy.maxMistakes;
    let mistakes = 0;
    let maxHints = CONFIG.easy.maxHints;
    let hintsUsed = 0;

    let gameOver = false;
    let gameWon = false;

    const penalizedCells = new Map();

    let lastStatusKey = null;
    let lastStatusVars = {};

    const setStatus = (msg = "", key = null, vars = {}) => {
        if (statusEl) statusEl.textContent = msg;
        lastStatusKey = key;
        lastStatusVars = vars;
    };

    const clearSelection = () => cells.forEach((c) => c.classList.remove("selected"));
    const selectCell = (cell) => {
        clearSelection();
        cell.classList.add("selected");
    };

    const getIndex = (cell) => {
        const r = Number(cell.dataset.row);
        const c = Number(cell.dataset.col);
        if (Number.isNaN(r) || Number.isNaN(c)) return -1;
        return r * 9 + c;
    };

    const focusByIndex = (idx) => {
        if (idx < 0 || idx >= cells.length) return;
        cells[idx].focus();
        selectCell(cells[idx]);
    };

    const sanitizeToSingleDigit = (value) => String(value ?? "").replace(/[^1-9]/g, "").slice(0, 1);

    let timerId = null;
    let seconds = 0;

    const formatTime = (s) => {
        const mm = String(Math.floor(s / 60)).padStart(2, "0");
        const ss = String(s % 60).padStart(2, "0");
        return `${mm}:${ss}`;
    };

    const stopTimer = () => {
        if (timerId) clearInterval(timerId);
        timerId = null;
    };

    const resetTimer = () => {
        stopTimer();
        seconds = 0;
        if (timerEl) timerEl.textContent = "00:00";
    };

    const startTimer = () => {
        stopTimer();
        timerId = setInterval(() => {
            seconds += 1;
            if (timerEl) timerEl.textContent = formatTime(seconds);
        }, 1000);
    };

    const makeEmptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0));
    const cloneGrid = (g) => g.map((row) => row.slice());

    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const isSafe = (grid, row, col, num) => {
        for (let i = 0; i < 9; i++) {
            if (grid[row][i] === num) return false;
            if (grid[i][col] === num) return false;
        }
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
                if (grid[r][c] === num) return false;
            }
        }
        return true;
    };

    const findEmpty = (grid) => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) return [r, c];
            }
        }
        return null;
    };

    const fillGrid = (grid) => {
        const pos = findEmpty(grid);
        if (!pos) return true;

        const [r, c] = pos;
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const n of nums) {
            if (isSafe(grid, r, c, n)) {
                grid[r][c] = n;
                if (fillGrid(grid)) return true;
                grid[r][c] = 0;
            }
        }
        return false;
    };

    const makePuzzleFromSolution = (solution, holesTarget) => {
        const puzzle = cloneGrid(solution);
        let holes = 0;

        const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
        for (const idx of positions) {
            if (holes >= holesTarget) break;
            const r = Math.floor(idx / 9);
            const c = idx % 9;
            if (puzzle[r][c] === 0) continue;
            puzzle[r][c] = 0;
            holes += 1;
        }
        return puzzle;
    };

    const generateSudoku = (difficulty) => {
        const cfg = CONFIG[difficulty] ?? CONFIG.easy;
        const solution = makeEmptyGrid();
        fillGrid(solution);
        const puzzle = makePuzzleFromSolution(solution, cfg.holes);
        return { puzzle, solution, cfg };
    };

    const loadPuzzleToUI = (puzzle) => {
        cells.forEach((cell, i) => {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const v = puzzle[r][c];

            cell.classList.remove("error", "correct", "selected");
            cell.disabled = false;

            clearNotes(i);

            if (v !== 0) {
                cell.value = String(v);
                cell.classList.add("fixed");
                cell.disabled = true;
            } else {
                cell.value = "";
                cell.classList.remove("fixed");
            }
        });
    };

    const isSolved = () => {
        if (!currentSolution) return false;
        for (let i = 0; i < 81; i++) {
            const r = Math.floor(i / 9);
            const c = i % 9;
            const v = Number(cells[i].value);
            if (!v) return false;
            if (v !== currentSolution[r][c]) return false;
        }
        return true;
    };

    const endGame = (msg, key = null, vars = {}) => {
        gameOver = true;
        stopTimer();
        setStatus(msg, key, vars);
        cells.forEach((cell) => {
            if (!cell.classList.contains("fixed")) cell.disabled = true;
        });
    };

    const winGame = () => {
        gameWon = true;
        stopTimer();

        const vars = {
            time: formatTime(seconds),
            mistakes,
            maxMistakes,
            hintsUsed,
            maxHints
        };
        setStatus(t("sudoku_completed", vars), "sudoku_completed", vars);

        if (btnPause) btnPause.disabled = true;
        if (btnReset) btnReset.disabled = true;
        if (btnHint) btnHint.disabled = true;
        if (btnSave) btnSave.disabled = true;
        if (btnLoad) btnLoad.disabled = true;

        const diff = difficultySel?.value ?? "easy";
        SudokuStats.recordWin({ difficulty: diff, timeSec: seconds, correct: correctCount, mistakes: mistakes });
        if (isLoggedIn()) {
            postJson("php/save_game.php", {
                game_id: savedGameId,
                difficulty: diff,
                status: "win",
                time: seconds,
                correct: correctCount,
                mistakes,
                hints_used: hintsUsed,
                state_json: serializeState(),
            }).catch(() => {});
        }
    };

    const countCurrentWrongCells = () => {
        let wrong = 0;
        cells.forEach((cell) => {
            if (cell.classList.contains("fixed")) return;
            if (cell.value && cell.classList.contains("error")) wrong += 1;
        });
        return wrong;
    };

    const refreshStatus = () => {
        if (!currentSolution) return setStatus("");
        const currentWrong = countCurrentWrongCells();

        const vars = {
            mistakes,
            maxMistakes,
            currentWrong,
            hintsUsed,
            maxHints
        };

        setStatus(t("sudoku_status_progress", vars), "sudoku_status_progress", vars);
    };

    const updateCellStateAndPenalty = (cell) => {
        if (!currentSolution) return;
        if (cell.classList.contains("fixed")) return;

        const idx = getIndex(cell);
        if (idx === -1) return;

        const r = Math.floor(idx / 9);
        const c = idx % 9;

        const raw = cell.value;
        const v = Number(raw);

        cell.classList.remove("error", "correct");

        if (!raw) return;
        if (!Number.isFinite(v) || v < 1 || v > 9) return;

        const wasWrong = penalizedCells.get(idx) === true;

        if (v === currentSolution[r][c]) {
            penalizedCells.set(idx, false);

            cell.classList.add("correct");
            cell.classList.remove("error");
            cell.disabled = true;

            if (!correctlyFixedCells.has(idx)) {
                correctlyFixedCells.add(idx);
                correctCount += 1;
            }

            setTimeout(() => {
                cell.classList.remove("correct");
                cell.classList.add("fixed");
            }, 800);
        } else {
            cell.classList.add("error");
            cell.classList.remove("correct");

            if (!wasWrong) {
                penalizedCells.set(idx, true);
                mistakes += 1;

                if (mistakes >= maxMistakes) {
                    refreshStatus();
                    disableGameButtonsAfterEnd();

                    const vars = { maxMistakes };
                    endGame(t("sudoku_game_over_mistakes", vars), "sudoku_game_over_mistakes", vars);

                    const diff = difficultySel?.value ?? "easy";
                    SudokuStats.recordLoss({ difficulty: diff, timeSec: seconds, correct: correctCount, mistakes });
                    if (isLoggedIn()) {
                        postJson("php/save_game.php", {
                            game_id: savedGameId,
                            difficulty: diff,
                            status: "loss",
                            time: seconds,
                            correct: correctCount,
                            mistakes,
                            hints_used: hintsUsed,
                            state_json: serializeState(),
                        }).catch(() => {});
                    }
                    return;
                }
            }
        }
    };

    const giveHint = () => {
        if (!currentSolution) return setStatus(t("sudoku_alert_start_first"), "sudoku_alert_start_first");
        if (gameOver || gameWon) return;

        if (hintsUsed >= maxHints) {
            refreshStatus();
            return;
        }

        const candidates = [];
        cells.forEach((cell, i) => {
            if (cell.classList.contains("fixed")) return;
            if (!cell.value) candidates.push(i);
        });

        if (!candidates.length) {
            setStatus(t("sudoku_hint_no_empty"), "sudoku_hint_no_empty");
            return;
        }

        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        const r = Math.floor(idx / 9);
        const c = idx % 9;

        const cell = cells[idx];
        cell.value = String(currentSolution[r][c]);
        cell.classList.remove("error", "correct");
        penalizedCells.set(idx, false);

        clearNotes(idx);
        cell.classList.add("fixed");
        cell.disabled = true;

        hintsUsed += 1;
        if (hintsUsed >= maxHints && btnHint) btnHint.disabled = true;

        refreshStatus();
        if (isSolved()) winGame();
    };

    const resetOnlyUserCells = () => {
        if (!currentSolution) return;
        if (gameOver) return;

        if (gameWon) {
            setStatus(t("sudoku_reset_after_win"), "sudoku_reset_after_win");
            return;
        }

        cells.forEach((cell) => {
            if (!cell.classList.contains("fixed")) {
                cell.value = "";
                cell.classList.remove("error", "correct");
                cell.disabled = false;

                const idx = getIndex(cell);
                if (idx !== -1) clearNotes(idx);
            }
        });

        refreshStatus();
    };

    cells.forEach((cell) => {
        cell.setAttribute("autocomplete", "off");
        cell.setAttribute("maxlength", "1");
        cell.setAttribute("inputmode", "numeric");

        cell.addEventListener("focus", () => selectCell(cell));

        cell.addEventListener("keydown", (e) => {
            if (!currentSolution || paused || gameOver || gameWon) return;
            if (cell.classList.contains("fixed")) return;
            if (cell.disabled) return;
            if (e.ctrlKey || e.metaKey) return;

            const idx = getIndex(cell);

            const nav = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
            if (nav.includes(e.key)) {
                e.preventDefault();
                if (idx === -1) return;
                if (e.key === "ArrowLeft") focusByIndex(idx - 1);
                if (e.key === "ArrowRight") focusByIndex(idx + 1);
                if (e.key === "ArrowUp") focusByIndex(idx - 9);
                if (e.key === "ArrowDown") focusByIndex(idx + 9);
                return;
            }

            if (e.key === "Backspace" || e.key === "Delete") {
                e.preventDefault();
                cell.value = "";
                cell.classList.remove("error", "correct");
                if (idx !== -1) penalizedCells.delete(idx);
                refreshStatus();
                return;
            }

            if (/^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const n = Number(e.key);
                writeNumber(cell, n);

                if (!notesMode && idx !== -1) focusByIndex(idx + 1);
                return;
            }

            if (e.key === "Tab") return;

            e.preventDefault();
        });

        cell.addEventListener("input", () => {
            if (!currentSolution) return;
            if (paused) return;
            if (gameOver || gameWon) return;
            if (cell.classList.contains("fixed")) return;
            if (cell.disabled) return;

            const clean = sanitizeToSingleDigit(cell.value);
            if (cell.value !== clean) cell.value = clean;

            const idx = getIndex(cell);
            if (idx !== -1 && notesMode && clean) {
                cell.value = "";
                const n = Number(clean);
                const set = notesByCell.get(idx) ?? new Set();
                if (set.has(n)) set.delete(n);
                else set.add(n);
                notesByCell.set(idx, set);
                renderNotes(idx);
                return;
            }

            if (idx !== -1 && clean) clearNotes(idx);

            updateCellStateAndPenalty(cell);
            if (gameOver) return;

            refreshStatus();

            if (isSolved()) {
                winGame();
                return;
            }

            if (clean) {
                if (idx !== -1) focusByIndex(idx + 1);
            }
        });
    });

    if (btnNew) {
        btnNew.addEventListener("click", () => {
            const diff = difficultySel?.value ?? "easy";
            const gen = generateSudoku(diff);

            correctCount = 0;
            correctlyFixedCells.clear();
            savedGameId = null;
            currentSolution = gen.solution;
            maxMistakes = gen.cfg.maxMistakes;
            maxHints = gen.cfg.maxHints;

            mistakes = 0;
            hintsUsed = 0;
            penalizedCells.clear();

            gameOver = false;
            gameWon = false;

            if (btnPause) btnPause.disabled = false;
            if (btnReset) btnReset.disabled = false;
            if (btnHint) btnHint.disabled = false;
            if (btnAbandon) btnAbandon.disabled = false;
            if (btnSave) btnSave.disabled = false;
            if (btnLoad) btnLoad.disabled = false;

            clearAllNotes();
            setNotesMode(false);
            setPaused(false);

            loadPuzzleToUI(gen.puzzle);

            resetTimer();
            startTimer();

            refreshStatus();
            focusByIndex(0);

            SudokuStats.recordStart({ difficulty: diff });
        });
    }

    if (btnReset) btnReset.addEventListener("click", resetOnlyUserCells);
    if (btnHint) btnHint.addEventListener("click", giveHint);

    resetTimer();
    setStatus("");

    function endGameAbandoned() {
        if (gameOver || gameWon) return;

        gameOver = true;
        paused = false;

        stopTimer();

        cells.forEach(cell => {
            cell.disabled = true;
        });

        if (boardPause) {
            boardPause.classList.remove("show");
            boardPause.setAttribute("aria-hidden", "true");
        }

        if (btnReset) btnReset.disabled = true;
        if (btnAbandon) btnAbandon.disabled = true;

        setStatus(t("sudoku_abandoned_status"), "sudoku_abandoned_status");
        disableGameButtonsAfterEnd();

        const diff = difficultySel?.value ?? "easy";
        SudokuStats.recordAbandon({ difficulty: diff, timeSec: seconds, correct: correctCount, mistakes: mistakes });
        if (isLoggedIn()) {
            postJson("php/save_game.php", {
                game_id: savedGameId,
                difficulty: diff,
                status: "abandoned",
                time: seconds,
                correct: correctCount,
                mistakes,
                hints_used: hintsUsed,
                state_json: serializeState(),
            }).catch(() => {});
        }
    }

    function disableGameButtonsAfterEnd() {
        const ids = [
            "btn-pause",
            "btn-reset",
            "btn-abandon",
            "btn-notes",
            "btn-hint",
            "btn-save",
            "btn-load"
        ];

        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
    }

    if (btnAbandon) {
        btnAbandon.addEventListener("click", () => {
            if (!currentSolution) return;

            const ok = confirm(t("sudoku_confirm_abandon"));
            if (!ok) return;

            endGameAbandoned();
        });
    }

    document.addEventListener("languageChanged", () => {
        if (btnPause && currentSolution && !gameOver && !gameWon) {
            btnPause.textContent = paused ? t("sudoku_resume") : t("sudoku_pause");
        }

        if (btnNotes) {
            btnNotes.textContent = notesMode ? t("sudoku_notes_on") : t("sudoku_notes_off");
        }

        if (lastStatusKey) {
            setStatus(t(lastStatusKey, lastStatusVars), lastStatusKey, lastStatusVars);
        } else if (currentSolution && !gameOver && !gameWon) {
            refreshStatus();
        } else if (!currentSolution) {
            setStatus("");
        }
    });
});