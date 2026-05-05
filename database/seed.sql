-- ================================================================
-- seed.sql
-- Note-Taking Application — Group Two
-- Run AFTER schema.sql
-- §7.5 p.17: 'seeded with multiple users and notes'
-- Test password for all accounts: Password123!
-- ================================================================
USE noteAppDb;
-- Two demo users (satisfies 'multiple users' requirement)
INSERT INTO users (userEmail, displayName, passwordHash) VALUES
('alice@demo.com', 'Alice Santos',
'$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('bob@demo.com', 'Bob Reyes',
'$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
-- Alice's categories (userId = 1)
INSERT INTO categories (userId, categoryName) VALUES
(1, 'School'),
(1, 'Personal');
-- Bob's categories (userId = 2)
INSERT INTO categories (userId, categoryName) VALUES
(2, 'Work'),
(2, 'Ideas');
-- Alice's notes (userId = 1)
INSERT INTO notes (userId, categoryId, noteTitle, noteBody, isPinned) VALUES
(1, 1, 'CS Finals Review',
'## Topics\n- Database design\n- Normalization\n- SQL joins', 1),
(1, 1, 'Project Deadlines',
'Backend due **Friday**. Presentation is next week.', 0),
(1, 2, 'Weekend Plans',
'Study in the morning, rest in the afternoon.', 0);
-- Bob's notes (userId = 2)
INSERT INTO notes (userId, categoryId, noteTitle, noteBody, isPinned) VALUES
(2, 3, 'Sprint Review Notes',
'## Progress\n- Feature A done\n- Feature B in progress', 1),
(2, 4, 'App Idea',
'A markdown flashcard app. Could reuse our note schema.', 0);
-- Tags — per-user, so Alice and Bob can both have similar tag names
INSERT INTO tags (userId, tagName) VALUES
(1, 'school'),
(1, 'urgent'),
(1, 'personal'),
(2, 'work'),
(2, 'ideas');
-- Attach tags to notes
-- Alice note 1 (CS Finals) → tags: school (tagId=1), urgent (tagId=2)
-- Alice note 3 (Weekend) → tags: personal (tagId=3)
-- Bob note 4 (Sprint) → tags: work (tagId=4)
-- Bob note 5 (App Idea) → tags: ideas (tagId=5)
INSERT INTO note_tags (noteId, tagId) VALUES
(1, 1), (1, 2),
(3, 3),
(4, 4),
(5, 5);