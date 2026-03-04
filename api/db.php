<?php 
// Acceso más directo y sencillo a la base de datos.
    $host = 'localhost';
    $username = 'root';
    $pass = '1234';
    $db   = 'sudoku_web';

    $conn = new mysqli($host, $username, $pass, $db);

    if (!$conn) {
        die("Error de conexión: " . mysqli_connect_error());
    }
?>