# AI Group Chat

Small repo combining a Vite React frontend and an Express/Mongo server for multi-AI group chat (Claude, ChatGPT, Gemini). This README gives a quick start to run the project locally.

## Quick start

Prerequisites
- Node.js 18+ and npm
- MongoDB running locally or a MongoDB connection string

Install dependencies

```bash
npm install
```

Run in development (frontend + backend)

```bash
npm run start
```

Run frontend only

```bash
npm run dev
```

Run backend only

```bash
npm run server
```

Build production frontend

```bash
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env` and fill in values (MongoDB URI, JWT secret, Stripe keys, OpenAI keys, etc.).

## Project layout

- `src/` — React frontend (Vite)
- `public/` — Static files
- `server/` — Express server and API routes

## Contributing

Open an issue or pull request. Please follow common GitHub flow and add tests for new behavior where applicable.

## License

This repository is unlicensed. Add a `LICENSE` file (for example, MIT) if you want to permit reuse.
