<?php
    session_start();
    require_once 'db.php';
    header('Content-Type: application/json; charset=utf-8');

    /* Parámetros */
    $category   = $_GET['category']   ?? 'most_wins';
    $difficulty = $_GET['difficulty'] ?? 'all';
    $limit      = 10;

    $valid_categories  = ['most_wins', 'best_time', 'best_accuracy', 'fewest_hints'];
    $valid_difficulties = ['all', 'easy', 'medium', 'hard', 'expert'];

    if (!in_array($category,   $valid_categories,   true)) $category   = 'most_wins';
    if (!in_array($difficulty, $valid_difficulties, true)) $difficulty = 'all';

    /* Filtro de dificultad (reutilizable) */
    $diff_sql  = $difficulty !== 'all' ? "AND g.difficulty = ?" : "";
    $diff_type = $difficulty !== 'all' ? 's' : '';
    $diff_val  = $difficulty !== 'all' ? $difficulty : null;

    $rows = [];

    /* Categoría: Más victorias */
    if ($category === 'most_wins') {
        $sql = "
            SELECT u.username,
                   COUNT(*)                                          AS wins,
                   MIN(CASE WHEN g.difficulty='easy'   THEN 1
                            WHEN g.difficulty='medium' THEN 2
                            WHEN g.difficulty='hard'   THEN 3
                            WHEN g.difficulty='expert' THEN 4 END)  AS hardest_num,
                   ROUND(AVG(g.time_sec))                           AS avg_time
            FROM games g
            JOIN users u ON g.user_id = u.id
            WHERE g.status = 'win' $diff_sql
            GROUP BY g.user_id, u.username
            ORDER BY wins DESC, avg_time ASC
            LIMIT ?
        ";
        $stmt = $conn->prepare($sql);
        if ($diff_val !== null) {
            $stmt->bind_param($diff_type . 'i', $diff_val, $limit);
        } else {
            $stmt->bind_param('i', $limit);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        while ($r = $res->fetch_assoc()) {
            $rows[] = [
                'username' => $r['username'],
                'wins'     => (int)$r['wins'],
                'avg_time' => (int)$r['avg_time'],
            ];
        }
        $stmt->close();
    }

    /* Categoría: Mejor tiempo */
    elseif ($category === 'best_time') {
        $sql = "
            SELECT u.username,
                   MIN(g.time_sec)   AS best_time,
                   COUNT(*)          AS wins
            FROM games g
            JOIN users u ON g.user_id = u.id
            WHERE g.status = 'win' $diff_sql
            GROUP BY g.user_id, u.username
            ORDER BY best_time ASC
            LIMIT ?
        ";
        $stmt = $conn->prepare($sql);
        if ($diff_val !== null) {
            $stmt->bind_param($diff_type . 'i', $diff_val, $limit);
        } else {
            $stmt->bind_param('i', $limit);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        while ($r = $res->fetch_assoc()) {
            $rows[] = [
                'username'  => $r['username'],
                'best_time' => (int)$r['best_time'],
                'wins'      => (int)$r['wins'],
            ];
        }
        $stmt->close();
    }

    /* Categoría: Mejor precisión (menos errores de media, mín. 3 victorias) */
    elseif ($category === 'best_accuracy') {
        $min_wins = 3;
        $sql = "
            SELECT u.username,
                   COUNT(*)                        AS wins,
                   ROUND(AVG(g.mistakes), 2)       AS avg_mistakes,
                   ROUND(AVG(g.correct),  1)       AS avg_correct
            FROM games g
            JOIN users u ON g.user_id = u.id
            WHERE g.status = 'win' $diff_sql
            GROUP BY g.user_id, u.username
            HAVING wins >= ?
            ORDER BY avg_mistakes ASC, avg_correct DESC
            LIMIT ?
        ";
        $stmt = $conn->prepare($sql);
        if ($diff_val !== null) {
            $stmt->bind_param($diff_type . 'ii', $diff_val, $min_wins, $limit);
        } else {
            $stmt->bind_param('ii', $min_wins, $limit);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        while ($r = $res->fetch_assoc()) {
            $rows[] = [
                'username'     => $r['username'],
                'avg_mistakes' => (float)$r['avg_mistakes'],
                'avg_correct'  => (float)$r['avg_correct'],
                'wins'         => (int)$r['wins'],
            ];
        }
        $stmt->close();
    }

    /* Categoría: Menos pistas usadas (media entre victorias, mín. 3) */
    elseif ($category === 'fewest_hints') {
        $min_wins = 3;
        $sql = "
            SELECT u.username,
                   COUNT(*)                        AS wins,
                   SUM(g.hints_used)               AS total_hints,
                   ROUND(AVG(g.hints_used), 2)     AS avg_hints,
                   MIN(g.hints_used)               AS best_hints
            FROM games g
            JOIN users u ON g.user_id = u.id
            WHERE g.status = 'win' $diff_sql
            GROUP BY g.user_id, u.username
            HAVING wins >= ?
            ORDER BY avg_hints ASC, total_hints ASC
            LIMIT ?
        ";
        $stmt = $conn->prepare($sql);
        if ($diff_val !== null) {
            $stmt->bind_param($diff_type . 'ii', $diff_val, $min_wins, $limit);
        } else {
            $stmt->bind_param('ii', $min_wins, $limit);
        }
        $stmt->execute();
        $res = $stmt->get_result();
        while ($r = $res->fetch_assoc()) {
            $rows[] = [
                'username'    => $r['username'],
                'avg_hints'   => (float)$r['avg_hints'],
                'total_hints' => (int)$r['total_hints'],
                'wins'        => (int)$r['wins'],
            ];
        }
        $stmt->close();
    }

    /* Respuesta */
    echo json_encode([
        'ok'         => true,
        'category'   => $category,
        'difficulty' => $difficulty,
        'rows'       => $rows,
    ]);
?>