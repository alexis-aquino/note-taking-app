const express = require('express');
const dbPool = require('../db');
const authenticate = require('../middleware/authenticate');
const tagsRouter = express.Router();

tagsRouter.use(authenticate);

// GET tags for a specific note
tagsRouter.get('/note/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [rows] = await dbPool.query(
            `SELECT t.tagId, t.tagName
             FROM tags t
             JOIN note_tags nt ON nt.tagId = t.tagId
             JOIN notes n ON n.noteId = nt.noteId
             WHERE nt.noteId = ? AND n.userId = ?
             ORDER BY t.tagName ASC`,
            [noteId, currentUserId]
        );
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve note tags.' });
    }
});

// GET all tags for the user with note counts
tagsRouter.get('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        const [rows] = await dbPool.query(
            `SELECT t.tagId, t.tagName,
                    COUNT(nt.noteId) AS noteCount
             FROM tags t
             LEFT JOIN note_tags nt ON nt.tagId = t.tagId
             LEFT JOIN notes n ON n.noteId = nt.noteId AND n.isTrash = 0 AND n.isArchived = 0
             WHERE t.userId = ?
             GROUP BY t.tagId
             ORDER BY t.tagName ASC`,
            [currentUserId]
        );
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve tags.' });
    }
});

// GET notes for a specific tag
tagsRouter.get('/:tagId/notes', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { tagId } = req.params;
    try {
        const [rows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned, n.isFavorite, n.updatedAt
             FROM notes n
             JOIN note_tags nt ON nt.noteId = n.noteId
             WHERE nt.tagId = ? AND n.userId = ? AND n.isTrash = 0 AND n.isArchived = 0
             ORDER BY n.isPinned DESC, n.updatedAt DESC`,
            [tagId, currentUserId]
        );
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve notes for tag.' });
    }
});

// POST create tag
tagsRouter.post('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { tagName } = req.body;
    if (!tagName || !tagName.trim()) {
        return res.status(400).json({ error: 'Tag name is required.' });
    }
    try {
        const [result] = await dbPool.query(
            'INSERT INTO tags (userId, tagName) VALUES (?, ?)',
            [currentUserId, tagName.trim()]
        );
        return res.status(201).json({ message: 'Tag created.', tagId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Tag already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create tag.' });
    }
});

// POST assign tag to note
tagsRouter.post('/assign', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { tagId, noteId } = req.body;
    try {
        // Verify note belongs to user
        const [noteCheck] = await dbPool.query(
            'SELECT noteId FROM notes WHERE noteId = ? AND userId = ?',
            [noteId, currentUserId]
        );
        if (noteCheck.length === 0) return res.status(404).json({ error: 'Note not found.' });

        await dbPool.query(
            'INSERT IGNORE INTO note_tags (noteId, tagId) VALUES (?, ?)',
            [noteId, tagId]
        );
        return res.status(200).json({ message: 'Tag assigned.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to assign tag.' });
    }
});

// DELETE remove tag from note
tagsRouter.delete('/assign', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { tagId, noteId } = req.body;
    try {
        await dbPool.query(
            `DELETE nt FROM note_tags nt
             JOIN notes n ON n.noteId = nt.noteId
             WHERE nt.tagId = ? AND nt.noteId = ? AND n.userId = ?`,
            [tagId, noteId, currentUserId]
        );
        return res.status(200).json({ message: 'Tag removed from note.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to remove tag.' });
    }
});

// DELETE tag entirely
tagsRouter.delete('/:tagId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { tagId } = req.params;
    try {
        const [result] = await dbPool.query(
            'DELETE FROM tags WHERE tagId = ? AND userId = ?',
            [tagId, currentUserId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Tag not found.' });
        return res.status(200).json({ message: 'Tag deleted.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to delete tag.' });
    }
});

module.exports = tagsRouter;
