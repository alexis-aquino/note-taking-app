const express = require('express');
const { marked } = require('marked');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const dbPool = require('../db');
const authenticate = require('../middleware/authenticate');
const notesRouter = express.Router();
const domWindow = new JSDOM('').window;
const DOMPurify = createDOMPurify(domWindow);

function renderMarkdown(rawMarkdown) {
    const rawHtml = marked.parse(rawMarkdown || '');
    return DOMPurify.sanitize(rawHtml);
}

notesRouter.use(authenticate);

// GET all notes (active only)
notesRouter.get('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        const [noteRows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             WHERE n.userId = ?
             ORDER BY n.isPinned DESC, n.updatedAt DESC`,
            [currentUserId]
        );
        console.log(`Fetched ${noteRows.length} notes for user ${currentUserId}`);
        const result = noteRows.map(row => ({
            ...row, noteBodyHtml: renderMarkdown(row.noteBody)
        }));
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching notes:', err);
        return res.status(500).json({ error: 'Failed to retrieve notes.' });
    }
});



// ---------------------------------------------------------------------------
// GET /search
//
// Query params:
//   q          — search text (title + body)
//   categoryId — optional single category filter
//   tagIds     — comma-separated tag IDs; note must have ALL of them (AND logic)
//
// Search strategies:
//   1. LIKE (always runs) — case-insensitive substring match on every character
//      typed, ordered by updatedAt DESC (most-recently-modified).
//      This is the baseline required by the spec and works with no index setup.
//
//   2. FULLTEXT (upgrade, only when q length >= 3) — MATCH…AGAINST IN BOOLEAN
//      MODE, ordered by relevance score DESC.  Attempted after LIKE succeeds;
//      if the FULLTEXT index does not exist the LIKE results are returned instead.
//      Add the index with:
//        ALTER TABLE notes ADD FULLTEXT INDEX ft_notes (noteTitle, noteBody);
//
// Both strategies support categoryId and tagIds filters independently or
// combined with the text search.
//
// Security: every query is scoped to n.userId = ? — a user can never see
// another user's notes regardless of the search term.
// ---------------------------------------------------------------------------
notesRouter.get('/search', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { q: rawQuery, categoryId, tagIds: rawTagIds } = req.query;
    const searchQuery = (rawQuery || '').trim();

    // Parse comma-separated tagIds into a clean array of integers
    const tagIdList = rawTagIds
        ? rawTagIds.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
        : [];

    const hasText     = searchQuery.length > 0;
    const hasTags     = tagIdList.length > 0;
    const hasCategory = !!categoryId;

    if (!hasText && !hasTags && !hasCategory) {
        return res.status(400).json({ error: 'Provide a search query, tag, or category filter.' });
    }

    // ── Clause builders ───────────────────────────────────────────────────────
    // Multi-tag AND: one INNER JOIN per tag with a numbered alias.
    // A note only appears if it has every selected tag.
    const buildTagJoins = () => tagIdList
        .map((_, i) => `INNER JOIN note_tags nt${i} ON nt${i}.noteId = n.noteId AND nt${i}.tagId = ?`)
        .join('\n             ');

    const catClause = hasCategory ? 'AND n.categoryId = ?' : '';

    // ── STRATEGY 1: LIKE — runs on every keystroke, no index required ─────────
    // This is the primary path. Single characters, partial words — all work.
    try {
        // param order must match the SQL placeholder order:
        // 1. one param per tag join (tagIdList) — these are in the JOIN ON clauses
        // 2. userId — in the WHERE clause
        // 3. LIKE params (x2) — if text search is active
        // 4. categoryId — if category filter is active
        const params = [...tagIdList, currentUserId];

        let textClause = '';
        if (hasText) {
            textClause = 'AND (n.noteTitle LIKE ? OR n.noteBody LIKE ?)';
            const likeParam = `%${searchQuery}%`;
            params.push(likeParam, likeParam);
        }
        if (hasCategory) params.push(categoryId);

        const [likeRows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                    n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             ${buildTagJoins()}
             WHERE n.userId = ?
               ${textClause}
               ${catClause}
             ORDER BY n.updatedAt DESC`,
            params
        );

        // ── STRATEGY 2: FULLTEXT upgrade (only when query is long enough) ────
        // MySQL FULLTEXT requires at least 3 characters by default.
        // If the index exists and the query qualifies, re-run for relevance order.
        if (hasText && searchQuery.length >= 3) {
            try {
                // param order:
                // 1. first MATCH arg
                // 2. one param per tag join (tagIdList)
                // 3. userId
                // 4. second MATCH arg (for WHERE clause)
                // 5. categoryId (if present)
                const ftParams = [searchQuery, ...tagIdList, currentUserId, searchQuery];
                if (hasCategory) ftParams.push(categoryId);

                const [ftRows] = await dbPool.query(
                    `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                            n.categoryId, c.categoryName, c.categoryColor, n.createdAt, n.updatedAt,
                            MATCH(n.noteTitle, n.noteBody) AGAINST(? IN BOOLEAN MODE) AS relevanceScore
                     FROM notes n
                     LEFT JOIN categories c ON n.categoryId = c.categoryId
                     ${buildTagJoins()}
                     WHERE n.userId = ?
                       AND MATCH(n.noteTitle, n.noteBody) AGAINST(? IN BOOLEAN MODE)
                       ${catClause}
                     ORDER BY relevanceScore DESC`,
                    ftParams
                );

                // FULLTEXT succeeded — return relevance-ordered results
                return res.status(200).json(
                    ftRows.map(row => ({ ...row, noteBodyHtml: renderMarkdown(row.noteBody) }))
                );
            } catch (ftErr) {
                // Index absent or FULLTEXT error — fall through to LIKE results below
                const isMissingIndex =
                    ftErr.code === 'ER_FT_MATCHING_KEY_NOT_FOUND' ||
                    (ftErr.message || '').toLowerCase().includes('fulltext');
                if (!isMissingIndex) {
                    console.error('[search] FULLTEXT error:', ftErr.message);
                }
                // Return the already-computed LIKE results
            }
        }

        // Return LIKE results (either FULLTEXT not applicable or index absent)
        return res.status(200).json(
            likeRows.map(row => ({ ...row, noteBodyHtml: renderMarkdown(row.noteBody) }))
        );

    } catch (likeErr) {
        console.error('[search] LIKE query failed:', likeErr.message);
        return res.status(500).json({ error: 'Search failed.' });
    }
});

