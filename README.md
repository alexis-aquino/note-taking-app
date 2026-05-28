# Note-Taking Application

## Comparative Web Application Development Project

This project is a multi-user note-taking application developed using two backend implementations:

* JavaScript implementation using Node.js and Express
* PHP implementation using PHP and PDO

Both implementations share a common React frontend and MySQL database schema.

---

# Features

* User registration and login
* Session-based authentication
* Create, edit, delete, and pin notes
* Categories and tags
* Markdown note support
* Search functionality
* JSON export
* User-specific note isolation
* Password hashing and validation
* Secure Markdown sanitization

---

# Project Structure

```text
database/
├── schema.sql
├── seed.sql

js-implementation/
├── Frontend/
├── Backend/

php-implementation/
├── Backend/

docs/
tests/
```

---

# TechStack

## Frontend

* React
* Vite
* Axios

## JavaScript Backend

* Node.js
* Express
* MySQL
* bcrypt
* express-session
* DOMPurify
* marked

## PHP Backend

* PHP 8
* PDO
* Composer
* league/commonmark
* PHPUnit

## Database

* MySQL

---

# Installation Requirements

Install the following before running the project:

* Node.js
* npm
* PHP 8+
* Composer
* MySQL

---

# Database Setup

1. Create a MySQL database.

Example:

```sql
CREATE DATABASE note_taking_app;
```

2. Import the schema file:

```bash
mysql -u root -p note_taking_app < database/schema.sql
```

3. (Optional) Import seed data:

```bash
mysql -u root -p note_taking_app < database/seed.sql
```

---

# Environment Variables

Create a `.env` file inside the backend directories.

## JavaScript Backend `.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=note_taking_app
SESSION_SECRET=your_secret
PORT=5000
```

## PHP Backend `.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=note_taking_app
```

---

# Running the JavaScript Implementation

## Backend

Navigate to the backend directory:

```bash
cd js-implementation/Backend/nodejs
```

Install dependencies:

```bash
npm install
npm install -g nodemon
```

Run the server:

```bash
npm run dev
```

---

## Frontend

Navigate to the frontend directory:

```bash
cd js-implementation/Frontend
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev:node
```

Build production files:

```bash
npm run build
```

---

# Running the PHP Implementation

Navigate to the PHP backend:

```bash
cd php-implementation/Backend/php
```

Install Composer dependencies:

```bash
composer install
```

Start PHP server:

```bash
php -S localhost:8000 index.php
```

## Frontend

Navigate to the frontend directory:

```bash
cd js-implementation/Frontend
```

Run development server:

```bash
npm run dev:php
```

---

# Switching Between APIs

The frontend can connect to either:

* Node.js backend API
* PHP backend API

Update the API base URL inside the frontend configuration file.

Example:

```js
const API_URL = "http://localhost:5000";
```

or

```js
const API_URL = "http://localhost:8000";
```

---

# Security Features

* Password hashing using bcrypt and password_hash()
* SQL injection prevention using prepared statements
* Session-based authentication
* User ownership validation
* Markdown sanitization
* Input validation
* Protected API routes

---

# Test Execution

## JavaScript Tests

```bash
npm test
```

## PHP Tests

```bash
vendor/bin/phpunit
```


---

# Comparative Analysis

This project compares:

* Node.js and PHP backend architecture
* Authentication flow
* Database interaction
* Validation handling
* Security implementation
* Request lifecycle
* Maintainability and scalability

The shared frontend architecture was used to isolate backend implementation differences while maintaining consistent user experience.

---

# Developers

* Mark Loue Managad
* Alexis Aquino
* King Joseph Tabao
* Euhan Jaena
* Luigi Gonzales
* Hans Brilliance Brucal
* Uriel Garlet

---

# License

This project was developed for academic purposes only.