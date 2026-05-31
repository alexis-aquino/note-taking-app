<?php

declare(strict_types=1);

/**
 * Categories routes — all /api/categories/* endpoints.
 *
 * GET    /api/categories              list all (with note counts)
 * GET    /api/categories/{id}/notes   notes in a category
 * POST   /api/categories              create
 * PUT    /api/categories/{id}         rename
 * DELETE /api/categories/{id}         delete
 */

require_once __DIR__ . '/../Validator.php';

// ── Auth guard ────────────────────────────────────────────────────────────────
if (empty($_SESSION['currentUserId'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized.']);
    exit;
}

$userId = (int) $_SESSION['currentUserId'];

// Parse URL segments: /api/categories/{id}/notes
// $segments[2] = categoryId or ''
// $segments[3] = 'notes' or ''
$catSegment  = $segments[3] ?? '';
$subSegment  = $segments[4] ?? '';
$catId       = is_numeric($catSegment) ? (int) $catSegment : null;

// ── GET /api/categories ───────────────────────────────────────────────────────
if ($method === 'GET' && $catId === null) {
    $stmt = $db->prepare(
        'SELECT c.categoryId, c.categoryName, c.categoryColor,
                COUNT(n.noteId) AS noteCount
         FROM categories c
         LEFT JOIN notes n ON n.categoryId = c.categoryId
         WHERE c.userId = ?
         GROUP BY c.categoryId
         ORDER BY c.categoryName ASC'
    );
    $stmt->execute([$userId]);
    $categories = $stmt->fetchAll();

    // Count notes with no category (Uncategorized bucket)
    $countStmt = $db->prepare(
        'SELECT COUNT(*) AS uncategorizedCount FROM notes WHERE userId = ? AND categoryId IS NULL'
    );
    $countStmt->execute([$userId]);
    $uncategorizedCount = (int) $countStmt->fetch()['uncategorizedCount'];

    echo json_encode([
        'categories'         => array_values($categories),
        'uncategorizedCount' => $uncategorizedCount,
    ]);
    exit;
}

// ── GET /api/categories/{id}/notes ───────────────────────────────────────────
if ($method === 'GET' && $catId !== null && $subSegment === 'notes') {
    // Special "uncategorized" bucket
    if ($catSegment === 'uncategorized') {
        $stmt = $db->prepare(
            'SELECT noteId, noteTitle, noteBody, isPinned, updatedAt
             FROM notes
             WHERE userId = ? AND categoryId IS NULL
             ORDER BY isPinned DESC, updatedAt DESC'
        );
        $stmt->execute([$userId]);
        echo json_encode(array_values($stmt->fetchAll()));
        exit;
    }

    $stmt = $db->prepare(
        'SELECT noteId, noteTitle, noteBody, isPinned, updatedAt
         FROM notes
         WHERE userId = ? AND categoryId = ?
         ORDER BY isPinned DESC, updatedAt DESC'
    );
    $stmt->execute([$userId, $catId]);
    echo json_encode(array_values($stmt->fetchAll()));
    exit;
}

// ── POST /api/categories ──────────────────────────────────────────────────────
if ($method === 'POST' && $catId === null) {
    $body         = json_decode(file_get_contents('php://input'), true) ?? [];
    $categoryName = trim($body['categoryName'] ?? '');

    $v = (new Validator())
        ->required('categoryName', $categoryName)
        ->maxLength('categoryName', $categoryName, 100);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    try {
        $stmt = $db->prepare(
            'INSERT INTO categories (userId, categoryName) VALUES (?, ?)'
        );
        $stmt->execute([$userId, $categoryName]);
        $newId = (int) $db->lastInsertId();

        http_response_code(201);
        echo json_encode(['message' => 'Category created.', 'categoryId' => $newId]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(['error' => 'Category already exists.']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create category.']);
        }
    }
    exit;
}

// ── PUT /api/categories/{id} ──────────────────────────────────────────────────
if ($method === 'PUT' && $catId !== null) {
    $body          = json_decode(file_get_contents('php://input'), true) ?? [];
    $categoryName  = trim($body['categoryName'] ?? '');
    // categoryColor is optional — null clears it, omitting it keeps existing value
    $hasColor      = array_key_exists('categoryColor', $body);
    $categoryColor = $hasColor ? ($body['categoryColor'] ?: null) : null;

    $v = (new Validator())
        ->required('categoryName', $categoryName)
        ->maxLength('categoryName', $categoryName, 100);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    try {
        if ($hasColor) {
            $stmt = $db->prepare(
                'UPDATE categories SET categoryName = ?, categoryColor = ? WHERE categoryId = ? AND userId = ?'
            );
            $stmt->execute([$categoryName, $categoryColor, $catId, $userId]);
        } else {
            $stmt = $db->prepare(
                'UPDATE categories SET categoryName = ? WHERE categoryId = ? AND userId = ?'
            );
            $stmt->execute([$categoryName, $catId, $userId]);
        }

        // Verify the category actually exists (rowCount = 0 can mean unchanged OR not found)
        $exists = $db->prepare('SELECT categoryId FROM categories WHERE categoryId = ? AND userId = ?');
        $exists->execute([$catId, $userId]);
        if (!$exists->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Category not found.']);
            exit;
        }

        echo json_encode(['message' => 'Category renamed.']);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(['error' => 'A category with that name already exists.']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to rename category.']);
        }
    }
    exit;
}

// ── DELETE /api/categories/{id} ───────────────────────────────────────────────
if ($method === 'DELETE' && $catId !== null) {
    $stmt = $db->prepare(
        'DELETE FROM categories WHERE categoryId = ? AND userId = ?'
    );
    $stmt->execute([$catId, $userId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Category not found.']);
        exit;
    }

    echo json_encode(['message' => 'Category deleted.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Categories endpoint not found.']);
