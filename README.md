# Note-Taking Application — Backend

## Database

* Created MySQL schema with users, notes, categories, tags, note_tags
* Used InnoDB, foreign keys, CASCADE and SET NULL
* Implemented FULLTEXT search
* Enforced userId in all tables for isolation

## Node.js Backend (Developer 1)

* Built Express server with session authentication
* Implemented auth (register/login/logout) using bcrypt
* Created notes API (CRUD + search)
* Added Markdown rendering (marked + DOMPurify)
* Wrote Jest tests for user isolation

## PHP Backend (Developer 2)

* Built PDO connection with error handling
* Implemented auth using password_hash
* Created notes controller (CRUD + search)
* Added Markdown rendering (league/commonmark)
* Enforced user isolation in all queries

## Result

Both backends implement the same features and ensure users can only access their own data.
