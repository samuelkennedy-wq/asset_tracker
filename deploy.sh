#!/bin/bash
set -e

PROXY="http://172.18.12.61:8080"
echo "=========================================================="
echo " [24]7.ai Asset Tracker - Automated Build & Deployment"
echo "=========================================================="
echo "Using corporate network proxy: $PROXY"

docker build --network=host \
  --build-arg HTTP_PROXY="$PROXY" \
  --build-arg HTTPS_PROXY="$PROXY" \
  --build-arg http_proxy="$PROXY" \
  --build-arg https_proxy="$PROXY" \
  -t asset-tracker-asset-tracker:latest .

echo ">>> Restarting container with updated image..."
docker compose up -d --no-deps asset-tracker

echo ">>> Waiting for service initialization..."
sleep 4

echo ">>> Checking Application Status (/api/status):"
curl -s http://127.0.0.1:3000/api/status || true
echo ""
echo ">>> Checking Database Connection (/api/db/status):"
curl -s http://127.0.0.1:3000/api/db/status || true
echo ""
echo "=========================================================="
echo " Deployment Finished Successfully!"
echo "=========================================================="
