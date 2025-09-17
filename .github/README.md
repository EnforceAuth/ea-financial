# EA Financial CI/CD Pipeline Documentation

This document describes the consolidated CI/CD pipeline setup for the EA Financial repository, including shared actions, environment variables, and best practices.

## Overview

The CI/CD pipeline has been optimized to reduce duplication, improve maintainability, and ensure consistency across all workflows. This is achieved through:

1. **Shared Actions**: Reusable composite actions for common tasks
2. **Environment Consolidation**: Centralized configuration for versions and settings
3. **Workflow Optimization**: Streamlined workflows using shared components

## Shared Actions

### 1. Setup Environment (`/.github/actions/setup-environment`)

Sets up the development environment with Bun, Node.js, and dependencies.

**Usage:**
```yaml
- name: Setup Environment
  uses: ./.github/actions/setup-environment
  with:
    bun-version: '1.2.22'          # Optional, defaults to 1.2.22
    node-version: '24'             # Optional, defaults to 24
    install-dependencies: 'true'   # Optional, defaults to true
    working-directory: '.'         # Optional, defaults to current directory
```

**Features:**
- Installs and configures Bun and Node.js
- Enables corepack for package manager compatibility
- Caches dependencies for faster builds
- Sets common environment variables (NODE_VERSION, BUN_VERSION, REGISTRY, IMAGE_NAME)

### 2. Setup Infrastructure (`/.github/actions/setup-infrastructure`)

Configures Docker, kubectl, Helm, and other infrastructure tools.

**Usage:**
```yaml
- name: Setup Infrastructure
  uses: ./.github/actions/setup-infrastructure
  with:
    docker-buildx: 'true'           # Optional, defaults to true
    kubectl-version: 'v1.28.0'     # Optional, defaults to v1.28.0
    helm-version: '3.12.0'         # Optional, defaults to 3.12.0
    setup-aws: 'true'              # Optional, defaults to false
    aws-region: 'us-east-1'        # Optional, defaults to us-east-1
    registry-username: ${{ github.actor }}
    registry-password: ${{ secrets.GITHUB_TOKEN }}
```

**Features:**
- Sets up Docker Buildx for multi-platform builds
- Installs kubectl and Helm at specified versions
- Configures AWS credentials when needed
- Logs into container registries
- Installs additional tools (cosign, OPA CLI)

### 3. Setup Services (`/.github/actions/setup-services`)

Starts test databases and external services using Docker.

**Usage:**
```yaml
- name: Setup Test Services
  uses: ./.github/actions/setup-services
  with:
    postgres-version: '15'         # Optional, defaults to 15
    redis-version: '7-alpine'      # Optional, defaults to 7-alpine
    setup-opa: 'true'             # Optional, defaults to false
    wait-for-services: 'true'     # Optional, defaults to true
    service-timeout: '60'         # Optional, defaults to 60 seconds
```

**Features:**
- Starts PostgreSQL and Redis containers
- Optionally starts OPA server with policies
- Waits for services to be ready with health checks
- Sets environment variables for service URLs
- Creates test database schemas

### 4. Build and Push (`/.github/actions/build-and-push`)

Builds and pushes container images with consistent tagging and security scanning.

**Usage:**
```yaml
- name: Build and Push Image
  uses: ./.github/actions/build-and-push
  with:
    context: './projects/api'              # Required
    image-name: '${{ github.repository }}/api'  # Required
    version: 'v1.2.3'                     # Optional
    push: 'true'                          # Optional, defaults to true
    scan-image: 'true'                    # Optional, defaults to true
    sign-image: 'true'                    # Optional, defaults to false
    platforms: 'linux/amd64,linux/arm64' # Optional
```

**Features:**
- Builds multi-platform container images
- Applies consistent metadata and labels
- Scans images for vulnerabilities with Trivy
- Signs images with cosign (when enabled)
- Uploads security scan results to GitHub
- Supports build caching for faster builds

## Environment Variables

All common environment variables are consolidated and managed through the shared actions. Key variables include:

### Runtime Versions
```yaml
NODE_VERSION: "20"
BUN_VERSION: "1.2.22"
```

### Container Registry
```yaml
REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
```

### Infrastructure Tools
```yaml
KUBECTL_VERSION: "v1.28.0"
HELM_VERSION: "3.12.0"
```

### Test Services
```yaml
POSTGRES_VERSION: "15"
POSTGRES_DB: ea_financial_test
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
REDIS_VERSION: "7-alpine"
```

### Security and Compliance
```yaml
SECURITY_SCAN_SEVERITY: "CRITICAL,HIGH,MEDIUM"
PCI_DSS_SCOPE: true
AUDIT_LOGGING: enabled
ENCRYPTION_AT_REST: required
```

