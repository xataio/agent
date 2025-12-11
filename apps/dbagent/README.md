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

See [LLM Configuration](#llm-configuration) for details on supported providers.

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

## LLM Configuration

Xata Agent supports multiple LLM providers. Configure at least one in your `.env.local` file.

### Cloud Providers

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_GENERATIVE_AI_API_KEY=...

# DeepSeek
DEEPSEEK_API_KEY=...
```

### Local / Self-hosted LLMs

#### Ollama

```bash
OLLAMA_HOST=http://localhost:11434
```

#### OpenAI-compatible endpoints (vLLM, LM Studio, text-generation-inference, etc.)

For OpenAI-compatible servers, use `OPENAI_BASE_URL`. Model discovery behavior:

| OPENAI_API_KEY    | OPENAI_BASE_URL | OPENAI_MODEL | Behavior                                     |
| ----------------- | --------------- | ------------ | -------------------------------------------- |
| Set (real key)    | Any             | Any          | Uses hardcoded OpenAI models                 |
| Not set or `dumb` | Set             | Set          | Uses only the specified model                |
| Not set or `dumb` | Set             | Not set      | Fetches models dynamically from `/v1/models` |

**Example: vLLM with explicit model**

```bash
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_MODEL=meta-llama/Llama-3.1-70B-Instruct
```

**Example: vLLM with dynamic model discovery**

```bash
OPENAI_BASE_URL=http://localhost:8000/v1
# Models are fetched automatically from the server
```

**Example: LM Studio**

```bash
OPENAI_BASE_URL=http://localhost:1234/v1
OPENAI_MODEL=local-model
```

### LiteLLM Proxy

For unified access to multiple providers via LiteLLM:

```bash
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=sk-...
```
