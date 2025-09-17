# Use the official EOPA image
FROM ghcr.io/open-policy-agent/eopa:latest

# Set working directory
WORKDIR /app

# Copy policies and data from infra/opa directory
COPY infra/opa/policies/ /app/policies/
COPY infra/opa/data/ /app/data/
COPY infra/opa/config/ /app/config/

# Note: logs directory will be created by Kubernetes volume mounts

# Expose OPA port
EXPOSE 8181

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8181/health || exit 1

# Start OPA server with policies and data
CMD ["run", "--server", \
    "--addr=0.0.0.0:8181", \
    "--config-file=/app/config/opa-config.yaml", \
    "--log-level=info", \
    "--log-format=json", \
    "/app/policies", \
    "/app/data"]
