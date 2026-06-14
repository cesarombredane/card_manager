# App

This folder contains the web application pod structure:

- `backend`: Node.js and Express API.
- `frontend`: Vue 3 frontend powered by Vite.

## Local development

Install dependencies from this folder:

```sh
npm install
```

Run the API and frontend dev servers:

```sh
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on `http://localhost:3000`.

## Production-style run

Build the frontend:

```sh
npm run build
```

Start the Express server:

```sh
npm start
```

When `frontend/dist` exists, the backend serves it as static files.
