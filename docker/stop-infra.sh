#!/bin/bash

cd "$(dirname "$0")"

echo "🛑 Stopping LMS Infrastructure..."
docker-compose -f ./docker-compose-local-infra.yml -p lms down

echo "✅ Infrastructure stopped!"
