# Aida, your AI expert in PostgreSQL

Hire me (for free, I'm open source) as your agentic AI DBA. I can:

- watch logs & metrics for potential issues
- proactively suggest configuration tuning for your database instance
- troubleshoot performance issues
- make indexing suggestions
- and help you vacuum (your Postgres DB, not your room).

More about me:

- I am open source and extensible.
- I can monitor logs & metrics from RDS & Aurora via Cloudwatch.
- I use preset SQL commands. I will never run destructive (even potentially destructive) commands against your database.
- In addition to LLMs, I use a set of tools and playbooks to avoid hallucinations and bad advice.
- I can run troubleshooting statements, like looking into pg_stat_statements, pg_locks, etc. to discover the source of a problem.
- I can walk you through complex schema migrations using pgroll.
- I can notify you via Slack if something is wrong.
- I support multiple models from OpenAI, Anthropic, and Deepseek.

## Development

Go to the `apps/dbagent` directory and follow the instructions in the [README](./apps/dbagent/README.md).
