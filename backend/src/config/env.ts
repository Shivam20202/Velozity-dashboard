import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({DATABASE_URL:z.string().min(1),PORT:z.coerce.number().default(4000),FRONTEND_URL:z.string().default('http://localhost:5173'),JWT_ACCESS_SECRET:z.string().min(32),JWT_REFRESH_SECRET:z.string().min(32),ACCESS_TOKEN_TTL:z.string().default('15m'),REFRESH_TOKEN_DAYS:z.coerce.number().default(7),NODE_ENV:z.enum(['development','test','production']).default('development')});
export const env=schema.parse(process.env);
