<?php
    session_start();
    require_once("db.php");

    header("Content-Type: application/json; charset=utf-8");

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["ok" => false, "error" => "No autenticado"]);
        exit();
    }

    $user_id = (int)$_SESSION['user_id'];

    // Aceptar JSON o POST normal.
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = $_POST;

    $difficulty = $data['difficulty'] ?? '';
    $status     = $data['status'] ?? '';
    $time       = (int)($data['time'] ?? 0);
    $correct    = (int)($data['correct'] ?? 0);
    $mistakes   = (int)($data['mistakes'] ?? 0);

    // Validación mínima
    $allowedDiff = ["easy","medium","hard","expert"];
    $allowedStatus = ["win","loss","abandoned","in_progress"];

    if (!in_array($difficulty, $allowedDiff, true)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Dificultad inválida"]);
        exit();
    }
    if (!in_array($status, $allowedStatus, true)) {
        http_response_code(400);
        echo json_encode(["ok" => false, "error" => "Estado inválido"]);
        exit();
    }

    $stmt = $conn->prepare(
    "INSERT INTO games (user_id, difficulty, time_sec, correct, mistakes, status)
    VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("isiiis", $user_id, $difficulty, $time, $correct, $mistakes, $status);

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(["ok" => false, "error" => "DB error"]);
        exit();
    }

    echo json_encode(["ok" => true]);
?>