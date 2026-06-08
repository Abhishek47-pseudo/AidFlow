FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (curl is useful for container healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch and Torchvision CPU-only first to keep the image extremely lightweight
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install the remaining requirements
COPY requirements.txt .
# Since torch/torchvision are already installed CPU-only, this installs fastapi, pillow, uvicorn, multipart
RUN pip install --no-cache-dir -r requirements.txt

# Copy model weights and application source code
COPY best_effnet_b3_multilabel.pth .
COPY model_loader.py .
COPY app.py .

# Expose microservice port
EXPOSE 8000

# Start FastAPI application using uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
