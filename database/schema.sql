-- ================================================================
-- schema.sql
-- Note-Taking Application — Group Two
-- Final Project · AY 2025–2026
-- Spec reference: Section 7.4 (Pages 16–17)
-- ================================================================
CREATE DATABASE IF NOT EXISTS noteAppDb
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
USE noteAppDb;
-- ----------------------------------------------------------------
-- TABLE: users
-- §7.2.1 p.14 — open self-registration with email, display name,
-- password. Email uniqueness enforced at DB level.
-- §7.4 p.16 — columns: id, email, display_name, password_hash,
-- created_at, updated_at.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
userId INT UNSIGNED NOT NULL AUTO_INCREMENT,
userEmail VARCHAR(255) NOT NULL,
displayName VARCHAR(100) NOT NULL,
passwordHash VARCHAR(255) NOT NULL,
createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (userId),
UNIQUE KEY uqUserEmail (userEmail)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- ----------------------------------------------------------------
-- TABLE: categories
-- §7.2.3 p.15 — categories are user-defined and per-user.
-- §7.4 p.16 — columns: id, user_id (FK), name, created_at;
-- UNIQUE (user_id, name).
-- ON DELETE CASCADE: removing a user removes their categories.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
categoryId INT UNSIGNED NOT NULL AUTO_INCREMENT,
userId INT UNSIGNED NOT NULL,
categoryName VARCHAR(100) NOT NULL,
createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (categoryId),
UNIQUE KEY uqUserCategory (userId, categoryName),
CONSTRAINT fkCategoryUser
FOREIGN KEY (userId)
REFERENCES users (userId)
ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- ----------------------------------------------------------------
-- TABLE: notes
-- §7.2.2 p.14 — title (required, 1-200 chars), body (Markdown),
-- one category (or NULL for Uncategorized),
-- is_pinned, timestamps.
-- §7.4 p.17 — LONGTEXT for body; FULLTEXT index on title+body.
-- categoryId SET NULL: deleting a category keeps the note alive.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
noteId INT UNSIGNED NOT NULL AUTO_INCREMENT,
userId INT UNSIGNED NOT NULL,
categoryId INT UNSIGNED NULL DEFAULT NULL,
noteTitle VARCHAR(200) NOT NULL,
noteBody LONGTEXT NOT NULL,
isPinned TINYINT(1) NOT NULL DEFAULT 0,
createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (noteId),
CONSTRAINT fkNoteUser
FOREIGN KEY (userId)
REFERENCES users (userId)
ON DELETE CASCADE,
CONSTRAINT fkNoteCategory
FOREIGN KEY (categoryId)
REFERENCES categories (categoryId)
ON DELETE SET NULL,
FULLTEXT INDEX ftNoteSearch (noteTitle, noteBody)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- ----------------------------------------------------------------
-- TABLE: tags
-- §7.2.3 p.15 — free-form strings, per-user.
-- §7.4 p.17 — UNIQUE (user_id, name) — NOT unique globally.
-- §7.4.1 p.17 — common student error: making tagName globally
-- unique blocks different users from using the
-- same tag word. Constraint must be per-user.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
tagId INT UNSIGNED NOT NULL AUTO_INCREMENT,
userId INT UNSIGNED NOT NULL,
tagName VARCHAR(50) NOT NULL,
createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (tagId),
UNIQUE KEY uqUserTag (userId, tagName),
CONSTRAINT fkTagUser
FOREIGN KEY (userId)
REFERENCES users (userId)
ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
-- ----------------------------------------------------------------
-- TABLE: note_tags (junction / bridge table)
-- §7.2.3 p.15 — a note can have many tags; a tag can belong
-- to many notes. This is a many-to-many relation.
-- §7.4 p.17 — composite PK (note_id, tag_id).
-- Both FKs CASCADE so orphan rows are never left behind.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS note_tags (
noteId INT UNSIGNED NOT NULL,
tagId INT UNSIGNED NOT NULL,
PRIMARY KEY (noteId, tagId),
CONSTRAINT fkNoteTagNote
FOREIGN KEY (noteId)
REFERENCES notes (noteId)
ON DELETE CASCADE,
CONSTRAINT fkNoteTagTag
FOREIGN KEY (tagId)
REFERENCES tags (tagId)
ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;