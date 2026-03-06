<?php
    // Devuelve información sobre el usuario autenticado, 
    // o indica que no hay sesión iniciada.
    session_start();
    header('Content-Type: application/json; charset=utf-8');

    $logged = isset($_SESSION['user_id'], $_SESSION['username']);

    echo json_encode([
        'loggedIn' => $logged,
        'userId' => $logged ? (int)$_SESSION['user_id'] : null,
        'username' => $logged ? $_SESSION['username'] : null,
    ]);
?>