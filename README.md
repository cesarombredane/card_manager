# Pokemon Card Manager

A small web app foundation for creating and managing a Pokemon card collection.

## Stack

- Vue 3 + Vite frontend
- Express backend
- Lightweight local JSON database
- Image storage as base64 records inside the database file
- CSV import/export endpoints

## Getting Started

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the backend on `http://localhost:3000`.

## API Basics

- `GET /api/health`
- `GET /api/cards`
- `POST /api/cards` with `multipart/form-data`
- `PUT /api/cards/:id` with `multipart/form-data`
- `DELETE /api/cards/:id`
- `GET /api/cards/:id/image`
- `GET /api/cards/export.csv`
- `POST /api/cards/import.csv` with a `file` field
