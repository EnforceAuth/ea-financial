# Build stage - build in monorepo context
FROM oven/bun:1.2-alpine AS build

# Set working directory to monorepo root
WORKDIR /monorepo

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace package files
COPY projects/consumer-accounts-internal-app/package.json ./projects/consumer-accounts-internal-app/
COPY projects/consumer-accounts-internal-api/package.json ./projects/consumer-accounts-internal-api/

# Copy app source code (needed before install for workspace resolution)
COPY projects/consumer-accounts-internal-app ./projects/consumer-accounts-internal-app

# Install all dependencies (respects workspace)
RUN bun install --frozen-lockfile

# Build the application in workspace context
WORKDIR /monorepo/projects/consumer-accounts-internal-app
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /monorepo/projects/consumer-accounts-internal-app/dist /usr/share/nginx/html

# Copy nginx configuration from build stage
COPY --from=build /monorepo/projects/consumer-accounts-internal-app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
