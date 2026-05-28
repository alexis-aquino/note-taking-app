<?php

declare(strict_types=1);

/**
 * Database connection via PDO with prepared statements.
 * Reads credentials from environment variables when available,
 * falls back to defaults for local development.
 */

$dbHost     = $_ENV['DB_HOST']     ?? getenv('DB_HOST')     ?: 'localhost';
$dbPort     = $_ENV['DB_PORT']     ?? getenv('DB_PORT')     ?: '3306';
$dbName     = $_ENV['DB_NAME']     ?? getenv('DB_NAME')     ?: 'noteAppDb';
$dbUser     = $_ENV['DB_USER']     ?? getenv('DB_USER')     ?: 'root';
$dbPassword = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '';

$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";

$pdoOptions = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $dbConnection = new PDO($dsn, $dbUser, $dbPassword, $pdoOptions);
} catch (PDOException $connectionException) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection failed.']);
    exit;
}
