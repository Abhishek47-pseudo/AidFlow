# AidFlow: EfficientNet ML Inference Service

This directory houses a standalone FastAPI-based Python microservice that loads the pre-trained `best_effnet_b3_multilabel.pth` model and runs image disaster detection.

---

## Prerequisites
* Python 3.11+
* PyTorch & Torchvision (CPU versions)
* FastAPI & Uvicorn

---

## How to Run Locally

### 1. Create a Virtual Environment
Navigate to this directory and create a virtual environment:
```bash
cd ml_server
python -m venv .venv
```

Activate the environment:
* **Windows (PowerShell)**:
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
* **macOS/Linux**:
  ```bash
  source .venv/bin/activate
  ```

### 2. Install Dependencies
Install PyTorch and Torchvision CPU-only first (to save space), followed by the other requirements:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

### 3. Run the FastAPI Server
Start Uvicorn to listen on port 8000:
```bash
uvicorn app:app --reload --port 8000
```
The server will start up, load the model once, and be ready to process requests at `http://localhost:8000`.

* **API Docs**: View the interactive OpenAPI documentation at `http://localhost:8000/docs`.
* **Health Check**: Test the server health via `GET http://localhost:8000/health`.

---

## Docker Deployment

You can build and run the service inside a Docker container:
```bash
docker build -t aidflow-ml-server .
docker run -p 8000:8000 aidflow-ml-server
```

---

## How the Backend Integrates
The main Node/Express backend interacts with this service via HTTP requests:
1. When a user uploads an image to the `/api/emergency/analyze-image` route, the Express server reads the image data.
2. If `EFFICIENTNET_API_URL` is defined in `.env` (configured as `http://localhost:8000/predict`), Express forwards the image as a multipart/form-data upload to this FastAPI service.
3. FastAPI processes the image, runs inference, and returns 15 categories representing probabilities for LADI classes.
4. The Express backend maps the 15 output dimensions into its internal 8 categories (fire, flood, earthquake_damage, etc.) and returns the structured analysis back to the React frontend.

---

## Future Scalability Improvements
For production deployments handling high traffic, consider the following upgrades:
1. **GPU Acceleration**: In production, change the installation index to pull CUDA-enabled PyTorch and swap CPU inference for GPU (`device = "cuda" if torch.cuda.is_available() else "cpu"`).
2. **Request Batching**: Use a queuing system or Redis queue (like Celery or RQ) to batch incoming prediction requests together. Running inference in batches (e.g., 8 images at a time) is significantly more compute-efficient than running them one-by-one.
3. **Model Compilation**: Compile the PyTorch model with `torch.compile(model)` (available in PyTorch 2.0+) to fuse operators and increase inference speed.
4. **ONNX Runtime**: Export the PyTorch model weights into the ONNX format and run it using `onnxruntime-cpu`. ONNX runtime is highly optimized for CPU inference, runs faster, and has a much smaller memory/disk footprint than a full PyTorch install.
