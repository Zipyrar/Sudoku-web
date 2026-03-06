<?php
    session_start();
    require_once 'db.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Location: ../register.html');
        exit();
    }

    $csrf = $_POST['csrf_token'] ?? '';
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $pass1 = $_POST['password'] ?? '';
    $pass2 = $_POST['password_confirm'] ?? '';

    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrf)) {
        die('Token CSRF no válido.');
    }

    if (empty($username) || empty($email) || empty($pass1) || empty($pass2)) {
        die('Hay campos vacíos.');
    }

    if (mb_strlen($username) < 3 || mb_strlen($username) > 20) {
        die('El nombre de usuario debe tener entre 3 y 20 caracteres.');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        die('El correo no es válido.');
    }

    if (strlen($pass1) < 6) {
        die('La contraseña debe tener un mínimo de 6 caracteres.');
    }

    if ($pass1 !== $pass2) {
        die('Las contraseñas no coinciden.');
    }

    $stmt = mysqli_prepare($conn, "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1");
    mysqli_stmt_bind_param($stmt, "ss", $email, $username);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);

    if (mysqli_stmt_num_rows($stmt) > 0) {
        mysqli_stmt_close($stmt);
        die('El correo o el usuario ya están registrados.');
    }

    mysqli_stmt_close($stmt);

    $hash = password_hash($pass1, PASSWORD_DEFAULT);

    $stmt = mysqli_prepare($conn, "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "sss", $username, $email, $hash);

    if (!mysqli_stmt_execute($stmt)) {
        mysqli_stmt_close($stmt);
        die('No se pudo registrar el usuario.');
    }

    mysqli_stmt_close($stmt);

    // Iniciar sesión tras registrarse.
    session_regenerate_id(true);
    $_SESSION['user_id'] = mysqli_insert_id($conn);
    $_SESSION['username'] = $username;

    header('Location: ../game.html');
    exit();
?>