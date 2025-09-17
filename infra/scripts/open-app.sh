#!/bin/bash

# Simple script to open EA Financial app in browser
# This is the easiest way to access the app on macOS with Docker driver

NAMESPACE="ea-financial"
PORT=8080

# Check if everything is ready
if ! minikube status >/dev/null 2>&1; then
    echo "❌ Minikube is not running"
    exit 1
fi

if ! kubectl get pods -n $NAMESPACE -l app=consumer-accounts-app | grep -q "Running"; then
    echo "❌ App pods are not running"
    exit 1
fi

echo "🚀 Opening EA Financial app..."
echo "📱 URL: http://localhost:$PORT"
echo "🛑 Press Ctrl+C to stop"

# Kill any existing port-forward on this port
pkill -f "port-forward.*consumer-accounts-app.*$PORT" 2>/dev/null || true

# Start port-forward and open browser
kubectl port-forward svc/consumer-accounts-app $PORT:80 -n $NAMESPACE >/dev/null 2>&1 &
PID=$!

# Wait a moment then open browser
sleep 3

# Open in default browser (macOS)
if command -v open >/dev/null 2>&1; then
    open http://localhost:$PORT
else
    echo "🌐 Open this URL in your browser: http://localhost:$PORT"
fi

# Keep port-forward running
trap "kill $PID 2>/dev/null || true; echo '👋 Stopped'" EXIT INT TERM
wait $PID
