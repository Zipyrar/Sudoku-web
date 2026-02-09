document.addEventListener("DOMContentLoaded", () => {
    const cells = Array.from(document.querySelectorAll(".cell"));
    const statusEl = document.getElementById("status");
    const padButtons = document.querySelectorAll(".pad-btn");

    const btnNew = document.getElementById("btn-new-game");
    const btnReset = document.getElementById("btn-reset");
    const btnPause = document.getElementById("btn-pause");
    const btnNotes = document.getElementById("btn-notes");
    const btnHint = document.getElementById("btn-hint");
    const btnAbandon = document.getElementById("btn-abandon")

    const difficultySel = document.getElementById("difficulty");
    const timerEl = document.getElementById("timer");
    const boardPause = document.getElementById("board-pause");

    if (!cells.length) return;

    // Configuración de dificultad.
    const CONFIG = {
        easy: { holes: 38, maxMistakes: 8, maxHints: 5 },
        medium: { holes: 48, maxMistakes: 5, maxHints: 3 },
        hard: { holes: 56, maxMistakes: 3, maxHints: 1 },
    };

    // Notas.
    let notesMode = false;
    // Pausa.
    let paused = false;

    const notesByCell = new Map();

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
            btnNotes.textContent = `📝 ${notesMode ? "ON" : "OFF"}`;
            btnNotes.classList.toggle("on", notesMode);
        }
    }

    // Construir interfaz de notas al cargar.
    buildNotesUI();

    if (btnNotes) {
        btnNotes.addEventListener("click", () => { 
            // Si no hay partida, no permitir notas.
            if (!currentSolution) return;

            // Si terminó, tampoco permitir.
            if (gameOver || gameWon) return;

            setNotesMode(!notesMode)
        });
        setNotesMode(false);
    }

    function getActiveCell() {
        // Priorizar la seleccionada.
        const selected = document.querySelector(".cell.selected");
        if (selected) return selected;

        // Si hay foco en una celda.
        const active = document.activeElement;
        if (active && active.classList && active.classList.contains("cell")) return active;

        return null;
    }

    function writeNumber(cell, n) {
        if (!cell) return;
        if (!currentSolution) return;
        if (paused) return;
        if (gameOver || gameWon) return;

        // Nunca tocar celdas fijas.
        if (cell.classList.contains("fixed") || cell.disabled) return;

        const idx = getIndex(cell);
        if (idx == null || idx < 0) return;

        // Modo notas.
        if (typeof notesMode !== "undefined" && notesMode) {
            const set = notesByCell.get(idx) ?? new Set();
            if (set.has(n)) set.delete(n);
            else set.add(n);
            notesByCell.set(idx, set);
            renderNotes(idx);
            return;
        }

        // Sobrescribir siempre, incluso con error.
        cell.value = String(n);

        // Limpiar estados anteriores.
        cell.classList.remove("error", "correct");

        // Limpiar notas.
        if (typeof clearNotes === "function") clearNotes(idx);

        // Recalcular acierto/error.
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

            // Vuelve el foco a la celda.
            cell.focus();
        });
    });

    function setBoardEnabled(enabled){
        cells.forEach(cell => {
            // Las fijas siempre deshabilitadas.
            if (cell.classList.contains("fixed")) return;
            // Si el juego terminó, tampoco habilitar.
            if (gameOver || gameWon) return;

            cell.disabled = !enabled;
        });
    }

    function setPaused(on){
        paused = !!on;

        if (paused){
            stopTimer();
            setBoardEnabled(false);
            if (btnPause) btnPause.textContent = "Reanudar";
            if (boardPause){
            boardPause.classList.add("show");
            boardPause.setAttribute("aria-hidden", "false");
            }
        } else {
            startTimer();
            setBoardEnabled(true);
            if (btnPause) btnPause.textContent = "Pausar";
            if (boardPause){
            boardPause.classList.remove("show");
            boardPause.setAttribute("aria-hidden", "true");
            }
        }
    }

    if (btnPause){
        btnPause.addEventListener("click", () => {
            // Si no hay partida, no pausar.
            if (!currentSolution) return;

            // Si terminó, no pausar.
            if (gameOver || gameWon) return;

            setPaused(!paused);
        });
    }

    // Estado de juego.
    let currentSolution = null;

    let maxMistakes = CONFIG.easy.maxMistakes;
    let mistakes = 0; // Errores acumulados.
    let maxHints = CONFIG.easy.maxHints;
    let hintsUsed = 0;

    let gameOver = false;
    let gameWon = false;

    const penalizedCells = new Map();

    // Interfaz.
    const setStatus = (msg = "") => {
        if (statusEl) statusEl.textContent = msg;
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


    // Timer.
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

    // Generador Sudoku.
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

    // Cargar en interfaz.
    const loadPuzzleToUI = (puzzle) => {
        cells.forEach((cell, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const v = puzzle[r][c];

        cell.classList.remove("error", "correct", "selected");
        cell.disabled = false;

        // Borrar notas siempre al cargar.
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

    const endGame = (msg) => {
        gameOver = true;
        stopTimer();
        setStatus(msg);
        cells.forEach((cell) => {
        if (!cell.classList.contains("fixed")) cell.disabled = true;
        });
    };

    const winGame = () => {
        gameWon = true;
        stopTimer();
        setStatus(
        `¡Sudoku completado! Tiempo: ${formatTime(seconds)} | Errores: ${mistakes}/${maxMistakes} | Pistas usadas: ${hintsUsed}/${maxHints}`
        );
        if (btnReset) btnReset.disabled = true;
        if (btnHint) btnHint.disabled = true;
    };

    // Contadores.
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
        setStatus(
        `Errores totales: ${mistakes}/${maxMistakes} | Errores actuales: ${currentWrong} | Pistas: ${hintsUsed}/${maxHints}`
        );
    };

    // Estado y penalización.
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
            // Correcto.
            penalizedCells.set(idx, false);

            cell.classList.add("correct");
            cell.classList.remove("error");

            // Bloquear durante el verde.
            cell.disabled = true;

            // Verde un rato, luego pasa a fijo.
            setTimeout(() => {
                cell.classList.remove("correct");
                cell.classList.add("fixed");
                // Sigue desactivado.
            }, 800);
        } else {
            // Incorrecto.
            cell.classList.add("error");
            cell.classList.remove("correct");

            if (!wasWrong) {
                penalizedCells.set(idx, true);
                mistakes += 1;

                if (mistakes >= maxMistakes) {
                    refreshStatus();
                    endGame(`Has cometido ${maxMistakes} errores. ¡Fin de la partida!`);
                    return;
                }
            }
        }
    };

    // Pistas con límite.
    const giveHint = () => {
        if (!currentSolution) return setStatus("Primero inicia una nueva partida.");
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
            setStatus("No hay celdas vacías para dar pista.");
            return;
        }

        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        const r = Math.floor(idx / 9);
        const c = idx % 9;

        const cell = cells[idx];
        cell.value = String(currentSolution[r][c]);
        cell.classList.remove("error", "correct");
        penalizedCells.set(idx, false);

        // Poner como fija y borrar notas de esa celda.
        clearNotes(idx);
        cell.classList.add("fixed");
        cell.disabled = true;

        hintsUsed += 1;
        if (hintsUsed >= maxHints && btnHint) btnHint.disabled = true;

        refreshStatus();
        if (isSolved()) winGame();
    };

    // Reseteo usuario.
    const resetOnlyUserCells = () => {
        if (!currentSolution) return;
        if (gameOver) return;

        if (gameWon) {
            setStatus("No puedes reiniciar: el Sudoku ya está completado.");
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

    // Input y navegación.
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

            // Navegación con flechas.
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

            // Borrar.
            if (e.key === "Backspace" || e.key === "Delete") {
                e.preventDefault();
                cell.value = "";
                cell.classList.remove("error", "correct");
                if (idx !== -1) penalizedCells.delete(idx);
                refreshStatus();
                return;
            }

            // Números 1..9 (modo normal o modo notas).
            if (/^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const n = Number(e.key);
                writeNumber(cell, n);

                // Avanzar solo en modo normal.
                if (!notesMode && idx !== -1) focusByIndex(idx + 1);
                return;
            }

            // Permitir tab para navegar.
            if (e.key === "Tab") return;

            // Bloquear todo lo demás (evita que se escriban letras, 0, etc.).
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

            // Si está el modo notas, no permitir número grande.
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

            // Si puso número normal, borrar notas de esta celda.
            if (idx !== -1 && clean) clearNotes(idx);

            updateCellStateAndPenalty(cell);
            if (gameOver) return;

            refreshStatus();

            if (isSolved()) {
                winGame();
                return;
            }

            // Avanzar si escribió número.
            if (clean) {
                if (idx !== -1) focusByIndex(idx + 1);
            }
        });
    });

    // Botones.
    if (btnNew) {
        btnNew.addEventListener("click", () => {
            const diff = difficultySel?.value ?? "easy";
            const gen = generateSudoku(diff);

            currentSolution = gen.solution;
            maxMistakes = gen.cfg.maxMistakes;
            maxHints = gen.cfg.maxHints;

            mistakes = 0;
            hintsUsed = 0;
            penalizedCells.clear();

            gameOver = false;
            gameWon = false;

            if (btnReset) btnReset.disabled = false;
            if (btnHint) btnHint.disabled = false;

            // Notas: limpiar y OFF
            clearAllNotes();
            setNotesMode(false);
            // Evitar que esté pausado.
            setPaused(false);

            loadPuzzleToUI(gen.puzzle);

            resetTimer();
            startTimer();

            refreshStatus();
            focusByIndex(0);
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

        // Bloquear todas las celdas.
        cells.forEach(cell => {
            cell.disabled = true;
        });

        // Ocultar overlay de pausa si estaba activo.
        if (boardPause) {
            boardPause.classList.remove("show");
            boardPause.setAttribute("aria-hidden", "true");
        }

        // Mensaje claro.
        setStatus("Partida abandonada.", "error");

        // Desactivar botones.
        disableGameButtonsAfterEnd();
    }

    function disableGameButtonsAfterEnd() {
        const ids = [
            "btn-pause",
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

            const ok = confirm("¿Seguro que quieres abandonar la partida?");
            if (!ok) return;

            endGameAbandoned();
        });
    }
});