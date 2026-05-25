<?php

declare(strict_types=1);

/**
 * Front controller — single entry point for all API requests.
 *
 * Routes all /api/* requests to the appropriate handler file.
 * Handles CORS so the React frontend (localhost:5173) can communicate
 * with this PHP server (localhost:8000).
 *
 * Start with: php -S localhost:8000 index.php
 */

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the Vite dev server to call this backend.
// Credentials: true is required for session cookies to be sent.
$allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request — browser sends this before every
// cross-origin request with credentials.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Session ───────────────────────────────────────────────────────────────────
session_set_cookie_params([
    'lifetime' => 86400,        // 24 hours
    'path'     => '/',
    'secure'   => false,        // set true in production (HTTPS)
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// ── Database connection ───────────────────────────────────────────────────────
require_once __DIR__ . '/db.php';
// $dbConnection is created in db.php — alias it to $db for route files
$db = $dbConnection;

// ── Route parsing ─────────────────────────────────────────────────────────────
// Strip query string, decode, and split the path into segments.
// e.g. /api/notes/search  →  ['', 'api', 'notes', 'search']
//       index:                  0     1       2        3
$requestUri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestUri  = rtrim($requestUri, '/');
$segments    = explode('/', $requestUri);
$method      = $_SERVER['REQUEST_METHOD'];

// $segments[1] = 'api'
// $segments[2] = resource group: 'auth' | 'notes' | 'categories' | 'tags'
// $segments[3] = sub-resource or action (used inside each route file)
// $segments[4] = further nesting e.g. 'notes' in /api/categories/{id}/notes
$resource = $segments[2] ?? '';

// ── Dispatch ──────────────────────────────────────────────────────────────────
switch ($resource) {
    case 'auth':
        require __DIR__ . '/routes/auth.php';
        break;

    case 'notes':
        require __DIR__ . '/routes/notes.php';
        break;

    case 'categories':
        require __DIR__ . '/routes/categories.php';
        break;

    case 'tags':
        require __DIR__ . '/routes/tags.php';
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => "Unknown resource: {$resource}"]);
        break;
}
