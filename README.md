# Dad's Clothing Store

A MERN-stack e-commerce site (MongoDB, Express, React, Node.js) using Vite for the frontend and Cloudinary for image hosting.

## Project layout

```
.
├── client/   # Vite + React frontend (JS)
└── server/   # Express + Mongoose backend (ES modules)
```

## First-time setup

1. **Backend**
   ```bash
   cd server
   cp .env.example .env        # fill in MONGO_URI, JWT_SECRET, CLOUDINARY_* keys
   npm run dev
   ```
   Server runs on `http://localhost:5174`. Health check: `GET /api/health`.

2. **Frontend** (in a second terminal)
   ```bash
   cd client
   cp .env.example .env
   npm run dev
   ```
   App runs on `http://localhost:5173` and calls the API at `VITE_API_URL`.

## Required external accounts

- **MongoDB** — install locally, or use [MongoDB Atlas](https://www.mongodb.com/atlas) for a free cloud DB.
- **Cloudinary** — sign up at [cloudinary.com](https://cloudinary.com); grab `cloud_name`, `api_key`, `api_secret` from the dashboard.
