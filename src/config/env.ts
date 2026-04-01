import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
  SQLITE_DB_PATH: z.string().default('sync_state.db'),
  SPLITWISE_API_KEY: z.string().optional(),
  BUDGETBAKERS_EMAIL: z.string().optional(),
  BUDGETBAKERS_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);
