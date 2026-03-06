<?php
    session_start();
    require_once 'db.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Location: ../login.html');
        exit();
    }

    $csrf = $_POST['csrf_token'] ?? '';
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrf)) {
        die('Token CSRF no válido.');
    }

    if (empty($email) || empty($password)) {
        die('Hay campos vacíos.');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die('El correo no es válido.');
    }

    $stmt = mysqli_prepare($conn, "SELECT id, username, password_hash FROM users WHERE email = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);

    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);

    mysqli_stmt_close($stmt);

    if (!$user) {
        die('Usuario no encontrado.');
    }

    if (!password_verify($password, $user['password_hash'])) {
        die('Contraseña incorrecta.');
    }

    // Iniciar sesión.
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['username'] = $user['username'];

    header('Location: ../game.html');
    exit();
?>