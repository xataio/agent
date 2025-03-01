# Aida

Aida is primarily a Next.js + Verceal AI SDK app.

## Development

Install [nvm](https://github.com/nvm-sh/nvm), then run `nvm use` to install and use
the Node version from `.nvrmc`.

If you do not have `pnpm` installed run:

```sh
npm install -g pnpm@^9
```

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
