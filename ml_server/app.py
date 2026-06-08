import base64
import io
import os
from fastapi import FastAPI, File, UploadFile, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
from torchvision import transforms

from model_loader import get_model, CLASS_NAMES

# Initialize FastAPI application
app = FastAPI(
    title="AidFlow EfficientNet ML Inference Service",
    description="Microservice running EfficientNet B3 for disaster classification",
    version="1.0.0"
)

# Enable CORS for cross-origin local requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard EfficientNet B3 Preprocessing transforms
# ImageNet normalize values are standard for torchvision pre-trained models
preprocess_transforms = transforms.Compose([
    transforms.Resize((300, 300)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Global model variable
model = None

@app.on_event("startup")
def startup_event():
    """Load model once during application startup."""
    global model
    try:
        model = get_model()
    except Exception as e:
        print(f"Failed to load model during startup: {e}")
        model = None

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Health check endpoint to verify service and model loading status."""
    if model is None:
        return {
            "status": "error",
            "message": "Model is not loaded. Check server logs."
        }
    return {
        "status": "ok",
        "model_loaded": True
    }

@app.post("/predict")
async def predict(request: Request):
    """
    Accepts an uploaded image file (via multipart/form-data) OR a base64 encoded image
    (via application/json) and returns prediction probabilities.
    """
    # 1. Check if model is initialized
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Model is not loaded or failed to initialize on startup."
        )

    content_type = request.headers.get("content-type", "")
    contents = None

    # 2. Extract image bytes based on Request Content-Type
    if "application/json" in content_type:
        try:
            body = await request.json()
            image_data = body.get("image")
            if not image_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing 'image' key in JSON payload."
                )
            
            # Handle standard Data URI prefix (e.g. data:image/jpeg;base64,...)
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]
                
            contents = base64.b64decode(image_data)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to decode base64 image: {str(e)}"
            )

    elif "multipart/form-data" in content_type:
        try:
            form = await request.form()
            file = form.get("file")
            if not file or not isinstance(file, UploadFile):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Missing 'file' field in multipart form-data."
                )
            
            # Check content type validation
            if file.content_type and not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file type: {file.content_type}. Only images are allowed."
                )
                
            contents = await file.read()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read multipart form payload: {str(e)}"
            )
    else:
        # Fallback to direct raw binary upload in request body
        try:
            contents = await request.body()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read raw body: {str(e)}"
            )

    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload is empty. No image data was provided."
        )

    # 3. Prevent extremely large files (10MB limit) to avoid Memory Overflows
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded file exceeds the maximum size limit of 10MB."
        )

    # 4. Load bytes into PIL image and convert to RGB (discard alpha channel if PNG/WebP)
    try:
        image = Image.open(io.BytesIO(contents))
        if image.mode != "RGB":
            image = image.convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file or corrupt payload. Pillow failed to decode."
        )

    # 5. Apply preprocessing and run PyTorch CPU inference
    try:
        input_tensor = preprocess_transforms(image)
        input_batch = input_tensor.unsqueeze(0)  # Add batch dimension (B, C, H, W)
        
        # Inference mode: no gradients tracked
        with torch.no_grad():
            logits = model(input_batch)
            # Multilabel output uses Sigmoid to calculate independent probabilities for each class
            probs = torch.sigmoid(logits)[0].tolist()
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing model inference: {str(e)}"
        )

    # 6. Construct label probabilities dictionary
    predictions = {CLASS_NAMES[i]: round(probs[i], 4) for i in range(len(CLASS_NAMES))}
    
    return predictions

