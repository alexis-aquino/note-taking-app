<?php

declare(strict_types=1);

/**
 * Notes routes — all /api/notes/* endpoints.
 *
 * GET    /api/notes/              list all notes
 * GET    /api/notes/search        full-text + filter search
 * GET    /api/notes/{id}          single note
 * POST   /api/notes/              create note
 * PUT    /api/notes/{id}          update note
 * DELETE /api/notes/{id}          delete note
 *
 * Search strategies (spec requirement):
 *   1. LIKE  — always runs, case-insensitive substring, ordered by updatedAt DESC
 *   2. FULLTEXT — attempted when query >= 3 chars; ordered by relevance DESC
 *      Requires: ALTER TABLE notes ADD FULLTEXT INDEX ft_notes (noteTitle, noteBody);
 *
 * Filtering: categoryId and tagIds (comma-separated) work independently or
 * combined with text search. Every query is scoped to userId (security).
 */

require_once __DIR__ . '/../Validator.php';
require_once __DIR__ . '/../vendor/autoload.php';

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\DisallowedRawHtml\DisallowedRawHtmlExtension;
use League\CommonMark\MarkdownConverter;

// ── Markdown renderer (league/commonmark with HTML-safe extension) ────────────
$mdEnv = new Environment(['allow_unsafe_links' => false]);
$mdEnv->addExtension(new CommonMarkCoreExtension());
$mdEnv->addExtension(new DisallowedRawHtmlExtension());
$mdConverter = new MarkdownConverter($mdEnv);

function renderMarkdown(MarkdownConverter $converter, string $raw): string
{
    return (string) $converter->convert($raw);
}

