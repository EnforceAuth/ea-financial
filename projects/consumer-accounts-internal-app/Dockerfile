# Build stage
FROM oven/bun:1.2-alpine AS build

# Set working directory
WORKDIR /app

# Copy package file and install dependencies
COPY projects/consumer-accounts-internal-app/package.json ./
RUN bun install

# Copy source code
COPY projects/consumer-accounts-internal-app/src ./src
COPY projects/consumer-accounts-internal-app/index.html ./
COPY projects/consumer-accounts-internal-app/vite.config.ts ./
COPY projects/consumer-accounts-internal-app/tsconfig.json ./
COPY projects/consumer-accounts-internal-app/tsconfig.node.json ./

# Copy nginx configuration
COPY projects/consumer-accounts-internal-app/nginx.conf ./

# Build the application
RUN bunx vite build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
