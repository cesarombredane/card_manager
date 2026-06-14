FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci

FROM dependencies AS build

COPY backend ./backend
COPY frontend ./frontend

RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci --omit=dev --workspace backend \
  && npm cache clean --force

COPY backend ./backend
COPY --from=build /usr/src/app/frontend/dist ./frontend/dist

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "backend"]