// ── Auth guard ────────────────────────────────────────────────────────────────
if (empty($_SESSION['currentUserId'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized.']);
    exit;
}

$userId    = (int) $_SESSION['currentUserId'];
$noteSegment = $segments[3] ?? '';   // '' | 'search' | '{id}'
$noteId    = is_numeric($noteSegment) ? (int) $noteSegment : null;

// ── GET /api/notes/search ─────────────────────────────────────────────────────
if ($method === 'GET' && $noteSegment === 'search') {
    $rawQuery  = trim($_GET['q'] ?? '');
    $catId     = isset($_GET['categoryId']) && $_GET['categoryId'] !== '' ? (int)$_GET['categoryId'] : null;
    $rawTagIds = trim($_GET['tagIds'] ?? '');

    // Parse comma-separated tagIds into a clean integer array
    $tagIdList = [];
    if ($rawTagIds !== '') {
        foreach (explode(',', $rawTagIds) as $t) {
            $t = trim($t);
            if (is_numeric($t) && (int)$t > 0) {
                $tagIdList[] = (int)$t;
            }
        }
    }

    $hasText     = $rawQuery !== '';
    $hasTags     = count($tagIdList) > 0;
    $hasCategory = $catId !== null;

    if (!$hasText && !$hasTags && !$hasCategory) {
        http_response_code(400);
        echo json_encode(['error' => 'Provide a search query, tag, or category filter.']);
        exit;
    }

    // Build multi-tag AND joins (one JOIN per tag)
    $tagJoins = '';
    foreach ($tagIdList as $i => $tid) {
        $tagJoins .= " INNER JOIN note_tags nt{$i} ON nt{$i}.noteId = n.noteId AND nt{$i}.tagId = :tag{$i}";
    }

    $catClause  = $hasCategory ? 'AND n.categoryId = :catId' : '';
    $textClause = $hasText     ? 'AND (n.noteTitle LIKE :like1 OR n.noteBody LIKE :like2)' : '';

    // ── STRATEGY 1: LIKE (always works, per-character search) ─────────────────
    $likeSql = "SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                       n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt
                FROM notes n
                LEFT JOIN categories c ON c.categoryId = n.categoryId
                {$tagJoins}
                WHERE n.userId = :userId
                  {$textClause}
                  {$catClause}
                ORDER BY n.updatedAt DESC";

    $likeParams = [':userId' => $userId];
    foreach ($tagIdList as $i => $tid) {
        $likeParams[":tag{$i}"] = $tid;
    }
    if ($hasText) {
        $likeParams[':like1'] = "%{$rawQuery}%";
        $likeParams[':like2'] = "%{$rawQuery}%";
    }
    if ($hasCategory) {
        $likeParams[':catId'] = $catId;
    }

    $likeStmt = $db->prepare($likeSql);
    $likeStmt->execute($likeParams);
    $likeRows = $likeStmt->fetchAll();

    // ── STRATEGY 2: FULLTEXT upgrade (query >= 3 chars) ───────────────────────
    if ($hasText && mb_strlen($rawQuery) >= 3) {
        try {
            $ftSql = "SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                             n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt,
                             MATCH(n.noteTitle, n.noteBody) AGAINST(:q IN BOOLEAN MODE) AS relevanceScore
                      FROM notes n
                      LEFT JOIN categories c ON c.categoryId = n.categoryId
                      {$tagJoins}
                      WHERE n.userId = :userId
                        AND MATCH(n.noteTitle, n.noteBody) AGAINST(:q2 IN BOOLEAN MODE)
                        {$catClause}
                      ORDER BY relevanceScore DESC";

            $ftParams = [':userId' => $userId, ':q' => $rawQuery, ':q2' => $rawQuery];
            foreach ($tagIdList as $i => $tid) {
                $ftParams[":tag{$i}"] = $tid;
            }
            if ($hasCategory) {
                $ftParams[':catId'] = $catId;
            }

            $ftStmt = $db->prepare($ftSql);
            $ftStmt->execute($ftParams);
            $ftRows = $ftStmt->fetchAll();

            // FULLTEXT succeeded — return relevance-ordered results
            foreach ($ftRows as &$row) {
                $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
            }
            echo json_encode(array_values($ftRows));
            exit;
        } catch (PDOException $e) {
            // FULLTEXT index absent — fall through to LIKE results
        }
    }

    // Return LIKE results
    foreach ($likeRows as &$row) {
        $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
    }
    echo json_encode(array_values($likeRows));
    exit;
}

// ── GET /api/notes/ ───────────────────────────────────────────────────────────
if ($method === 'GET' && $noteId === null && $noteSegment === '') {
    $stmt = $db->prepare(
        'SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt
         FROM notes n
         LEFT JOIN categories c ON c.categoryId = n.categoryId
         WHERE n.userId = ?
         ORDER BY n.isPinned DESC, n.updatedAt DESC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
    }
    echo json_encode(array_values($rows));
    exit;
}

// ── GET /api/notes/{id} ───────────────────────────────────────────────────────
if ($method === 'GET' && $noteId !== null) {
    $stmt = $db->prepare(
        'SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt
         FROM notes n
         LEFT JOIN categories c ON c.categoryId = n.categoryId
         WHERE n.noteId = ? AND n.userId = ?'
    );
    $stmt->execute([$noteId, $userId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Note not found.']);
        exit;
    }

    $row['noteBodyHtml'] = renderMarkdown($mdConverter, $row['noteBody']);
    echo json_encode($row);
    exit;
}

// ── POST /api/notes/ ──────────────────────────────────────────────────────────
if ($method === 'POST' && $noteSegment === '') {
    $body      = json_decode(file_get_contents('php://input'), true) ?? [];
    $noteTitle = trim($body['noteTitle'] ?? '');
    $noteBody  = $body['noteBody'] ?? '';
    $catId     = !empty($body['categoryId']) ? (int)$body['categoryId'] : null;
    $isPinned  = !empty($body['isPinned'])   ? 1 : 0;

    $v = (new Validator())
        ->required('noteTitle', $noteTitle)
        ->maxLength('noteTitle', $noteTitle, 200);

    if ($v->fails()) {
        http_response_code(400);
        echo json_encode(['error' => $v->firstError()]);
        exit;
    }

    $stmt = $db->prepare(
        'INSERT INTO notes (userId, noteTitle, noteBody, categoryId, isPinned)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $noteTitle, $noteBody, $catId, $isPinned]);
    $newNoteId = (int) $db->lastInsertId();

    http_response_code(201);
    echo json_encode(['message' => 'Note created.', 'noteId' => $newNoteId]);
    exit;
}

// ── PUT /api/notes/{id} ───────────────────────────────────────────────────────
if ($method === 'PUT' && $noteId !== null) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    // Check ownership
    $check = $db->prepare('SELECT noteId FROM notes WHERE noteId = ? AND userId = ?');
    $check->execute([$noteId, $userId]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Note not found.']);
        exit;
    }

    // Build dynamic SET clause — only update fields that were sent
    $fields = [];
    $values = [];

    if (array_key_exists('noteTitle', $body)) {
        $noteTitle = trim($body['noteTitle']);
        $v = (new Validator())->required('noteTitle', $noteTitle)->maxLength('noteTitle', $noteTitle, 200);
        if ($v->fails()) {
            http_response_code(400);
            echo json_encode(['error' => $v->firstError()]);
            exit;
        }
        $fields[] = 'noteTitle = ?';
        $values[] = $noteTitle;
    }
    if (array_key_exists('noteBody', $body)) {
        $fields[] = 'noteBody = ?';
        $values[] = $body['noteBody'];
    }
    if (array_key_exists('categoryId', $body)) {
        $fields[] = 'categoryId = ?';
        $values[] = !empty($body['categoryId']) ? (int)$body['categoryId'] : null;
    }
    if (array_key_exists('isPinned', $body)) {
        $fields[] = 'isPinned = ?';
        $values[] = $body['isPinned'] ? 1 : 0;
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No fields to update.']);
        exit;
    }

    $values[] = $noteId;
    $values[] = $userId;
    $stmt = $db->prepare('UPDATE notes SET ' . implode(', ', $fields) . ' WHERE noteId = ? AND userId = ?');
    $stmt->execute($values);

    echo json_encode(['message' => 'Note updated.']);
    exit;
}

// ── DELETE /api/notes/{id} ────────────────────────────────────────────────────
if ($method === 'DELETE' && $noteId !== null) {
    $stmt = $db->prepare('DELETE FROM notes WHERE noteId = ? AND userId = ?');
    $stmt->execute([$noteId, $userId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Note not found.']);
        exit;
    }

    echo json_encode(['message' => 'Note deleted.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Notes endpoint not found.']);
