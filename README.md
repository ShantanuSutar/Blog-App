# Unsaid — Stories and More

Unsaid is a full-stack editorial blogging platform for publishing long-form stories, discovering writers, and discussing ideas. The application combines a responsive React interface with an Express API and PostgreSQL database.

This is a personal project focused on building a polished, accessible reading and publishing experience while keeping the backend secure and maintainable.

## Highlights

- Editorial homepage with featured stories, search, categories, tags, and infinite scrolling
- Rich-text writing and editing with React Quill
- Published, draft, and scheduled post workflows
- PostgreSQL full-text search with relevance ranking
- Profiles, avatars, following, followers, and activity feeds
- Comments, reactions, bookmarks, and newsletter subscriptions
- Responsive layouts from mobile through desktop
- Light and dark themes
- Accessible navigation, forms, menus, dialogs, and keyboard interactions
- JWT authentication with server-side authorization and resource ownership checks
- Centralized validation, error handling, logging, rate limiting, and security headers
- PostgreSQL migrations, realistic sample data, and an integration-focused backend test suite

## Tech stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- Sass
- React Quill
- Lucide React

### Backend

- Node.js
- Express
- PostgreSQL (`pg`)
- JWT and bcrypt
- Multer image uploads
- Helmet, CORS, and Express rate limiting
- Node Cron for scheduled publishing
- Nodemailer for optional newsletter email delivery
- Node's built-in test runner

## Architecture

```text
React/Vite client
       |
       | HTTP + Bearer JWT
       v
Node.js/Express API
       |
       | parameterized SQL + migrations
       v
PostgreSQL (local or hosted, such as Neon)
```

The frontend never connects directly to PostgreSQL. It communicates with the Express API, and the API owns authentication, authorization, validation, database access, uploads, scheduled publishing, and email delivery.

## Repository structure

```text
Blog-App/
├── client/                 React/Vite frontend
│   └── src/
│       ├── Components/
│       ├── Context/
│       ├── Pages/
│       ├── api/
│       └── style.scss
├── api/                    Express/PostgreSQL backend
│   ├── controllers/
│   ├── middleware/
│   ├── migrations/
│   ├── routes/
│   ├── security/
│   ├── services/
│   ├── test/
│   ├── validation/
│   └── seed_sample.sql
└── README.md
```

## Local setup

### Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL, or a hosted PostgreSQL database such as Neon
- Optional Cloudinary account for cover-image uploads from the editor

### 1. Clone the repository

```bash
git clone https://github.com/ShantanuSutar/Blog-App.git
cd Blog-App
```

### 2. Install dependencies

```bash
cd api
npm install

cd ../client
npm install
```

### 3. Configure the API

Copy the API example environment file:

```bash
cd api
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

At minimum, configure these values in `api/.env`:

```dotenv
PORT=8800
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=replace-with-a-long-random-development-secret
ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:8800
```

For a local PostgreSQL installation, you may leave `DATABASE_URL` empty and configure the individual `POSTGRES_*` variables instead. See [`api/.env.example`](api/.env.example) for database pooling, rate limits, uploads, proxy settings, JWT expiration, logging, and optional SMTP configuration.

Never commit `api/.env`, database credentials, JWT secrets, or SMTP credentials.

### 4. Configure the frontend

Create `client/.env`:

```dotenv
VITE_BASE_URL=http://localhost:8800

