#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_NAME="fandub-gpu-diarizer"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "=== Deploying FanDub Studio GPU Microservice to GCP Project: ${PROJECT_ID} ==="

# Submit Cloud Build
echo "[1/2] Building Container via GCP Cloud Build..."
gcloud builds submit --tag "${IMAGE_TAG}" .

# Deploy to Cloud Run with NVIDIA L4 GPU
echo "[2/2] Deploying to Cloud Run with NVIDIA L4 GPU..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_TAG}" \
  --region "${REGION}" \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --no-cpu-throttling \
  --max-instances 2 \
  --allow-unauthenticated

echo "=== GCP GPU Microservice Successfully Deployed! ==="
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format "value(status.url)"
