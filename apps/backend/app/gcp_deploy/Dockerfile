FROM pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime

# Prevent interactive debconf / tzdata prompts in Cloud Build
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg git tzdata && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
