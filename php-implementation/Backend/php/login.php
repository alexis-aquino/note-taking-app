<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$requestBody = json_decode(file_get_contents('php://input'), true);
$userEmail = trim($requestBody['userEmail'] ?? '');
$userPassword = trim($requestBody['userPassword'] ?? '');

if ($userEmail === '' || $userPassword === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password required.']);
    exit;
}

try {
    $stmt = $dbConnection->prepare(
        'SELECT userId, passwordHash FROM users WHERE userEmail = ?'
    );
    
    $stmt->execute([$userEmail]);
    $foundUser = $stmt->fetch();

    if (!$foundUser || !password_verify($userPassword, $foundUser['passwordHash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials.']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['currentUserId'] = (int) $foundUser['userId'];
    http_response_code(200);
    echo json_encode(['message' => 'Login successful.']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Login failed.']);
}
