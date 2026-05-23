<?php

declare(strict_types=1);

header('Content-Type: application/json');

session_start();

session_destroy();

setcookie(session_name(), '', time() - 3600, '/');

http_response_code(200);

echo json_encode(['message' => 'Logged out.']);