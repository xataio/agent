# Use Node.js 22 as the base image
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace configuration first
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy all package.json files from the monorepo
# This ensures all workspace packages are correctly identified
COPY apps/dbagent/package.json ./apps/dbagent/
COPY packages/components/package.json ./packages/components/
COPY packages/theme/package.json ./packages/theme/
COPY configs/eslint-config/package.json ./configs/eslint-config/
COPY configs/tsconfig/package.json ./configs/tsconfig/

# Now copy the source code of all workspace packages
COPY packages/ ./packages/
COPY configs/ ./configs/
COPY apps/dbagent/ ./apps/dbagent/

# Install dependencies
RUN pnpm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy all necessary files from deps stage
COPY --from=deps /app ./

# Create a public directory if it doesn't exist
RUN mkdir -p /app/apps/dbagent/public

# Build the Next.js application
WORKDIR /app/apps/dbagent
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the entire project structure to preserve module resolution
COPY --from=builder /app ./

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port the app will run on
EXPOSE 8080

# Set the working directory to the app
WORKDIR /app/apps/dbagent

# Configure NODE_PATH to help with module resolution 
ENV NODE_PATH=/app/node_modules

# Start both the scheduler and the Next.js application
CMD ["sh", "-c", "pnpm drizzle-kit migrate && (pnpm tsx scripts/scheduler.ts & pnpm next start --port $PORT)"] 