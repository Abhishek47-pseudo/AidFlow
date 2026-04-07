import sys
import json
import base64
import io
import os

# Check for dependencies
try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    from PIL import Image
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {str(e)}"}))
    sys.exit(1)

# Configuration
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'best_effnet_b3_multilabel.pth')
NUM_CLASSES = 8
CLASSES = [
    'fire', 'flood', 'earthquake_damage', 'landslide', 
    'storm_damage', 'building_collapse', 'infrastructure_damage', 'normal'
]

def load_model():
    # Initialize model architecture
    model = models.efficientnet_b3(weights=None)
    
    # Modify classifier for our number of classes
    # EfficientNet B3 classifier: Sequential(Dropout, Linear)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, NUM_CLASSES)
    
    # Load weights
    try:
        if torch.cuda.is_available():
            device = torch.device('cuda')
            state_dict = torch.load(MODEL_PATH)
        else:
            device = torch.device('cpu')
            state_dict = torch.load(MODEL_PATH, map_location=device)
            
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        return model, device
    except Exception as e:
        return None, f"Failed to load model: {str(e)}"

def predict(image_data_base64):
    model, device_or_error = load_model()
    if model is None:
        return {"error": device_or_error}

    try:
        # Decode image
        image_bytes = base64.b64decode(image_data_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Preprocess
        preprocess = transforms.Compose([
            transforms.Resize(320), # EfficientNet B3 uses 300-320
            transforms.CenterCrop(300),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        input_tensor = preprocess(image).unsqueeze(0).to(device_or_error)
        
        # Inference
        with torch.no_grad():
            output = model(input_tensor)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            
        # Format results
        results = []
        for i, prob in enumerate(probabilities):
            results.append({
                "label": CLASSES[i],
                "probability": float(prob),
                "class": i
            })
            
        # Sort by probability
        results.sort(key=lambda x: x['probability'], reverse=True)
        
        return {
            "predictions": [r['probability'] for r in results], # Raw probabilities
            "top_predictions": results[:3],
            "primary_disaster": results[0]
        }
        
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data received"}))
            sys.exit(1)
            
        request = json.loads(input_data)
        image_data = request.get('image')
        
        if not image_data:
            print(json.dumps({"error": "No image data in request"}))
        else:
            # Strip header if present (data:image/jpeg;base64,...)
            if ',' in image_data:
                image_data = image_data.split(',')[1]
                
            result = predict(image_data)
            print(json.dumps(result))
            
    except Exception as e:
        print(json.dumps({"error": f"Script execution failed: {str(e)}"}))
