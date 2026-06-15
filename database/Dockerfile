FROM postgres:16-alpine

ENV POSTGRES_DB=card_manager
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

RUN apk add --no-cache python3 py3-psycopg2

COPY context /app/context
COPY context/init /docker-entrypoint-initdb.d

RUN chmod +x /docker-entrypoint-initdb.d/20-import-csv.sh

EXPOSE 5432

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1
