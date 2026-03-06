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

    $stmt = $conn->prepare("DELETE FROM games WHERE user_id = ?");
    $stmt->bind_param('i', $user_id);

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'No se pudieron reiniciar las estadísticas']);
        exit();
    }

    echo json_encode([
        'ok' => true,
        'stats' => [
            'played' => 0,
            'wins' => 0,
            'losses' => 0,
            'bestTimeSec' => null,
            'difficultyCounts' => ['easy' => 0, 'medium' => 0, 'hard' => 0, 'expert' => 0],
            'totalCorrect' => 0,
            'totalMistakes' => 0
        ]
    ]);
?>