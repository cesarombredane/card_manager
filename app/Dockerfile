FROM node:22-alpine

ENV NODE_ENV=development
ENV PORT=3000

WORKDIR /usr/src/app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci

COPY backend ./backend
COPY frontend ./frontend

EXPOSE 3000 5173

CMD ["npm", "run", "dev"]
