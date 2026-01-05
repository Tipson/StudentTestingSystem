#!/bin/bash

# Exit on any error
set -e

# Set working directory to script location
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 .env file not found. Copying from .env.local..."
    cp .env.local .env
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "🚀 Starting LMS Infrastructure..."
echo "================================="

docker-compose -f ./docker-compose-local-infra.yml -p lms up --build -d

echo ""
echo "✅ Infrastructure started!"
echo ""
echo "📊 Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - MinIO API:  localhost:9000"
echo "  - MinIO UI:   localhost:9001 (${MINIO_ROOT_USER}/${MINIO_ROOT_PASSWORD})"
echo "  - Redis:      localhost:6379"
echo "  - Keycloak:   localhost:8080 (${KEYCLOAK_ADMIN}/${KEYCLOAK_ADMIN_PASSWORD})"
echo ""
echo "💡 Commands:"
echo "  - Logs: docker-compose -f ./docker-compose-local-infra.yml -p lms logs -f"
echo "  - Stop: ./stop-infra.sh"
