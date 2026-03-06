<?php
    session_start();
    require_once 'db.php';

    if (!isset($_SESSION['user_id'])) {
        header("Location: ../login.html");
        exit();
    }

    $user_id = $_SESSION['user_id'];

    $stmt = mysqli_prepare($conn, "DELETE FROM users WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "i", $user_id);
    mysqli_stmt_execute($stmt);

    mysqli_stmt_close($stmt);

    session_destroy();

    header("Location: ../index.html");
    exit();
?>