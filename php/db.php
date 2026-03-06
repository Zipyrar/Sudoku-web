<?php
    // Acceso más directo a la base de datos sin tener que repetir el código de conexión en cada archivo.
    mysqli_report(MYSQLI_REPORT_OFF);

    $host = 'localhost';
    $username = 'root';
    $pass = '1234';
    $db = 'sudoku_web';

    $conn = new mysqli($host, $username, $pass, $db);
    $conn->set_charset('utf8mb4');

    if ($conn->connect_error) {
        http_response_code(500);
        exit('Error de conexión a la base de datos.');
    }
?>