# Required only for cover-image uploads through Cloudinary.
VITE_CLOUD_NAME=your-cloud-name
VITE_CLOUD_UPLOAD_PRESET=your-unsigned-upload-preset
```

The frontend environment file is ignored by Git and should not contain secret server-side credentials. Cloudinary upload presets used in a browser must be intentionally configured for unsigned client uploads.

### 5. Apply database migrations

```bash
cd api
npm run migrate
```

Migrations create and update the schema, indexes, integrity constraints, and PostgreSQL full-text search vector. They are tracked in `api/migrations` and run in filename order.

### 6. Seed realistic sample data (optional)

[`api/seed_sample.sql`](api/seed_sample.sql) creates a populated demo site with:

- 8 fictional users
- 24 published stories
- 3 drafts and 3 scheduled stories
- Comments, reactions, bookmarks, follows, activity, and subscribers

> **Warning:** The seed script permanently truncates all application tables in the connected database and restarts their IDs. Run it only against a disposable development database.

Run it with `psql` after setting `DATABASE_URL` in your shell:

```bash
cd api
psql "$DATABASE_URL" -f seed_sample.sql
```

PowerShell:

```powershell
cd api
psql $env:DATABASE_URL -f seed_sample.sql
```

You can also paste the script into the Neon SQL Editor when using a disposable Neon development database.

All seeded users share this development-only password:

```text
Password: DemoPass123!
```

Example usernames:

```text
maya_writes
arjun_codes
leena_roams
kabir_kitchen
```

Do not reuse the demo password for real accounts or production data.

### 7. Start the application

Run the API and frontend in separate terminals.

Terminal 1:

```bash
cd api
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:8800](http://localhost:8800), and its safe health check is available at [http://localhost:8800/health](http://localhost:8800/health).

Both development servers must remain running while using the application.

## Available scripts

### Frontend

Run from `client/`:

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint with zero warnings allowed
```

### Backend

Run from `api/`:

```bash
npm run dev            # Start the API with Nodemon
npm start              # Start the API with Node
npm run migrate        # Apply pending PostgreSQL migrations
npm test               # Run the backend test suite
npm run test:coverage  # Run tests with coverage reporting
```

## Testing

The backend suite exercises authentication, authorization and IDOR protection, posts, drafts, scheduling, comments, social features, search, pagination, uploads, validation, rate limiting, and production-readiness behavior.

```bash
cd api
npm test
```

Tests do not require manually starting the API. The test runner refuses to use the configured remote application database and instead requires an isolated test database/schema. See [`api/TESTING.md`](api/TESTING.md) and [`api/.env.test.example`](api/.env.test.example) for details.

Before committing frontend work:

```bash
cd client
npm run lint
npm run build
```

## Main API areas

The API is mounted under `/api` and includes routes for:

- `/api/auth` — registration, login, and logout
- `/api/posts` — feeds, search, featured posts, drafts, scheduling, and post management
- `/api/comments` — post comments
- `/api/reactions` — post and comment reactions
- `/api/bookmarks` — saved stories
- `/api/users` — profiles, profile editing, avatar uploads, and mention search
- `/api/follows` — follow relationships and follower/following lists
- `/api/activity` — global and user activity feeds
- `/api/newsletter` — subscription and unsubscribe flows
- `/api/upload` — authenticated image upload
- `/api/health` and `/health` — operational health checks

List endpoints use validated `page` and `limit` query parameters with bounded limits. Public post search supports category and tag filters while excluding drafts and scheduled unpublished content.

## Security notes

Current protections include:

- Password hashing with bcrypt
- Expiring HS256 JWT access tokens
- Parameterized PostgreSQL queries
- Server-side request validation and field allowlists
- Resource ownership checks for user-controlled content
- Rich-text sanitization without destroying supported editor formatting
- Helmet security headers and allowlisted CORS origins
- Global and endpoint-specific rate limits
- JSON and upload size limits
- Image signature, MIME type, extension, and pixel-dimension validation
- Centralized safe API errors and server-side logging

The browser currently stores the JWT in `localStorage` for compatibility with the existing client. For a larger production application, migrating authentication to secure, `HttpOnly`, `SameSite` cookies would reduce exposure to token theft through client-side script injection.

## Uploads and deployment

- The Write page currently uploads cover images through Cloudinary when its Vite variables are configured.
- Profile/avatar uploads use the API's local storage adapter during development.
- Local server files are not durable on most serverless platforms. Use persistent storage or add a cloud-backed storage adapter before relying on API-hosted uploads in production.
- The in-memory rate limiter is suitable for a personal/single-instance deployment. A shared store would be required if the API were scaled across multiple instances.
- Configure production CORS origins, proxy trust, PostgreSQL SSL, secrets, and email settings through environment variables.

## Project status

Unsaid is actively maintained as a personal learning and portfolio project. The application has a broad working feature set, responsive frontend, security-focused backend, database migrations, sample content, and automated backend coverage. It is not intended to be treated as a managed commercial service without additional operational monitoring, backups, shared rate-limit storage, and durable media storage.
