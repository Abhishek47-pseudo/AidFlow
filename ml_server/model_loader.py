import os
import torch
import torchvision.models as models

# The 15 multilabel classes in order of LADI dataset columns
CLASS_NAMES = [
    'bridges_any',
    'bridges_damage',
    'buildings_affected',
    'buildings_any',
    'buildings_destroyed',
    'buildings_major',
    'buildings_minor',
    'debris_any',
    'flooding_any',
    'flooding_structures',
    'roads_any',
    'roads_damage',
    'trees_any',
    'trees_damage',
    'water_any'
]

_model = None

def get_model(model_path: str = None) -> torch.nn.Module:
    """
    Loads the EfficientNet B3 model structure, overrides the classifier
    with the 15 output dimensions, loads the state dict, and caches it.
    """
    global _model
    if _model is not None:
        return _model

    if model_path is None:
        # Default to the same directory as this file or one level up
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "best_effnet_b3_multilabel.pth")
        
        # Fallback to backend data directory if not in ml_server
        if not os.path.exists(model_path):
            model_path = os.path.join(os.path.dirname(current_dir), "backend", "data", "best_effnet_b3_multilabel.pth")

    print(f"Loading EfficientNet B3 model from: {model_path}")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")

    # 1. Initialize empty EfficientNet B3 architecture
    model = models.efficientnet_b3(weights=None)
    
    # 2. Modify the classifier to match the 15 output dimensions.
    # The saved model replaced model.classifier directly with a Linear layer.
    model.classifier = torch.nn.Linear(1536, 15)

    # 3. Load the weights dictionary
    state_dict = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state_dict)
    
    # 4. Put the model in evaluation mode
    model.eval()
    
    # 5. Disable gradient computation globally for the model parameters
    for param in model.parameters():
        param.requires_grad = False

    _model = model
    print("EfficientNet B3 model loaded successfully and ready for CPU inference.")
    return _model
