# Shared tsconfig

## Usage

In your `tsconfig.json`:

```json
{
  "extends": "@internal/tsconfig/base.json" // or "tsconfig/nextjs.json"
}
```

## Base

The base configuration is for a Node.js project.

## React

The React configuration extends the base configuration and adds support for React for library projects.

## Next.js

The Next.js configuration extends the React configuration and adds support for Next.js for web projects.
