<?php

declare(strict_types=1);

/**
 * Tags routes — all /api/tags/* endpoints.
 *
 * GET    /api/tags                    all tags for user (with note counts)
 * GET    /api/tags/note/{noteId}      tags assigned to a specific note
 * GET    /api/tags/{id}/notes         notes that have a specific tag
 * POST   /api/tags                    create tag
 * POST   /api/tags/assign             assign tag to note
 * DELETE /api/tags/assign             remove tag from note
 * DELETE /api/tags/{id}               delete tag entirely
 */

require_once __DIR__ . '/../Validator.php';

// ── Auth guard ────────────────────────────────────────────────────────────────
if (empty($_SESSION['currentUserId'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized.']);
    exit;
}

$userId = (int) $_SESSION['currentUserId'];

// URL segments: /api/tags/{seg2}/{seg3}
$seg2 = $segments[3] ?? '';   // tagId | 'note' | 'assign' | ''
$seg3 = $segments[4] ?? '';   // noteId (when seg2 === 'note')
$tagId = is_numeric($seg2) ? (int) $seg2 : null;

// ── GET /api/tags ─────────────────────────────────────────────────────────────
if ($method === 'GET' && $seg2 === '') {
    $stmt = $db->prepare(
        'SELECT t.tagId, t.tagName,
                COUNT(nt.noteId) AS noteCount
         FROM tags t
         LEFT JOIN note_tags nt ON nt.tagId = t.tagId
         LEFT JOIN notes n ON n.noteId = nt.noteId AND n.userId = t.userId
         WHERE t.userId = ?
         GROUP BY t.tagId
         ORDER BY t.tagName ASC'
    );
    $stmt->execute([$userId]);
    echo json_encode(array_values($stmt->fetchAll()));
    exit;
}

// ── GET /api/tags/note/{noteId} ───────────────────────────────────────────────
if ($method === 'GET' && $seg2 === 'note' && is_numeric($seg3)) {
    $noteId = (int) $seg3;
    $stmt = $db->prepare(
        'SELECT t.tagId, t.tagName
         FROM tags t
         JOIN note_tags nt ON nt.tagId = t.tagId
         JOIN notes n ON n.noteId = nt.noteId
         WHERE nt.noteId = ? AND n.userId = ?
         ORDER BY t.tagName ASC'
    );
    $stmt->execute([$noteId, $userId]);
    echo json_encode(array_values($stmt->fetchAll()));
    exit;
}

// ── GET /api/tags/{id}/notes ──────────────────────────────────────────────────
if ($method === 'GET' && $tagId !== null && $seg3 === 'notes') {
    $stmt = $db->prepare(
        'SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned, n.updatedAt
         FROM notes n
         JOIN note_tags nt ON nt.noteId = n.noteId
         WHERE nt.tagId = ? AND n.userId = ?
         ORDER BY n.isPinned DESC, n.updatedAt DESC'
    );
    $stmt->execute([$tagId, $userId]);
    echo json_encode(array_values($stmt->fetchAll()));
    exit;
}

// ── POST /api/tags ────────────────────────────────────────────────────────────
if ($method === 'POST' && $seg2 === '') {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $tagName = trim($body['tagName'] ?? '');

    $v = (new Validator())
        ->required('tagName', $tagName)
        ->maxLength('tagName', $tagName, 50);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    try {
        $stmt = $db->prepare('INSERT INTO tags (userId, tagName) VALUES (?, ?)');
        $stmt->execute([$userId, $tagName]);
        $newId = (int) $db->lastInsertId();

        http_response_code(201);
        echo json_encode(['message' => 'Tag created.', 'tagId' => $newId]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(['error' => 'Tag already exists.']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create tag.']);
        }
    }
    exit;
}

// ── POST /api/tags/assign ─────────────────────────────────────────────────────
if ($method === 'POST' && $seg2 === 'assign') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $tagId  = isset($body['tagId'])  ? (int)$body['tagId']  : null;
    $noteId = isset($body['noteId']) ? (int)$body['noteId'] : null;

    if (!$tagId || !$noteId) {
        http_response_code(400);
        echo json_encode(['error' => 'tagId and noteId are required.']);
        exit;
    }

    // Verify note belongs to user
    $check = $db->prepare('SELECT noteId FROM notes WHERE noteId = ? AND userId = ?');
    $check->execute([$noteId, $userId]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Note not found.']);
        exit;
    }

    // INSERT IGNORE — silently skips if already assigned
    $stmt = $db->prepare(
        'INSERT IGNORE INTO note_tags (noteId, tagId) VALUES (?, ?)'
    );
    $stmt->execute([$noteId, $tagId]);

    echo json_encode(['message' => 'Tag assigned.']);
    exit;
}

// ── DELETE /api/tags/assign ───────────────────────────────────────────────────
if ($method === 'DELETE' && $seg2 === 'assign') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $tagId  = isset($body['tagId'])  ? (int)$body['tagId']  : null;
    $noteId = isset($body['noteId']) ? (int)$body['noteId'] : null;

    if (!$tagId || !$noteId) {
        http_response_code(400);
        echo json_encode(['error' => 'tagId and noteId are required.']);
        exit;
    }

    $stmt = $db->prepare(
        'DELETE nt FROM note_tags nt
         JOIN notes n ON n.noteId = nt.noteId
         WHERE nt.tagId = ? AND nt.noteId = ? AND n.userId = ?'
    );
    $stmt->execute([$tagId, $noteId, $userId]);

    echo json_encode(['message' => 'Tag removed from note.']);
    exit;
}

// ── DELETE /api/tags/{id} ─────────────────────────────────────────────────────
if ($method === 'DELETE' && $tagId !== null) {
    $stmt = $db->prepare('DELETE FROM tags WHERE tagId = ? AND userId = ?');
    $stmt->execute([$tagId, $userId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Tag not found.']);
        exit;
    }

    echo json_encode(['message' => 'Tag deleted.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Tags endpoint not found.']);
