# Aida

Aida is primarily a Next.js + Vercel AI SDK app.

## Development

Install [nvm](https://github.com/nvm-sh/nvm), then run `nvm use` to install and use
the Node version from `.nvrmc`.

If you do not have `pnpm` installed run:

```sh
npm install -g pnpm@^10
```

Install dependencies:

```bash
pnpm install
```

Start postgres via the docker-compose file:

```bash
docker compose up postgres
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

In a separate terminal, run the scheduler. This is a simple script that calls the
`/api/priv/schedule-tick` endpoint every 10s. This is only required if you want to schedule tasks.

```bash
pnpm run dev-scheduler
```

## Run via Docker

```bash
docker compose up
```
