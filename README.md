# Athani Mart Backend

This is the backend API for Athani Mart, built with Node.js, Express, TypeScript, and Prisma ORM.

## Features
- User registration and login with JWT authentication
- Input validation with Zod
- Password hashing with bcrypt
- PostgreSQL database via Prisma ORM
- Modular, production-ready structure

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Set up your environment variables:**
   - Copy `.env` and set your `DATABASE_URL` and `JWT_SECRET`.
3. **Run Prisma migrations:**
   ```sh
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. **Start the development server:**
   ```sh
   npm run dev
   ```

## API Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login and get JWT token

## Project Structure

- `src/controllers/` — Request handlers
- `src/routes/` — API routes
- `src/models/` — Database models (via Prisma)
- `src/services/` — Business logic
- `src/middlewares/` — Auth, error handling
- `src/config/` — Prisma client config

## Testing

- To be implemented: Jest tests for controllers/services.

---

For more, see the code comments in each file.
