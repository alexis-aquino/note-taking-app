<?php

declare(strict_types=1);

/**
 * Auth routes — all /api/auth/* endpoints.
 *
 * POST   /api/auth/register
 * POST   /api/auth/login
 * POST   /api/auth/logout
 * GET    /api/auth/me
 * PUT    /api/auth/me
 * PUT    /api/auth/change-password
 * DELETE /api/auth/account
 */

require_once __DIR__ . '/../Validator.php';

$authSegment = $segments[3] ?? '';   // e.g. "login", "me", "change-password"

// ── POST /api/auth/register ───────────────────────────────────────────────────
if ($method === 'POST' && $authSegment === 'register') {
    $body        = json_decode(file_get_contents('php://input'), true) ?? [];
    $userName    = trim($body['userName']    ?? '');
    $userEmail   = trim($body['userEmail']   ?? '');
    $userPassword = trim($body['userPassword'] ?? '');

    $v = (new Validator())
        ->required('userName',    $userName)
        ->maxLength('userName',   $userName, 100)
        ->required('userEmail',   $userEmail)
        ->email('userEmail',      $userEmail)
        ->required('userPassword', $userPassword)
        ->minLength('userPassword', $userPassword, 6);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    $check = $db->prepare('SELECT userId FROM users WHERE userEmail = ?');
    $check->execute([$userEmail]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already registered.']);
        exit;
    }

    $hash = password_hash($userPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $db->prepare(
        'INSERT INTO users (userEmail, displayName, passwordHash) VALUES (?, ?, ?)'
    );
    $stmt->execute([$userEmail, $userName, $hash]);
    $newId = (int) $db->lastInsertId();

    http_response_code(201);
    echo json_encode(['message' => 'Registered.', 'userId' => $newId]);
    exit;
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
if ($method === 'POST' && $authSegment === 'login') {
    $body        = json_decode(file_get_contents('php://input'), true) ?? [];
    $userEmail   = trim($body['userEmail']   ?? '');
    $userPassword = trim($body['userPassword'] ?? '');

    $v = (new Validator())
        ->required('userEmail',    $userEmail)
        ->email('userEmail',       $userEmail)
        ->required('userPassword', $userPassword);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    $stmt = $db->prepare(
        'SELECT userId, passwordHash FROM users WHERE userEmail = ?'
    );
    $stmt->execute([$userEmail]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($userPassword, $user['passwordHash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid credentials.']);
        exit;
    }

    session_regenerate_id(true);
    $_SESSION['currentUserId'] = (int) $user['userId'];

    http_response_code(200);
    echo json_encode(['message' => 'Login successful.']);
    exit;
}

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
if ($method === 'POST' && $authSegment === 'logout') {
    session_destroy();
    setcookie(session_name(), '', time() - 3600, '/');
    echo json_encode(['message' => 'Logged out.']);
    exit;
}

// ── All routes below require authentication ───────────────────────────────────
if (empty($_SESSION['currentUserId'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized.']);
    exit;
}

$userId = (int) $_SESSION['currentUserId'];

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
if ($method === 'GET' && $authSegment === 'me') {
    $stmt = $db->prepare(
        'SELECT userId, userEmail, displayName, createdAt FROM users WHERE userId = ?'
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found.']);
        exit;
    }

    echo json_encode($user);
    exit;
}

// ── PUT /api/auth/me ──────────────────────────────────────────────────────────
if ($method === 'PUT' && $authSegment === 'me') {
    $body        = json_decode(file_get_contents('php://input'), true) ?? [];
    $displayName = trim($body['displayName'] ?? '');

    $v = (new Validator())
        ->required('displayName', $displayName)
        ->maxLength('displayName', $displayName, 100);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    $stmt = $db->prepare('UPDATE users SET displayName = ? WHERE userId = ?');
    $stmt->execute([$displayName, $userId]);

    echo json_encode(['message' => 'Profile updated.']);
    exit;
}

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
if ($method === 'PUT' && $authSegment === 'change-password') {
    $body            = json_decode(file_get_contents('php://input'), true) ?? [];
    $currentPassword = trim($body['currentPassword'] ?? '');
    $newPassword     = trim($body['newPassword']     ?? '');

    $v = (new Validator())
        ->required('currentPassword', $currentPassword)
        ->required('newPassword',     $newPassword)
        ->minLength('newPassword',    $newPassword, 6);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    $stmt = $db->prepare('SELECT passwordHash FROM users WHERE userId = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($currentPassword, $user['passwordHash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Current password is incorrect.']);
        exit;
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt    = $db->prepare('UPDATE users SET passwordHash = ? WHERE userId = ?');
    $stmt->execute([$newHash, $userId]);

    echo json_encode(['message' => 'Password changed.']);
    exit;
}

// ── DELETE /api/auth/account ──────────────────────────────────────────────────
if ($method === 'DELETE' && $authSegment === 'account') {
    $stmt = $db->prepare('DELETE FROM users WHERE userId = ?');
    $stmt->execute([$userId]);

    session_destroy();
    setcookie(session_name(), '', time() - 3600, '/');

    echo json_encode(['message' => 'Account deleted.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Auth endpoint not found.']);
