<?php 
// Acceso más directo y sencillo a la base de datos.
    $host = 'localhost';
    $username = 'root';
    $pass = '1234';
    $db   = 'sudoku_web';

    $conn = new mysqli($host, $username, $pass, $db);
    $conn->set_charset("utf8mb4");

    if ($conn->connect_error) {
        die("Error de conexión: " . $conn->connect_error);
    }
?>