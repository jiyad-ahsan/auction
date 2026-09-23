// Finalises lots whose end time has passed. Run every minute (cron, pg_cron or a
// Vercel cron hitting /api/cron/close-lots).
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString: url });
client
  .connect()
  .then(() => client.query<{ n: number }>("select close_due_lots() as n"))
  .then((r) => console.log(`closed ${r.rows[0].n} lot(s)`))
  .finally(() => client.end());
