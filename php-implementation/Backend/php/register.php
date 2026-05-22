<?php

declare(strict_types=1);
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$requestBody = json_decode(file_get_contents('php://input'), true);
$userName = trim($requestBody['userName'] ?? '');
$userEmail = trim($requestBody['userEmail'] ?? '');
$userPassword = trim($requestBody['userPassword'] ?? '');

if ($userName === '' || $userEmail === '' || $userPassword === '') {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required.']);
    exit;
}

if (!filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address.']);
    exit;
}

try {
    $checkStmt = $dbConnection->prepare(
    'SELECT userId FROM users WHERE userEmail = ?'
    );

    $checkStmt->execute([$userEmail]);
    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered.']);
        exit;
    }

    $passwordHash = password_hash($userPassword, PASSWORD_BCRYPT, ['cost' => 12]);

    $insertStmt = $dbConnection->prepare(
        'INSERT INTO users (userEmail, displayName, passwordHash) VALUES (?, ?, ?)'
    );

    $insertStmt->execute([$userEmail, $userName, $passwordHash]);
    $newUserId = (int) $dbConnection->lastInsertId();
    http_response_code(201);
    echo json_encode(['message' => 'Registered.', 'userId' => $newUserId]);
} catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed.']);
}