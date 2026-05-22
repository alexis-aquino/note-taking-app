<?php

declare(strict_types=1);

$dbHost = 'localhost';
$dbPort = '3306';
$dbName = 'noteAppDb';
$dbUser = 'root';
$dbPassword = '';

$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";

$pdoOptions = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $dbConnection = new PDO($dsn, $dbUser, $dbPassword, $pdoOptions);
} catch (PDOException $connectionException) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed.']);
    exit;
}