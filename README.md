# 6b-me

A beginner-friendly Express + MongoDB authentication API with:

- user registration and login
- JWT-based protected route (`/users/me`)
- password hashing with Argon2
- request logging (optional SolarWinds forwarding)
- centralized error handling

This README is written so students can implement almost the same project from scratch.

## 1. Tech Stack

- Node.js (ES modules)
- Express 5
- MongoDB + Mongoose
- Argon2 (password hashing)
- JSON Web Token (`jsonwebtoken`)
- `http-errors` + `http-status-codes`
- Axios (for optional SolarWinds log shipping)
- `pnpm` + `nodemon`

## 2. Folder Structure

```text
config/
  db.js
  solarwinds.js
controllers/
  auth.controller.js
middleware/
  auth.middleware.js
  error.middleware.js
  logger.middleware.js
models/
  user.model.js
routes/
  auth.routes.js
utils/
  jwt.js
index.js
```

## 3. Installation and Run

1. Install dependencies.

```bash
pnpm install
```

2. Create `.env` in the project root.

```env
PORT=3000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=1d
SOLARWINDS_TOKEN=optional
```

3. Start development server.

```bash
pnpm dev
```

4. For production mode.

```bash
pnpm start
```

## 4. How the App Boots (`index.js`)

Startup flow:

1. Load environment variables (`dotenv.config()`).
2. Connect to MongoDB (`connectDB()`).
3. Register middlewares (`cors()`, `express.json()`, `loggerMiddleware`).
4. Mount auth routes at `/users`.
5. Add health/base route `/`.
6. Register `errorMiddleware` as the last middleware.
7. Listen on `PORT` (default `3000`).

Why error middleware is last:

- Express forwards thrown errors to the next error handler.
- If placed earlier, it will not catch errors from later route handlers.

## 5. Database Layer

### `config/db.js`

- Reads `MONGO_URI` from `.env`.
- Throws a clear error if missing.
- Connects with `mongoose.connect(uri)`.

### `models/user.model.js`

User schema fields:

- `fullName`: required, trimmed string
- `email`: required, unique, lowercased, trimmed, regex validated
- `password`: required, minimum length 6

Custom validation messages included:

- `"Full name is required"`
- `"Email is required"`
- `"Please provide a valid email address"`
- `"Password is required"`
- `"Password must be at least 6 characters long"`

Security behavior:

- `pre("save")` hook hashes password using Argon2.
- Hashing runs only when password is modified.
- `comparePassword(candidatePassword)` verifies login password.

## 6. JWT Utilities

### `utils/jwt.js`

- `getJwtSecret()` ensures `JWT_SECRET` exists.
- `getJwtSecret()` throws a descriptive error if missing.
- `generateToken(userId)` signs payload `{ userId }`.
- `generateToken(userId)` uses `JWT_EXPIRES_IN` (default `1d`).

## 7. Middlewares

### `middleware/auth.middleware.js`

- Expects header format: `Authorization: Bearer <token>`
- Verifies token with `jwt.verify`
- Stores decoded payload in `req.user`
- Returns `401 Unauthorized` with `"Unauthorized"` when header/token missing.
- Returns `401 Unauthorized` with `"Invalid or expired token"` when verification fails.

### `middleware/logger.middleware.js`

- Tracks request start and finish time.
- Creates a structured log object after response is sent.
- Calls `sendToSolarWinds(logEntry)`.

### `middleware/error.middleware.js`

- Central error formatter.
- Uses `err.statusCode` or `err.status` when available.
- Falls back to `500 Internal Server Error`.
- Returns JSON:

```json
{
  "success": false,
  "message": "..."
}
```

- Includes stack trace only when `NODE_ENV=development`.

## 8. Optional Log Shipping

### `config/solarwinds.js`

- If `SOLARWINDS_TOKEN` is not set, it silently skips sending logs.
- If token exists, it POSTs logs to SolarWinds collector API.
- Errors are printed in console but do not break API responses.

This keeps observability optional for classroom/local setups.

## 9. Routes and Controllers

### `routes/auth.routes.js`

- `POST /users/register` -> `registerUser`
- `POST /users/login` -> `loginUser`
- `GET /users/me` -> `authMiddleware` -> `getCurrentUser`

### `controllers/auth.controller.js`

#### `registerUser`

- Reads `fullName`, `email`, `password` from request body.
- Creates user with `User.create(...)`.
- Returns `201 Created` and safe user fields (no password).

#### `loginUser`

- Finds user by email.
- Validates password via `comparePassword`.
- Throws `401` (`"Invalid email or password"`) on failure.
- Returns token and user basics on success.

#### `getCurrentUser`

- Uses `req.user.userId` from auth middleware.
- Fetches user and excludes password via `.select("-password")`.
- Throws `404` if user no longer exists.

## 10. API Contract

### Base URL

`http://localhost:3000`

### `POST /users/register`

Request:

```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "strongPassword123"
}
```

Success (`201`):

```json
{
  "message": "User registered successfully",
  "data": {
    "id": "...",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "..."
  }
}
```

### `POST /users/login`

Request:

```json
{
  "email": "jane@example.com",
  "password": "strongPassword123"
}
```

Success (`200`):

```json
{
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "id": "...",
    "fullName": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### `GET /users/me`

Header:

```http
Authorization: Bearer <jwt>
```

Success (`200`):

```json
{
  "message": "User fetched successfully",
  "data": {
    "_id": "...",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## 11. Common Errors Students Should Expect

- Validation failure while registering:
- by default this codebase returns an error via `errorMiddleware` (typically `500` unless status is set), and the message includes Mongoose validation text.
- Wrong login credentials:
- `401` with `"Invalid email or password"`.
- Missing or invalid token:
- `401` with `"Unauthorized"` or `"Invalid or expired token"`.
- Missing `JWT_SECRET` or `MONGO_URI`:
- startup/runtime error with clear message in console.

## 12. Quick Manual Testing (cURL)

Register:

```bash
curl -X POST http://localhost:3000/users/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Doe","email":"jane@example.com","password":"strongPassword123"}'
```

Login:

```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"strongPassword123"}'
```

Get current user (replace `<TOKEN>`):

```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer <TOKEN>"
```

## 13. Build This Yourself (Suggested Order)

1. Setup Express app and folder structure.
2. Add Mongo connection helper (`config/db.js`).
3. Create user model with validation + Argon2 hooks.
4. Add JWT utility functions.
5. Implement register and login controllers.
6. Add auth middleware and `/users/me` route.
7. Add error middleware and use `http-errors` for consistency.
8. Add logger middleware and optional SolarWinds forwarding.
9. Test all endpoints with Postman or cURL.

## Notes

- `accountNumber` has been removed from model and auth responses.
- Use `pnpm` for consistency with this project.