// GET single note
notesRouter.get('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [rows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                    n.categoryId, c.categoryName, c.categoryColor,
                    n.createdAt, n.updatedAt
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             WHERE n.noteId = ? AND n.userId = ?`,
            [noteId, currentUserId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Note not found.' });
        return res.status(200).json({
            ...rows[0], noteBodyHtml: renderMarkdown(rows[0].noteBody)
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve note.' });
    }
});

// POST create note
notesRouter.post('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteTitle, noteBody, categoryId, isPinned } = req.body;
    if (!noteTitle) {
        return res.status(400).json({ error: 'Title is required.' });
    }
    try {
        const [result] = await dbPool.query(
            `INSERT INTO notes (userId, noteTitle, noteBody, categoryId, isPinned)
             VALUES (?, ?, ?, ?, ?)`,
            [currentUserId, noteTitle, noteBody || '', categoryId || null, isPinned ? 1 : 0]
        );
        return res.status(201).json({ message: 'Note created.', noteId: result.insertId });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to create note.' });
    }
});

// PUT update note
notesRouter.put('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    const { noteTitle, noteBody, categoryId, isPinned } = req.body;
    try {
        const [check] = await dbPool.query(
            'SELECT noteId FROM notes WHERE noteId = ? AND userId = ?',
            [noteId, currentUserId]
        );
        if (check.length === 0) return res.status(404).json({ error: 'Note not found.' });

        // Build dynamic update — only update fields that were sent
        const fields = [];
        const values = [];
        if (noteTitle !== undefined) { fields.push('noteTitle = ?'); values.push(noteTitle); }
        if (noteBody !== undefined) { fields.push('noteBody = ?'); values.push(noteBody); }
        if (categoryId !== undefined) { fields.push('categoryId = ?'); values.push(categoryId || null); }
        if (isPinned !== undefined) { fields.push('isPinned = ?'); values.push(isPinned ? 1 : 0); }
        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });

        values.push(noteId, currentUserId);
        await dbPool.query(
            `UPDATE notes SET ${fields.join(', ')} WHERE noteId = ? AND userId = ?`,
            values
        );
        return res.status(200).json({ message: 'Note updated.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update note.' });
    }
});


// DELETE note permanently
notesRouter.delete('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [result] = await dbPool.query(
            'DELETE FROM notes WHERE noteId = ? AND userId = ?',
            [noteId, currentUserId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Note not found.' });
        return res.status(200).json({ message: 'Note deleted.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to delete note.' });
    }
});

module.exports = notesRouter;
