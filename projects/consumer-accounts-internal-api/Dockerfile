# Use Bun base image
FROM oven/bun:1.3.9-alpine

# Set working directory to monorepo root
WORKDIR /monorepo

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace package files
COPY projects/consumer-accounts-internal-api/package.json ./projects/consumer-accounts-internal-api/
COPY projects/consumer-accounts-internal-app/package.json ./projects/consumer-accounts-internal-app/

# Copy API source code (needed before install for workspace resolution)
COPY projects/consumer-accounts-internal-api ./projects/consumer-accounts-internal-api

# Install all dependencies (respects workspace)
RUN bun install --frozen-lockfile

# Set working directory to API project
WORKDIR /monorepo/projects/consumer-accounts-internal-api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["bun", "run", "start"]
