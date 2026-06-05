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

Each eval writes replay artifacts under the configured `EVAL_FOLDER`:

- `human.txt`: readable prompt, answer, and tool-result transcript
- `replay.json`: structured replay manifest with model metadata, prompts, tool calls, tool results, and failure diagnostics
- `response.json`: raw Vercel AI SDK response for deep debugging
- `evalResult.json`: pass/fail result for the case

The test-run folder also includes `evalResults.csv`. In addition to pass/fail and UI links, the CSV includes diagnostic columns for:

- `classifications`: high-level failure categories such as `missing-expected-tool`, `unexpected-tool-call`, `tool-error`, `no-tool-result`, `malformed-request`, or `empty-final-answer`
- `expected_tools`, `observed_tools`, `missing_expected_tools`, and `unexpected_tools`

This makes model/provider regressions easier to triage without opening every raw trace. For example, when a tool-choice eval fails, first filter `evalResults.csv` by `missing-expected-tool` or `unexpected-tool-call`, then open the linked eval UI and inspect `replay.json` to see the exact prompt, model, tool-call sequence, arguments, and result/error previews.
