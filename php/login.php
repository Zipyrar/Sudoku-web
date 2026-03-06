<?php 
    session_start();
    require_once("db.php");

    $email = trim($_POST['email'] ?? '');
    $pass = $_POST['password'] ?? '';

    if (empty($email) || empty($pass)) {
        die("Hay campos vacíos.");
    }

    $stmt = mysqli_prepare($conn, "SELECT id, username, password_hash FROM users WHERE email=?");
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);

    $result = mysqli_stmt_get_result($stmt);
    $user = mysqli_fetch_assoc($result);

    if (!$user) {
        die("Usuario no encontrado.");
    }

    if (!password_verify($pass, $user['password_hash'])) {
        die("Contraseña incorrecta.");
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];

    header("Location: /game.html");
    exit();
?>