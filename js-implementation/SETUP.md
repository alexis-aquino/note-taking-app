# Note-Taking App - Setup & Connection Guide

## Overview
This is a full-stack Note-Taking Application with a Node.js/Express backend and a React frontend (using Vite). The backend and frontend are now fully connected with proper authentication and note management.

## Architecture

### Backend (Node.js)
- **Port**: 5000
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: Session-based (express-session with cookies)
- **Key Routes**:
  - `POST /api/auth/register` - Create new account
  - `POST /api/auth/login` - Login user
  - `POST /api/auth/logout` - Logout user
  - `GET /api/notes/` - Fetch all user's notes
  - `POST /api/notes/` - Create new note
  - `PUT /api/notes/:noteId` - Update note
  - `DELETE /api/notes/:noteId` - Delete note
  - `GET /api/notes/search?q=query` - Search notes

### Frontend (React + Vite)
- **Port**: 5173
- **Framework**: React 19 with React Router
- **API Client**: Axios (configured with base URL: http://localhost:5000)
- **Key Pages**:
  - `/` - Login page
  - `/SignUp` - Registration page
  - `/Home` - Main note editor (protected route)

## Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)
- Git

## Setup Instructions

### 1. Database Setup

```sql
-- Create the database and tables
-- Run the SQL files from the database folder:
-- 1. database/schema.sql - Creates tables
-- 2. database/seed.sql - Adds sample data (optional)

-- Or manually create the database:
CREATE DATABASE noteAppDb;
```

### 2. Backend Setup

```bash
# Navigate to backend folder
cd js-implementation/Backend/nodejs

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your MySQL credentials if needed:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=noteAppDb
# SESSION_SECRET=a_very_secret_random_string_123
# PORT=5000
# NODE_ENV=development

# Start the server
npm start

# Server runs on: http://localhost:5000
```

### 3. Frontend Setup

```bash
# Navigate to frontend folder
cd js-implementation/Frontend

# Install dependencies
npm install

# Start the development server
npm run dev

# Frontend runs on: http://localhost:5173
```

## How the Connection Works

### 1. **Authentication Flow**
```
User Registration:
  Frontend (SignUp.jsx) 
  → POST http://localhost:5000/api/auth/register 
  → Backend validates & hashes password 
  → Returns success message

User Login:
  Frontend (Login.jsx) 
  → POST http://localhost:5000/api/auth/login 
  → Backend validates credentials 
  → Creates session cookie (httpOnly, secure)
  → Redirects to Home page

Session Management:
  Axios automatically sends cookies with each request
  Backend middleware checks session before allowing access to /api/notes
```

### 2. **API Communication**
- **Frontend API Client** ([utils/api.js](Frontend/src/utils/api.js)):
  ```javascript
  baseURL: 'http://localhost:5000'
  withCredentials: true // Enables session cookie sending
  ```

- **Backend CORS** (server.js):
  ```javascript
  cors({
    origin: 'http://localhost:5173',
    credentials: true // Allows cookies
  })
  ```

### 3. **Note Operations**
```
Fetch Notes:
  Frontend → GET /api/notes/ 
  → Backend checks session 
  → Returns user's notes

Create Note:
  Frontend → POST /api/notes/ (with noteTitle, noteBody)
  → Backend stores with authenticated userId
  → Returns new note with ID

Update Note:
  Frontend → PUT /api/notes/:noteId (with updated data)
  → Backend verifies ownership
  → Updates database

Delete Note:
  Frontend → DELETE /api/notes/:noteId
  → Backend verifies ownership & deletes
  → Frontend refreshes list
```

## Testing the Connection

### 1. **Using Browser DevTools**
- Open http://localhost:5173
- Open DevTools → Application → Cookies
- Sign up or login
- Verify `connect.sid` cookie is set
- Check Network tab to see API requests to http://localhost:5000

### 2. **Test the Flow**
1. Open frontend in browser: http://localhost:5173
2. Go to Sign Up page and create account
3. Login with credentials
4. Create a new note
5. Edit and save the note
6. Check the list updates in real-time
7. Delete a note to test delete functionality

### 3. **Debug API Issues**
- Check backend console for errors
- Check browser DevTools Network tab for failed requests
- Verify MySQL connection: `mysql -u root -p noteAppDb`
- Check session is active: Look for cookies in DevTools

## Project Structure

```
js-implementation/
├── Backend/
│   └── nodejs/
│       ├── .env (Database & session config)
│       ├── .env.example
│       ├── db.js (MySQL connection pool)
│       ├── server.js (Express app setup)
│       ├── middleware/
│       │   └── authenticate.js (Session middleware)
│       ├── routes/
│       │   ├── auth.js (Register, Login, Logout)
│       │   └── notes.js (CRUD operations)
│       └── tests/
│           └── notes.test.js
├── Frontend/
│   ├── src/
│   │   ├── app.jsx (Router setup)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── SignUp.jsx
│   │   │   └── Home.jsx (Main editor with API integration)
│   │   └── utils/
│   │       └── api.js (Axios instance with baseURL)
│   ├── package.json
│   └── vite.config.js
```

## Common Issues & Solutions

### Issue: "Connect refused on 127.0.0.1:5000"
- **Cause**: Backend server not running
- **Solution**: 
  ```bash
  cd js-implementation/Backend/nodejs
  npm start
  ```

### Issue: "401 Unauthorized" on API calls
- **Cause**: Session expired or not authenticated
- **Solution**: Login again, check cookies are being sent

### Issue: "CORS error"
- **Cause**: Frontend and backend ports don't match config
- **Solution**: Verify frontend is on 5173, backend on 5000

### Issue: "Cannot GET /api/notes"
- **Cause**: Not authenticated or wrong route
- **Solution**: Login first, check route matches in auth.js

### Issue: "Database connection failed"
- **Cause**: MySQL not running or credentials wrong
- **Solution**: 
  ```bash
  # Check MySQL is running
  # Update .env with correct credentials
  # Run database schema: mysql -u root < database/schema.sql
  ```

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost          # MySQL host
DB_PORT=3306              # MySQL port
DB_USER=root              # MySQL user
DB_PASSWORD=              # MySQL password (empty for default)
DB_NAME=noteAppDb         # Database name
SESSION_SECRET=...        # Secret for session encryption
PORT=5000                 # Backend server port
NODE_ENV=development      # Environment mode
```

## Next Steps

1. ✅ Backend and Frontend are connected
2. ✅ Authentication working with sessions
3. ✅ CRUD operations for notes implemented
4. Consider adding:
   - Search functionality enhancement
   - Category/Tags support
   - Real-time collaboration
   - Database backup/recovery
   - User profile settings

## Support

For issues or questions:
1. Check the console logs (backend terminal & browser DevTools)
2. Verify database is running: `mysql -u root -p`
3. Verify both servers are running on correct ports
4. Check CORS and session configurations match

---
**Last Updated**: May 12, 2026
**Status**: ✅ Connected & Working
