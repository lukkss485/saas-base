import pg from "pg";

const client = new pg.Client({
  connectionString: "postgres://saas:saas@127.0.0.1:5432/saas",
  connectionTimeoutMillis: 3000,
  query_timeout: 3000,
});

try {
  await client.connect();
  const result = await client.query(
    "SELECT current_database() AS banco, current_setting('server_encoding') AS servidor, current_setting('client_encoding') AS cliente"
  );
  console.log(JSON.stringify(result.rows, null, 2));
} catch (error) {
  console.error("DIAGNÓSTICO:", error.message);
} finally {
  await client.end().catch(() => {});
}
