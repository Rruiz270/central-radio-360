import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __c360sql: ReturnType<typeof postgres> | undefined;
}

// Novo formato de host Neon (.c-N.) quebra o driver serverless — usar postgres com prepare:false
export const sql =
  globalThis.__c360sql ??
  postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== 'production') globalThis.__c360sql = sql;