## Workflow Examples

### Optimized PR Validation

The optimized PR validation workflow demonstrates how to use shared actions:

```yaml
name: PR Validation (Optimized)

jobs:
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Environment
        uses: ./.github/actions/setup-environment
      - name: Run linting
        run: bun run check

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Environment
        uses: ./.github/actions/setup-environment
      - name: Setup Test Services
        uses: ./.github/actions/setup-services
        with:
          setup-opa: 'true'
      - name: Run tests
        run: bun run test:integration
```

### Container Build and Deploy

```yaml
build-and-push:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Setup Environment
      uses: ./.github/actions/setup-environment
    - name: Setup Infrastructure
      uses: ./.github/actions/setup-infrastructure
      with:
        registry-username: ${{ github.actor }}
        registry-password: ${{ secrets.GITHUB_TOKEN }}
    - name: Build and push API
      uses: ./.github/actions/build-and-push
      with:
        context: ./projects/api
        image-name: ${{ github.repository }}/api
        sign-image: 'true'
```

## Migration Guide

### From Original Workflows

To migrate existing workflows to use the shared actions:

1. **Replace Environment Setup:**
   ```yaml
   # Old
   - name: Setup Bun
     uses: oven-sh/setup-bun@v1
     with:
       bun-version: ${{ env.BUN_VERSION }}
   - name: Install dependencies
     run: bun install --frozen-lockfile

   # New
   - name: Setup Environment
     uses: ./.github/actions/setup-environment
   ```

2. **Replace Infrastructure Setup:**
   ```yaml
   # Old
   - name: Set up Docker Buildx
     uses: docker/setup-buildx-action@v3
   - name: Setup kubectl
     uses: azure/setup-kubectl@v3
   - name: Setup Helm
     uses: azure/setup-helm@v3

   # New
   - name: Setup Infrastructure
     uses: ./.github/actions/setup-infrastructure
   ```

3. **Replace Service Setup:**
   ```yaml
   # Old
   services:
     postgres:
       image: postgres:15
       env:
         POSTGRES_PASSWORD: postgres

   # New
   - name: Setup Test Services
     uses: ./.github/actions/setup-services
   ```

## Benefits

### Reduced Duplication
- Environment setup steps reduced from ~15 lines to 2 lines per workflow
- Infrastructure setup consolidated from ~20+ lines to 2 lines
- Container builds standardized with consistent security scanning

### Improved Maintainability
- Version updates in one place affect all workflows
- Bug fixes and improvements benefit all workflows
- Consistent behavior across all pipelines

### Better Security
- Standardized security scanning for all container builds
- Consistent vulnerability reporting
- Centralized compliance checks

### Faster Builds
- Optimized caching strategies
- Parallel execution where possible
- Reduced workflow complexity

## Best Practices

### Using Shared Actions

1. **Always specify explicit versions** for critical dependencies
2. **Use the setup-environment action first** in every job
3. **Cache appropriately** - the actions handle most caching automatically
4. **Follow the shell: bash pattern** for run blocks in composite actions

### Environment Variables

1. **Don't hardcode versions** in individual workflows
2. **Use the shared environment configuration**
3. **Override only when necessary** with explicit reasoning

### Security

1. **Always enable image scanning** for container builds
2. **Sign images in production** workflows
3. **Use least-privilege permissions** in workflow jobs
4. **Rotate secrets regularly** and use GitHub's secret scanning

## Troubleshooting

### Common Issues

1. **Action not found**: Ensure the action directory structure is correct
2. **Permission denied**: Check that composite actions have `shell: bash` specified
3. **Cache misses**: Verify that cache keys are consistent across runs
4. **Service startup timeouts**: Increase timeout values for slower environments

### Debugging

Enable debug logging by setting repository secrets:
- `ACTIONS_STEP_DEBUG: true`
- `ACTIONS_RUNNER_DEBUG: true`

### Support

For issues with the shared actions or CI/CD pipeline:
1. Check the GitHub Actions logs for detailed error messages
2. Verify that all required secrets are configured
3. Ensure that the repository has the necessary permissions
4. Review the action source code in `.github/actions/`

## Future Enhancements

- [ ] Add support for matrix builds across different Node.js versions
- [ ] Implement automatic dependency updates
- [ ] Add performance regression testing
- [ ] Integrate with external monitoring systems
- [ ] Add support for feature flag deployments
- [ ] Implement automatic rollback capabilities

## Contributing

When modifying shared actions:

1. **Test thoroughly** in a branch before merging
2. **Update documentation** to reflect changes
3. **Consider backward compatibility** for existing workflows
4. **Use semantic versioning** for action releases
5. **Add appropriate error handling** and logging

---

*Last updated: December 2024*
*Maintained by: EA Financial Platform Team*