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
    $stmt = $conn->prepare("SELECT id, difficulty, time_sec, correct, mistakes, hints_used, state_json FROM games WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC, id DESC LIMIT 1");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();

    if (!$row) {
        echo json_encode(['ok' => false, 'error' => 'No hay partidas guardadas']);
        exit();
    }

    $state = $row['state_json'] ? json_decode($row['state_json'], true) : null;

    echo json_encode([
        'ok' => true,
        'game' => [
            'game_id' => (int)$row['id'],
            'difficulty' => $row['difficulty'],
            'time' => (int)$row['time_sec'],
            'correct' => (int)$row['correct'],
            'mistakes' => (int)$row['mistakes'],
            'hints_used' => (int)$row['hints_used'],
            'state' => $state,
        ],
    ]);
?>