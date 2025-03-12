# Aida, your AI expert in PostgreSQL

Hire me (for free, I'm open source) as your agentic AI PostgreSQL expert. I can:

- watch logs & metrics for potential issues
- proactively suggest configuration tuning for your database instance
- troubleshoot performance issues
- make indexing suggestions
- and help you vacuum (your Postgres DB, not your room).

It's like having a new SRE hire in your team, one with extensive experience in Postgres.

More about me:

- I am open source and extensible.
- I can monitor logs & metrics from RDS & Aurora via Cloudwatch.
- I use preset SQL commands. I will never run destructive (even potentially destructive) commands against your database.
- In addition to LLMs, I use a set of tools and playbooks to avoid hallucinations and bad advice.
- I can run troubleshooting statements, like looking into pg_stat_statements, pg_locks, etc. to discover the source of a problem.
- I can walk you through complex schema migrations using pgroll.
- I can notify you via Slack if something is wrong.
- I support multiple models from OpenAI, Anthropic, and Deepseek.

## Installation / self-hosted

Edit the `.env.production` file in the root of the project. You need to set the `PUBLIC_URL` and the
API key for at least one LLM provider. At the moment, I recommend using OpenAI.

Start a local instance via docker compose:

```bash
docker compose up
```

Open the app at `http://localhost:8080` (or the public URL you set in the `.env.production` file) and follow the onboarding steps.

## Development

Go to the `apps/dbagent` directory and follow the instructions in the [README](./apps/dbagent/README.md).
