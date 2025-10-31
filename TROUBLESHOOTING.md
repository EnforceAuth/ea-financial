# EA Financial - Troubleshooting Guide

## Common Issues and Solutions

### 🔒 "Authorization Service Unavailable" Error

This error occurs when the Open Policy Agent (OPA) service is not running or not accessible.

#### Symptoms:
- Login page shows red banner: "Authorization Service Unavailable"
- Login button is disabled and shows "🔒 Login Disabled"
- API returns 503 errors with message about OPA being unavailable
- Health endpoint shows OPA status as "error"

#### Quick Fix:
```bash
# Start with standard OPA
./app.sh opa

# Or start with Enterprise OPA
./app.sh eopa
```

#### Manual Steps:
1. **Check system status:**
   ```bash
   ./app.sh status
   ```

2. **If authorization service is not running:**
   ```bash
   # Standard OPA
   ./app.sh opa
   
   # Or Enterprise OPA
   ./app.sh eopa
   ```

3. **Verify service is working:**
   ```bash
   curl http://localhost:8181/health
   ```

#### Root Causes:
- OPA service was never started
- OPA crashed or was terminated
- Port 8181 is blocked by firewall
- OPA configuration files are missing or corrupted

---

### ⚠️ "System Running in Degraded Mode"

This warning appears when OPA is running but experiencing issues.

#### Symptoms:
- Login page shows yellow banner about degraded mode
- Some banking operations may fail intermittently
- Slower response times

#### Solutions:
1. **Check OPA logs:**
   ```bash
   # If running with start-opa.sh, check terminal output
   # Or check system logs for OPA process
   ```

2. **Restart authorization service:**
   ```bash
   ./app.sh stop
   ./app.sh opa    # or ./app.sh eopa
   ```

3. **Verify OPA data and policies:**
   ```bash
   curl http://localhost:8181/v1/data
   curl http://localhost:8181/v1/policies
   ```

---

### 🚫 Login Works But Operations Fail

This happens when login bypasses OPA but protected endpoints require it.

#### Symptoms:
- Login succeeds
- Dashboard loads but shows errors
- Account operations return 401/403 errors
- API calls fail with "Token validation service unavailable"

#### Solution:
This is the expected behavior when OPA is down. The new implementation prevents login when OPA is unavailable to avoid this confusing state. Use `./app.sh opa` or `./app.sh eopa` to start the authorization service.

---

### 🔄 "Checking system status..." Stuck

The login page is stuck checking system status.

#### Symptoms:
- Login page shows spinning indicator
- Never progresses to login form or error state

#### Solutions:
1. **Check if API is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check system status:**
   ```bash
   ./app.sh status
   ```

3. **Restart the API:**
   ```bash
   cd projects/consumer-accounts-internal-api
   bun run dev
   ```

3. **Check browser console for errors**

4. **Verify API port is correct in frontend config**

---

### 🌐 Network/Connection Issues

#### Symptoms:
- "Network error" messages
- Connection timeouts
- Services unreachable

#### Solutions:
1. **Check if services are running:**
   ```bash
   ./app.sh status
   ```

2. **Verify localhost resolution:**
   ```bash
   ping localhost
   ```

3. **Check firewall settings**

4. **Try different ports if there are conflicts**

---

## Service Status Dashboard

### Check System Health:
```bash
# API Health
curl -s http://localhost:3001/health | jq .

# OPA Health  
curl -s http://localhost:8181/health

# Full System Status
curl -s http://localhost:3001/status | jq .
```

### Expected Healthy Response:
```json
{
  "status": "healthy",
  "dependencies": {
    "opa": {
      "status": "operational",
      "url": "http://localhost:8181"
    }
  }
}
```

---

## Development Setup

### First Time Setup:
1. **Install OPA:**
   ```bash
   # macOS
   brew install open-policy-agent/opa/opa
   
   # Linux/WSL
   curl -L -o opa https://openpolicyagent.org/downloads/v0.57.0/opa_linux_amd64_static
   chmod +x opa
   sudo mv opa /usr/local/bin/
   ```

2. **Start with integrated launcher:**
   ```bash
   # Terminal 1: Start authorization service
   ./app.sh opa              # Standard OPA
   # OR
   ./app.sh eopa             # Enterprise OPA
   
   # Terminal 2: Start API
   cd projects/consumer-accounts-internal-api
   bun run dev
   
   # Terminal 3: Start Frontend
   cd projects/consumer-accounts-internal-app  
   npm run dev
   ```

3. **Verify everything is working:**
   ```bash
   ./app.sh status           # Check all services
   ```
   - Visit `http://localhost:3000` in your browser
   - Should see green "All Systems Operational" banner
   - Demo login should work

---

## Advanced Troubleshooting

### OPA Policy Testing:
```bash
# Test authorization endpoint
curl -X POST http://localhost:8181/v1/data/main/allow \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "request": {
        "http": {
          "method": "GET", 
          "path": "/accounts/123"
        }
      },
      "user": {
        "username": "mjohnson",
        "role": "manager"
      }
    }
  }'
```

### Debug API Authorization:
```bash
# Test with valid token
curl -H "Authorization: Bearer mjohnson_token_456" \
  http://localhost:3001/accounts/acc_12345/balance
```

### Check OPA Data:
```bash
# View all loaded data
curl http://localhost:8181/v1/data

# View specific user data  
curl http://localhost:8181/v1/data/users
```

---

## Getting Help

### Log Files:
- **API logs:** Check terminal running the API
- **OPA logs:** Check terminal running OPA or `~/.opa/logs/`
- **Browser logs:** Check browser developer console

### Common Commands:
```bash
# Check system status
./app.sh status

# Kill all services
./app.sh stop
pkill -f "bun.*src/index.ts"
pkill -f "npm.*dev"

# Restart everything fresh
./app.sh opa &                # or ./app.sh eopa
cd projects/consumer-accounts-internal-api && bun run dev &
cd projects/consumer-accounts-internal-app && npm run dev
```

### Environment Verification:
```bash
# Check required tools
node --version
bun --version  
opa version
curl --version

# Check system status
./app.sh status
```

---

## Security Notes

- **Never disable OPA in production** - The new implementation correctly prevents login when OPA is unavailable
- **OPA is required for all protected operations** - This is by design for security
- **Demo tokens are for development only** - Use proper authentication in production
- **All banking operations must be authorized** - OPA policies enforce role-based access control
- **EOPA provides enhanced audit logging** - Use `./app.sh eopa` for development with detailed security logs

## Authorization Service Options

### Standard OPA (`./app.sh opa`)
- Basic Open Policy Agent functionality
- Standard logging
- Production-ready authorization
- Recommended for most development

### Enterprise OPA (`./app.sh eopa`)
- Enhanced audit logging and debugging
- JSON formatted logs with decision traces
- Console output for all authorization decisions
- Recommended for security development and debugging

---

*Last updated: $(date)*
*For additional support, contact the EA Financial Engineering Team*