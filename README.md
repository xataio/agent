<p align="center">
  <a href="https://github.com/xataio/agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-green" alt="License - Apache 2.0"></a>&nbsp;
  <a href="https://github.com/xataio/agent/actions?query=branch%3Amain"><img src="https://github.com/xataio/agent/actions/workflows/ci.yml/badge.svg" alt="CI Build"></a> &nbsp;
  <a href="https://xata.io/discord"><img src="https://img.shields.io/discord/996791218879086662?label=Discord" alt="Discord"></a> &nbsp;
  <a href="https://twitter.com/xata"><img src="https://img.shields.io/twitter/follow/xata?style=flat" alt="X Follow" /> </a>
</p>

# Xata Agent, your AI expert in PostgreSQL

Xata Agent is an open source agent that monitors your database, find root causes of issues, and suggest fixes and improvements. It's like having a new SRE hire in your team, one with extensive experience in Postgres.

Letting the agent introduce itself:

> Hire me as your AI PostgreSQL expert. I can:
>
> - watch logs & metrics for potential issues.
> - proactively suggest configuration tuning for your database instance.
> - troubleshoot performance issues and make indexing suggestions.
> - troubleshoot common issues like high CPU, high memory usage, high connection count, etc.
> - and help you vacuum (your Postgres DB, not your room).
>
> More about me:
>
> - I am open source and extensible.
> - I can monitor logs & metrics from RDS & Aurora via Cloudwatch.
> - I use preset SQL commands. I will never run destructive (even potentially destructive) commands against your database.
> - I use a set of tools and playbooks to guide me and avoid hallucinations.
> - I can run troubleshooting statements, like looking into pg_stat_statements, pg_locks, etc. to discover the source of a problem.
> - I can notify you via Slack if something is wrong.
> - I support multiple models from OpenAI, Anthropic, and Deepseek.
>
> Past experience:
>
> - I have been helping the Xata team monitor and operate over 35K active Postgres databases.

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
