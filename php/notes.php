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
        $categoryId = isset($_GET['categoryId']) && $_GET['categoryId'] !== '' ? (int)$_GET['categoryId'] : null;

        $tagId = isset($_GET['tagId']) && $_GET['tagId'] !== '' ? (int)$_GET['tagId'] : null;

        $sql = 'SELECT noteId, noteTitle, noteBody, isPinned, categoryId, createdAt, updatedAt 
                FROM notes 
                WHERE userId = :userId';
        $params = [':userId' => $currentUserId];

        if ($searchQuery !== '') {
            $sql .= ' AND MATCH(noteTitle, noteBody) AGAINST(:q IN BOOLEAN MODE)';
            $params[':q'] = $searchQuery;
        }

        if ($categoryId !== null) {
            $sql .= ' AND categoryId = :catId';
            $params[':catId'] = $categoryId;
        }

        if ($tagId !== null) {
            $sql .= ' AND noteId IN (SELECT noteId FROM note_tags WHERE tagId = :tagId)';
            $params[':tagId'] = $tagId;
        }

        if ($searchQuery !== '') {
            $sql .= ' ORDER BY MATCH(noteTitle, noteBody) AGAINST(:q_order IN BOOLEAN MODE) DESC, isPinned DESC, updatedAt DESC';
            $params[':q_order'] = $searchQuery; 
        } else {
            $sql .= ' ORDER BY isPinned DESC, updatedAt DESC';
        }

        $stmt = $dbConnection->prepare($sql);
        $stmt->execute($params);
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

    if ($httpMethod === 'GET' && $actionParam === 'categories') {
        $stmt = $dbConnection->prepare(
            'SELECT categoryId, categoryName, createdAt 
            FROM categories 
            WHERE userId = ? 
            ORDER BY categoryName ASC'
        );

        $stmt->execute([$currentUserId]);
        $categories = $stmt->fetchAll();
        
        echo json_encode($categories);
        exit;
    }

    if ($httpMethod === 'GET' && $actionParam === 'tags') {
        $stmt = $dbConnection->prepare(
            'SELECT tagId, tagName, createdAt 
            FROM tags 
            WHERE userId = ? 
            ORDER BY tagName ASC'
        );
        $stmt->execute([$currentUserId]);
        echo json_encode($stmt->fetchAll());
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
        $categoryId = !empty($body['categoryId']) ? (int)$body['categoryId'] : null;
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
    $newNoteId = (int)$dbConnection->lastInsertId();

    $tags = $body['tags'] ?? [];
        if (is_array($tags)) {
            foreach ($tags as $tagName) {
                $tagName = trim($tagName);
                if ($tagName === '') continue; 

                $tagStmt = $dbConnection->prepare('SELECT tagId FROM tags WHERE userId = ? AND tagName = ?');
                $tagStmt->execute([$currentUserId, $tagName]);
                $tagRow = $tagStmt->fetch();

                if ($tagRow) {
                    $tagId = $tagRow['tagId']; 
                } else {
                    $insertTag = $dbConnection->prepare('INSERT INTO tags (userId, tagName) VALUES (?, ?)');
                    $insertTag->execute([$currentUserId, $tagName]);
                    $tagId = (int)$dbConnection->lastInsertId();
                }

                $linkStmt = $dbConnection->prepare('INSERT INTO note_tags (noteId, tagId) VALUES (?, ?)');
                $linkStmt->execute([$newNoteId, $tagId]);
            }
        }

    http_response_code(201);
    echo json_encode(['message' => 'Note created.', 'noteId' => $newNoteId]);
    exit;
    }

if ($httpMethod === 'PUT' && $noteIdParam !== null) {
        $body = json_decode(file_get_contents('php://input'), true);
        $noteTitle = trim($body['noteTitle'] ?? '');
        $noteBody = trim($body['noteBody'] ?? '');
        $categoryId = !empty($body['categoryId']) ? (int)$body['categoryId'] : null;
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
        $stmt->execute([$noteTitle, $noteBody, $categoryId, $isPinned, $noteIdParam, $currentUserId]);

        if (isset($body['tags']) && is_array($body['tags'])) {
            $clearTags = $dbConnection->prepare('DELETE FROM note_tags WHERE noteId = ?');
            $clearTags->execute([$noteIdParam]);

            foreach ($body['tags'] as $tagName) {
                $tagName = trim($tagName);
                if ($tagName === '') continue;

                $tagStmt = $dbConnection->prepare('SELECT tagId FROM tags WHERE userId = ? AND tagName = ?');
                $tagStmt->execute([$currentUserId, $tagName]);
                $tagRow = $tagStmt->fetch();

                if ($tagRow) {
                    $tagId = $tagRow['tagId'];
                } else {
                    $insertTag = $dbConnection->prepare('INSERT INTO tags (userId, tagName) VALUES (?, ?)');
                    $insertTag->execute([$currentUserId, $tagName]);
                    $tagId = (int)$dbConnection->lastInsertId();
                }

                $linkStmt = $dbConnection->prepare('INSERT INTO note_tags (noteId, tagId) VALUES (?, ?)');
                $linkStmt->execute([$noteIdParam, $tagId]);
            }
        }

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