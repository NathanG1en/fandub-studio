#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="fandub-diarizer-api"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "=== Deploying FanDub Studio Diarization Service to GCP Project: ${PROJECT_ID} ==="

# Submit Cloud Build
echo "[1/2] Building Container via GCP Cloud Build..."
gcloud builds submit --tag "${IMAGE_TAG}" .

# Deploy to Cloud Run (High Performance Compute)
echo "[2/2] Deploying to Cloud Run (4 vCPUs / 8GB RAM)..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_TAG}" \
  --region "${REGION}" \
  --cpu 4 \
  --memory 8Gi \
  --no-cpu-throttling \
  --max-instances 2 \
  --allow-unauthenticated

echo "=== GCP Diarization Microservice Successfully Deployed! ==="
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format "value(status.url)"
