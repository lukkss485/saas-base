import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) => pool.query<T>(text, params);