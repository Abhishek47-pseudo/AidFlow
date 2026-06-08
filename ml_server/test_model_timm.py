import sys
import os
import traceback
import torch
import timm

try:
    print("Testing model load via timm...")
    model_path = "best_effnet_b3_multilabel.pth"
    # Create empty architecture matching timm's naming
    model = timm.create_model('efficientnet_b3', pretrained=False, num_classes=15)
    
    # Load state dict
    state_dict = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state_dict)
    print("Success loading model via timm!")
except Exception as e:
    print("Error during load:")
    traceback.print_exc()
