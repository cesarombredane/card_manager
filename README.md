# Pokemon Card Manager

A small web app foundation for creating and managing a Pokemon card collection.

## Stack

- Vue 3 + Vite frontend
- Express backend
- PostgreSQL database
- Versioned SQL migrations in `server/migrations`
- Image storage in PostgreSQL `BYTEA` columns
- CSV import/export endpoints

## Getting Started

The app is started through Minikube and DevSpace. DevSpace builds the app image, deploys the app and Postgres Kubernetes resources from `k8s/`, syncs local code changes into the app pod, streams logs, and forwards the dev site to `http://localhost:5173`.

```bash
minikube start -p card-manager
devspace dev
```

During `devspace dev`, changes in `client/` are handled by Vite hot reload and changes in `server/` are picked up by Node watch mode inside the pod. API traffic from the Vite dev server is proxied to the backend in the same pod.

For a non-interactive deploy:

```bash
devspace deploy
```

## Runtime

The app runs as two Kubernetes workloads:

- `card-manager-app`: Express serves the API and the built Vue frontend.
- `postgres`: PostgreSQL stores application data in a persistent volume.

The app reads `DATABASE_URL` from the Kubernetes `postgres-secret` manifest.

Migrations run automatically when the backend starts. To change the schema later without losing existing data, add a new numbered SQL file in `server/migrations` such as `002_add_price_to_collected_cards.sql`; do not edit old migrations after they have been applied.

## Database Shape

- `series`: expansion era/group names such as Mega Evolution.
- `card_sets`: sets linked to one series, with language and optional image.
- `modifiers`: enum-like lookup rows such as Normal, 1st Edition, Reverse, and Promo.
- `pokemon`: featured Pokemon with name, Pokedex ID, and optional image.
- `cards`: theoretical cards with name, set, number, modifier, featured Pokemon, and optional image.
- `collected_cards`: real owned cards linked to `cards`, with condition, note, and optional owned-card image.

`modifiers` is intentionally a table instead of a PostgreSQL enum type. It works like an enum for the app, but adding new modifier values later is safer and does not require rewriting an enum type.

If you have data in the old JSON file, import it after Postgres is running:

```bash
kubectl -n card-manager exec deploy/card-manager-app -- npm run import:json -w server
```

## API Basics

- `GET /api/health`
- `GET /api/cards`
- `GET /api/cards?setId=1&name=pika&cardId=2&pokemonId=25`
- `POST /api/cards` with `multipart/form-data`
- `GET /api/cards/:id/image`
- `GET /api/collection`
- `POST /api/collection` with `multipart/form-data`
- `PUT /api/collection/:id` with `multipart/form-data`
- `DELETE /api/collection/:id`
- `GET /api/collection/:id/image`
- `GET /api/series`
- `POST /api/series` with `multipart/form-data`
- `GET /api/series/:id/image`
- `GET /api/sets`
- `GET /api/sets?seriesId=1&name=base`
- `POST /api/sets` with `multipart/form-data`
- `GET /api/sets/:id/image`
- `GET /api/modifiers`
- `GET /api/pokemon`
- `POST /api/pokemon` with `multipart/form-data`
- `GET /api/pokemon/:id/image`
- `GET /api/cards/export.csv`
- `POST /api/cards/import.csv` with a `file` field
- `GET /api/collection/export.csv`
- `POST /api/collection/import.csv` with a `file` field
