# DB Agent

## Running locally

Install [nvm](https://github.com/nvm-sh/nvm), then run `nvm use` to install and use
the Node version from `.nvrmc`.

If you do not have `pnpm` installed run:

```sh
npm install -g pnpm@^9
```

Then install the dependencies:

```bash
pnpm install
```

Each project in `./apps` requires a `.env` file.

To run all the apps run:

```bash
pnpm run dev
```
