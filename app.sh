#!/bin/bash

# EA Financial - Quick Access Shortcut
# This is a convenient shortcut to the main app access scripts

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 EA Financial - Quick Access${NC}"
echo "==============================="

# Check if any arguments were passed
if [ $# -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}🚀 Opening app in browser...${NC}"
    exec ./infra/scripts/open-app.sh
else
    case "$1" in
        "help"|"-h"|"--help")
            exec ./infra/scripts/app-help.sh
            ;;
        "start")
            exec ./infra/scripts/start-app.sh
            ;;
        "urls")
            exec ./infra/scripts/get-urls.sh
            ;;
        "tunnel")
            exec ./infra/scripts/setup-tunnel.sh
            ;;
        "health")
            exec ./infra/scripts/health-check.sh
            ;;
        "monitor")
            exec ./infra/scripts/monitor.sh dashboard
            ;;
        *)
            echo ""
            echo -e "${YELLOW}Usage: $0 [command]${NC}"
            echo ""
            echo "Commands:"
            echo "  (no args)  Open app in browser (default)"
            echo "  help       Show all access options"
            echo "  start      Full development mode"
            echo "  urls       Show available URLs"
            echo "  tunnel     Setup permanent tunnel"
            echo "  health     Run health checks"
            echo "  monitor    Live monitoring dashboard"
            echo ""
            echo "Examples:"
            echo "  ./app.sh           # Quick browser access"
            echo "  ./app.sh help      # Show all options"
            echo "  ./app.sh start     # Development mode"
            ;;
    esac
fi
