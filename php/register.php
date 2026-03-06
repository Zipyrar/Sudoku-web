<?php 
    session_start();
    require_once("db.php");

    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $pass1 = $_POST['password'] ?? '';
    $pass2 = $_POST['password_confirm'] ?? '';

    if (empty($username) || empty($email) || empty($pass1) || empty($pass2)) {
        die("Hay campos vacíos.");
    }

    if ($pass1 !== $pass2) {
        die("Las contraseñas no coinciden.");
    }

    $stmt = mysqli_prepare($conn, "SELECT id FROM users WHERE email = ?");
    mysqli_stmt_bind_param($stmt, "s", $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);

    if (mysqli_stmt_num_rows($stmt) > 0) {
        die("El correo ya está registrado.");
    }

    mysqli_stmt_close($stmt);

    $hash = password_hash($pass1, PASSWORD_DEFAULT);

    $stmt = mysqli_prepare($conn, "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "sss", $username, $email, $hash);

    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    header("Location: /login.html");
    exit();
?>