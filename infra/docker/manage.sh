#!/bin/bash

# FIAP Hackaton - Docker Management Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to docker directory
cd "$(dirname "$0")"

case "$1" in
    "up"|"start")
        echo -e "${GREEN}🚀 Starting FIAP Hackaton development environment...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Environment started successfully!${NC}"
        echo -e "${BLUE}Services available at:${NC}"
        echo -e "  🔐 Auth API:     http://localhost:3000"
        echo -e "  🎥 Video API:    http://localhost:3001"  
        echo -e "  ⚙️  Worker API:   http://localhost:3002"
        echo -e "  📊 pgAdmin:      http://localhost:8081"
        echo -e "  📈 Prometheus:   http://localhost:9090"
        echo -e "  📊 Grafana:      http://localhost:3003"
        echo -e "  💾 MinIO Console: http://localhost:9001"
        echo -e "  🐰 RabbitMQ UI:  http://localhost:15672"
        ;;
    "down"|"stop")
        echo -e "${YELLOW}🛑 Stopping FIAP Hackaton environment...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Environment stopped successfully!${NC}"
        ;;
    "restart")
        echo -e "${YELLOW}🔄 Restarting FIAP Hackaton environment...${NC}"
        docker-compose down
        docker-compose up -d
        echo -e "${GREEN}✅ Environment restarted successfully!${NC}"
        ;;
    "logs")
        if [ -n "$2" ]; then
            echo -e "${BLUE}📋 Showing logs for service: $2${NC}"
            docker-compose logs -f "$2"
        else
            echo -e "${BLUE}📋 Showing logs for all services...${NC}"
            docker-compose logs -f
        fi
        ;;
    "status")
        echo -e "${BLUE}📊 Service status:${NC}"
        docker-compose ps
        ;;
    "reset")
        echo -e "${RED}💥 Resetting environment (this will delete all data!)${NC}"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker-compose up -d
            echo -e "${GREEN}✅ Environment reset successfully!${NC}"
        else
            echo -e "${YELLOW}❌ Reset cancelled${NC}"
        fi
        ;;
    "clean")
        echo -e "${YELLOW}🧹 Cleaning up Docker resources...${NC}"
        docker-compose down
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup completed!${NC}"
        ;;
    *)
        echo -e "${BLUE}FIAP Hackaton Docker Management${NC}"
        echo -e "${YELLOW}Usage: $0 {up|down|restart|logs|status|reset|clean}${NC}"
        echo ""
        echo -e "${BLUE}Commands:${NC}"
        echo "  up/start    - Start all services"
        echo "  down/stop   - Stop all services"
        echo "  restart     - Restart all services"
        echo "  logs [svc]  - Show logs (optionally for specific service)"
        echo "  status      - Show service status"
        echo "  reset       - Reset environment (deletes all data)"
        echo "  clean       - Clean up Docker resources"
        echo ""
        echo -e "${BLUE}Examples:${NC}"
        echo "  $0 up"
        echo "  $0 logs video-api"
        echo "  $0 status"
        ;;
esac
