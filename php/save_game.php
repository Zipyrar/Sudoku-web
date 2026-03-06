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
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = $_POST;
    }

    $difficulty = $data['difficulty'] ?? '';
    $status = $data['status'] ?? '';
    $time = (int)($data['time'] ?? 0);
    $correct = (int)($data['correct'] ?? 0);
    $mistakes = (int)($data['mistakes'] ?? 0);
    $hints_used = (int)($data['hints_used'] ?? 0);
    $state_json = isset($data['state_json']) ? json_encode($data['state_json'], JSON_UNESCAPED_UNICODE) : null;
    $game_id = isset($data['game_id']) ? (int)$data['game_id'] : 0;

    $allowedDiff = ['easy', 'medium', 'hard', 'expert'];
    $allowedStatus = ['in_progress', 'win', 'loss', 'abandoned'];
    if (!in_array($difficulty, $allowedDiff, true) || !in_array($status, $allowedStatus, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Datos inválidos']);
        exit();
    }

    if ($game_id > 0) {
        $stmt = $conn->prepare('UPDATE games SET difficulty=?, status=?, time_sec=?, correct=?, mistakes=?, hints_used=?, state_json=? WHERE id=? AND user_id=?');
        $stmt->bind_param('ssiiiisii', $difficulty, $status, $time, $correct, $mistakes, $hints_used, $state_json, $game_id, $user_id);
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            echo json_encode(['ok' => true, 'game_id' => $game_id]);
            exit();
        }
    }

    $stmt = $conn->prepare('INSERT INTO games (user_id, difficulty, status, time_sec, correct, mistakes, hints_used, state_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('issiiiis', $user_id, $difficulty, $status, $time, $correct, $mistakes, $hints_used, $state_json);
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'No se pudo guardar la partida']);
        exit();
    }

    echo json_encode(['ok' => true, 'game_id' => (int)$stmt->insert_id]);
?>