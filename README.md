# Inquisitors Society Platform

A unified campus operations platform for managing events, internships, attendance, and analytics.

## Tech Stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Frontend  | Next.js 14 (App Router) + React 19 + TypeScript + Tailwind CSS + shadcn/ui |
| Backend   | Express.js + Node.js + TypeScript             |
| Database  | PostgreSQL (plain, no Supabase) via `pg` driver |
| Auth      | JWT (24h expiry) + bcrypt                    |
| Uploads   | Multer (local disk)                          |
| AI Chat   | OpenAI-compatible API (optional)             |

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14 (running locally or accessible via network)

### 1. Clone & Configure

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.
```

### 2. Set Up the Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE inquisitors_society;"

# Run migrations in order
psql -U postgres -d inquisitors_society -f database/migrations/001_initial_schema.sql
psql -U postgres -d inquisitors_society -f database/migrations/002_custom_auth_and_teacher_role.sql
```

### 3. Start Everything

**Windows:**
```
start.bat
```

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

Or start manually:

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

### 4. Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## Project Structure

```
inquisitors-society/
  frontend/
    src/app/            Next.js App Router pages
    src/components/     UI components (shadcn/ui)
    src/lib/            API client, auth context, validation
  backend/
    src/controllers/    Route handler logic
    src/routes/         Express route definitions
    src/middleware/      Auth, validation, uploads
    src/config/         DB pool, env validation
    src/server.ts       Entry point
  database/
    schema.sql          Reference copy (DO NOT edit)
    migrations/         Sequential migration files
  .env.example          Environment variable template
  start.bat / start.sh  One-command launchers
```

## API Endpoints

| Method | Path                              | Auth     | Description                    |
| ------ | --------------------------------- | -------- | ------------------------------ |
| POST   | /api/auth/register                | -        | Create account                 |
| POST   | /api/auth/login                   | -        | Sign in                        |
| GET    | /api/auth/me                      | JWT      | Current user                   |
| GET    | /api/events                       | JWT      | List all events                |
| POST   | /api/events                       | JWT      | Create event                   |
| GET    | /api/events/:id                   | JWT      | Event details                  |
| PUT    | /api/events/:id                   | JWT      | Update event                   |
| DELETE | /api/events/:id                   | JWT      | Delete event                   |
| POST   | /api/events/:id/register          | JWT      | Register student               |
| DELETE | /api/events/:id/register          | JWT      | Cancel registration            |
| GET    | /api/events/:id/attendance        | JWT      | Get attendance                 |
| POST   | /api/events/:id/attendance        | JWT      | Mark attendance                |
| GET    | /api/internships                  | JWT      | List internships               |
| POST   | /api/internships                  | JWT      | Create internship              |
| GET    | /api/internships/:id              | JWT      | Internship details             |
| PUT    | /api/internships/:id              | JWT      | Update internship              |
| DELETE | /api/internships/:id              | JWT      | Delete internship              |
| POST   | /api/internships/:id/apply        | JWT      | Apply to internship            |
| GET    | /api/internships/:id/applications | JWT      | List applications              |
| PUT    | /api/internships/applications/:id/evaluate | JWT | Evaluate application     |
| GET    | /api/notifications                | JWT      | List notifications             |
| PUT    | /api/notifications/:id/read       | JWT      | Mark as read                   |
| PUT    | /api/notifications/read-all       | JWT      | Mark all as read               |
| GET    | /api/analytics/dashboard          | JWT      | Dashboard stats                |
| GET    | /api/analytics/events             | JWT      | Event analytics                |
| GET    | /api/analytics/internships        | JWT      | Internship analytics           |
| POST   | /api/chatbot                      | JWT      | AI chat message                |
| POST   | /api/uploads                      | JWT      | Upload file (multer)           |

## Roles

| Role    | Permissions                                              |
| ------- | -------------------------------------------------------- |
| student | Register for events, apply to internships, view analytics |
| teacher | Create events and internships, manage own content         |
| admin   | Full CRUD on all resources, mark attendance, evaluate     |

## Known Limitations

- AI chatbot requires a valid API key (gracefully degrades without one)
- Email notifications require SMTP credentials
- JWT expires in 24h with no refresh token in v1
- File uploads are local-disk only (no CDN)
- PostgreSQL instance required; migrations must be applied before first run
