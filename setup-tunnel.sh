#!/bin/bash

# EduPrime Cloudflare Tunnel Setup Script
# Domain: eduprime.automatebot.shop

set -e

echo "==========================================="
echo "  EduPrime Cloudflare Tunnel Setup"
echo "  Domain: eduprime.automatebot.shop"
echo "==========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker Compose is installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from template..."
    cp .env.example .env 2>/dev/null || echo "Warning: .env.example not found"
fi

echo "✅ Environment file ready"

# Load environment variables
source .env 2>/dev/null || true

echo ""
echo "🚀 Starting EduPrime with Cloudflare Tunnel..."
echo ""

# Stop any existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.tunnel.yml down 2>/dev/null || true

# Build and start the services
echo "📦 Building and starting services..."
docker-compose -f docker-compose.tunnel.yml up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.tunnel.yml ps

echo ""
echo "==========================================="
echo "  ✅ Setup Complete!"
echo "==========================================="
echo ""
echo "🌐 Your website is now accessible at:"
echo "   https://eduprime.automatebot.shop"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:     docker-compose -f docker-compose.tunnel.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.tunnel.yml down"
echo "   Restart:       docker-compose -f docker-compose.tunnel.yml restart"
echo ""
echo "🔧 Troubleshooting:"
echo "   Check tunnel:  docker logs eduprime-tunnel"
echo "   Check backend: docker logs eduprime-backend"
echo "   Check database: docker logs eduprime-db"
echo ""
