<?php
    session_start();
    require_once 'db.php';
    header('Content-Type: application/json; charset=utf-8');

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => 'No autenticado']);
        exit();
    }

    $user_id = (int)$_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT COUNT(*) AS played, SUM(status = 'win') AS wins, MIN(CASE WHEN status = 'win' THEN time_sec ELSE NULL END) AS bestTimeSec FROM games WHERE user_id = ? AND status <> 'in_progress'");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $totals = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare("SELECT difficulty, COUNT(*) AS c FROM games WHERE user_id = ? AND status <> 'in_progress' GROUP BY difficulty");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $counts = ['easy' => 0, 'medium' => 0, 'hard' => 0, 'expert' => 0];
    while ($row = $res->fetch_assoc()) {
        if (isset($counts[$row['difficulty']])) {
            $counts[$row['difficulty']] = (int)$row['c'];
        }
    }
    $stmt->close();

    $stmt = $conn->prepare("SELECT SUM(correct) AS totalCorrect, SUM(mistakes) AS totalMistakes FROM games WHERE user_id = ? AND status <> 'in_progress'");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $sum = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    echo json_encode([
        'ok' => true,
        'stats' => [
            'played' => (int)($totals['played'] ?? 0),
            'wins' => (int)($totals['wins'] ?? 0),
            'losses' => max(0, (int)($totals['played'] ?? 0) - (int)($totals['wins'] ?? 0)),
            'bestTimeSec' => $totals['bestTimeSec'] !== null ? (int)$totals['bestTimeSec'] : null,
            'difficultyCounts' => $counts,
            'totalCorrect' => (int)($sum['totalCorrect'] ?? 0),
            'totalMistakes' => (int)($sum['totalMistakes'] ?? 0),
        ]
    ]);
?>