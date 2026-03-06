<?php
    session_start();
    header('Content-Type: application/json; charset=utf-8');

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    echo json_encode([
        'ok' => true,
        'csrf_token' => $_SESSION['csrf_token'],
    ]);
?>