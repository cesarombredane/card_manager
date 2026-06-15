import dotenv from 'dotenv';

dotenv.config();

export type AppConfig = {
  env: string;
  port: number;
  databaseUrl: string;
};

export const config: AppConfig = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@database:5432/card_manager'
};
