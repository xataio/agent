# Maki AI DBA for PostgreSQL

Hire me (for free, I'm open source) as your agentic AI DBA. I can:

- watch logs & metrics for potential issues
- proactively suggest configuration tuning and extensions for better maintenance
- troubleshoot performance issue
- make indexing suggestion
- (constructively) critique your database schema
- help you perform safe schema changes
- and help you vacuum (your Postgres DB, not your room).

More about me:

- I am open source and extensible.
- You can chat with me via web chat or via Slack, just tell me what you need.
- I use a combination of LLM and preset commands to avoid hallucinations and bad advice.
- I will never run destructive (even potentially destructive) commands against your database.
- I can run troubleshooting statements, like looking into pg_stat_statements, pg_locks, etc. to discover the source of a problem.
- I can monitor logs & metrics from RDS & Aurora via Cloudwatch.
- In the future, I’ll be able to work with the [maki.tech](http://maki.tech) service to test any changes in a developer branch (which has the production data, potentially anonymized).
- I can walk you through complex schema migrations using pgroll.

## Development

Install dependencies:

```bash
pnpm install
```

Start postgres via the docker-compose file:

```bash
docker compose up
```

add it in `.env.local`:

```bash
DATABASE_URL=postgresql://dbagent:changeme@localhost:5432/dbagent
```

Initialize the database:

```bash
pnpm run db:migrate
```

Run the app:

```bash
pnpm run dev
```

In a separate terminal, run the scheduler:

```bash
pnpm run dev-scheduler
```
