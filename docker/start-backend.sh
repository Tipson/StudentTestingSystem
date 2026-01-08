#!/bin/bash

set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    cp .env.local .env
fi

export $(cat .env | grep -v '^#' | xargs)

echo "🔧 Building and starting backend services..."
docker-compose -f ./docker-compose-local-backend.yml -p lms-backend up --build -d

echo ""
echo "✅ Backend started!"
echo ""
echo "📊 Services:"
echo "  - Assessment API: http://localhost:5020/swagger"
echo "  - Media API:      http://localhost:5025/swagger"
