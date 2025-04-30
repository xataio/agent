# Xata Agent

The Xata Agent is primarily a Next.js + Vercel AI SDK app.

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

create the `.env.local` file and edit it to add the LLM credentials:

```bash
cp .env.example .env.local
vim .env.local
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

## Run via Docker compose

Create the `.env.local` file and edit it to add the LLM credentials:

```bash
cp .env.example .env.local
vim .env.local
```

Run the app:

```bash
docker compose up
```

## Run the evals

Create the `.env.eval` file and edit it to add the LLM credentials:

```bash
cp .env.eval.example .env.eval
vim .env.eval
```

Update you `.env.local` file to contain: `EVAL=true`

Ensure you have docker installed and run: `pnpm run eval`
