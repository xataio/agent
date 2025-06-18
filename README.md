<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand-kit/banner/xata-agent-banner-github-dark-mode@2x.png">
    <source media="(prefers-color-scheme: light)" srcset="brand-kit/banner/xata-agent-banner-github-light-mode@2x.png">
    <img alt="Xata logo" src="brand-kit/banner/xata-agent-banner-github@2x.png">
  </picture>
</div>

<p align="center">
  <a href="https://github.com/xataio/agent/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-green" alt="License - Apache 2.0"></a>&nbsp;
  <a href="https://github.com/xataio/agent/actions?query=branch%3Amain"><img src="https://github.com/xataio/agent/actions/workflows/ci.yml/badge.svg" alt="CI Build"></a> &nbsp;
  <a href="https://xata.io/discord"><img src="https://img.shields.io/discord/996791218879086662?label=Discord" alt="Discord"></a> &nbsp;
  <a href="https://twitter.com/xata"><img src="https://img.shields.io/twitter/follow/xata?style=flat" alt="X Follow" /> </a>
</p>

# Xata Agent, your AI expert in PostgreSQL

Xata Agent is an open source agent that monitors your database, finds root causes of issues, and suggests fixes and improvements. It's like having a new SRE hire in your team, one with extensive experience in Postgres.

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
> - I have been helping the Xata team monitor and operate tons of active Postgres databases.

## Demo

Here is an under 4 minutes walkthrough of the agent in action:

https://github.com/user-attachments/assets/cdd2da8f-2d9d-4794-ada5-da161a8861fd

A youtube version of the demo is available [here](https://youtu.be/SLVRdihoRwI).

## Installation / self-hosted

We provide docker images for the agent itself. The only other dependency is a Postgres database in which the agent will store its configuration, state, and history.

We provide a docker-compose file to start the agent and the Postgres database.

Edit the `.env.production` file in the root of the project. You need to set the `PUBLIC_URL` and the API key for at least OpenAI.

Start a local instance via docker compose:

```bash
docker compose up
```

Open the app at `http://localhost:8080` (or the public URL you set in the `.env.production` file) and follow the onboarding steps.

We have a more detailed [guide](https://github.com/xataio/agent/wiki/Xata-Agent-%E2%80%90-Deploy-on-EC2) on how to deploy via docker-compose on an EC2 instance.

For authentication, you can use your own OAuth provider.

## Development

Go to the `apps/dbagent` directory and follow the instructions in the [README](./apps/dbagent/README.md).

## Extensibility

The agent can be extended via the following mechanisms:

- **Tools**: These are functions that the agent can call to get information about the database. They are written in TypeScript, see this [file](https://github.com/xataio/agent/blob/main/apps/dbagent/src/lib/ai/tools/db.ts/#L47) for their description.
- **Playbooks**: These are sequences of steps that the agent can follow to troubleshoot an issue. They are simply written in english. The pre-defined playbooks are [here](https://github.com/xataio/agent/blob/main/apps/dbagent/src/lib/tools/playbooks.ts).
- **Integrations**: For example, the AWS and Slack integrations. They contain configuration and UI widgets.

## Status / Roadmap

While it's still early days, we are using the agent ourself in our day-to-day operations work at Xata.

- Playbooks:
  - [x] general monitoring
  - [x] tune settings
  - [x] investigate slow queries
  - [x] investigate high CPU
  - [x] investigate high memory
  - [x] investigate high connection count
  - [ ] investigate locks
  - [ ] investigate vacuuming
  - [x] Support for custom playbooks
  - Other playbooks (please let us know)
- MCP integrations:
  - [ ] Act as an MCP server for other agents
  - [ ] Call the tools over the network via MCP
- Support for more cloud providers:
  - [x] AWS RDS
  - [x] AWS Aurora
  - [x] Google Cloud SQL
  - [ ] Azure Database for PostgreSQL
  - [ ] Digital Ocean Managed Databases
  - [ ] Other (please let us know)
- Notifications & integrations:
  - [x] Simple Slack integration
  - [ ] Slack integration as an AI agent (https://github.com/xataio/agent/pull/29)
  - [ ] Discord integration
  - [ ] Other (please let us know)
- Eval & testing:
  - [x] Add eval testing for the interaction with LLMs
- Approval workflow:
  - [ ] Add an approval workflow for the agent to run potentially dangerous statements
  - [ ] Allow configuration of the tools that can be defined per monitoring schedule

While the Agent is by its nature primarily an open-source project that you self-host, we are also working on a cloud version. The advantage of the cloud version is that some integrations are easier to install. If you are interested in the cloud version, please [sign up on the waitlist here](https://tally.so/r/wgvkgM).
