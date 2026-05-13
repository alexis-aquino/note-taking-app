<?php

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

require_once __DIR__ . '/vendor/autoload.php';

use League\CommonMark\MarkdownConverter;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\DisallowedRawHtml\DisallowedRawHtmlExtension;

session_start();

if (empty($_SESSION['currentUserId'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. Please log in.']);
    exit;
}

$currentUserId = (int) $_SESSION['currentUserId'];
$httpMethod = $_SERVER['REQUEST_METHOD'];
$actionParam = $_GET['action'] ?? '';
$noteIdParam = isset($_GET['noteId']) ? (int) $_GET['noteId'] : null;

$mdEnv = new Environment(['allow_unsafe_links' => false]);
$mdEnv->addExtension(new CommonMarkCoreExtension());
$mdEnv->addExtension(new DisallowedRawHtmlExtension());
$mdConverter = new MarkdownConverter($mdEnv);

function renderMarkdown(MarkdownConverter $converter, string $raw): string {
    return (string) $converter->convert($raw);
}

function sendNotFound(): void {
    http_response_code(404);
    echo json_encode(['error' => 'Note not found.']);
    exit;
}

try {
    if ($httpMethod === 'GET' && $actionParam === 'search') {
        $searchQuery = trim($_GET['q'] ?? '');
    if ($searchQuery === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Search query cannot be empty.']);
        exit;
    }

    $stmt = $dbConnection->prepare(
        'SELECT noteId, noteTitle, noteBody, isPinned, categoryId,
        createdAt, updatedAt,
        MATCH(noteTitle, noteBody) AGAINST(:q IN BOOLEAN MODE) AS relevanceScore
        FROM notes
        WHERE userId = :userId
        AND MATCH(noteTitle, noteBody) AGAINST(:q2 IN BOOLEAN MODE)
        ORDER BY relevanceScore DESC'
    );

    $stmt->execute([':q' => $searchQuery, ':userId' => $currentUserId,
        ':q2' => $searchQuery]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
    }
        echo json_encode($rows);
        exit;
    }

    if ($httpMethod === 'GET' && $noteIdParam !== null) {
        $stmt = $dbConnection->prepare(
        'SELECT noteId, noteTitle, noteBody, isPinned, categoryId, createdAt, updatedAt
        FROM notes WHERE noteId = ? AND userId = ?'
    );

    $stmt->execute([$noteIdParam, $currentUserId]);
    $row = $stmt->fetch();

    if (!$row) sendNotFound();
        $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
        echo json_encode($row);
        exit;
    }

    if ($httpMethod === 'GET') {
        $stmt = $dbConnection->prepare(
        'SELECT noteId, noteTitle, noteBody, isPinned, categoryId, createdAt, updatedAt
        FROM notes WHERE userId = ?
        ORDER BY isPinned DESC, updatedAt DESC'
    );

    $stmt->execute([$currentUserId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
    }
        echo json_encode($rows);
        exit;
    }

    if ($httpMethod === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $noteTitle = trim($body['noteTitle'] ?? '');
        $noteBody = trim($body['noteBody'] ?? '');
        $categoryId = isset($body['categoryId']) ? (int)$body['categoryId'] : null;
        $isPinned = !empty($body['isPinned']) ? 1 : 0;
    
    if ($noteTitle === '' || $noteBody === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Title and body are required.']);
        exit;
    }

    $stmt = $dbConnection->prepare(
        'INSERT INTO notes (userId, noteTitle, noteBody, categoryId, isPinned)
        VALUES (?, ?, ?, ?, ?)'
    );

    $stmt->execute([$currentUserId, $noteTitle, $noteBody, $categoryId, $isPinned]);
        http_response_code(201);
        echo json_encode(['message' => 'Note created.',
        'noteId' => (int)$dbConnection->lastInsertId()]);
        exit;
    }

    if ($httpMethod === 'PUT' && $noteIdParam !== null) {
        $body = json_decode(file_get_contents('php://input'), true);
        $noteTitle = trim($body['noteTitle'] ?? '');
        $noteBody = trim($body['noteBody'] ?? '');
        $categoryId = isset($body['categoryId']) ? (int)$body['categoryId'] : null;
        $isPinned = !empty($body['isPinned']) ? 1 : 0;

    if ($noteTitle === '' || $noteBody === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Title and body are required.']);
        exit;
    }

    $check = $dbConnection->prepare(
        'SELECT noteId FROM notes WHERE noteId = ? AND userId = ?'
    );

    $check->execute([$noteIdParam, $currentUserId]);
    
    if (!$check->fetch()) sendNotFound();

    $stmt = $dbConnection->prepare(
        'UPDATE notes SET noteTitle=?, noteBody=?, categoryId=?, isPinned=?
        WHERE noteId=? AND userId=?'
    );

    $stmt->execute([$noteTitle, $noteBody, $categoryId, $isPinned,
    $noteIdParam, $currentUserId]);
        echo json_encode(['message' => 'Note updated.']);
        exit;
    }

    if ($httpMethod === 'DELETE' && $noteIdParam !== null) {
        $stmt = $dbConnection->prepare(
        'DELETE FROM notes WHERE noteId = ? AND userId = ?'
    );

    $stmt->execute([$noteIdParam, $currentUserId]);
    
    if ($stmt->rowCount() === 0) sendNotFound();
        echo json_encode(['message' => 'Note deleted.']);
        exit;
    }

    http_response_code(400);

    echo json_encode(['error' => 'Invalid request.']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred.']);
}