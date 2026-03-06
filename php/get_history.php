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
    $stmt = $conn->prepare("SELECT created_at, difficulty, time_sec, correct, mistakes, status FROM games WHERE user_id = ? AND status <> 'in_progress' ORDER BY created_at DESC, id DESC LIMIT 20");
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $history = [];
    while ($row = $res->fetch_assoc()) {
        $history[] = [
            'date' => date('Y-m-d H:i', strtotime($row['created_at'])),
            'difficulty' => $row['difficulty'],
            'timeSec' => (int)$row['time_sec'],
            'correct' => (int)$row['correct'],
            'mistakes' => (int)$row['mistakes'],
            'status' => $row['status'],
        ];
    }

    echo json_encode(['ok' => true, 'history' => $history]);
?>