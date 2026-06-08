import sys
import os
import traceback

try:
    print("Testing model load...")
    import torch
    import torchvision.models as models
    from model_loader import get_model
    m = get_model()
    print("Success loading model!")
except Exception as e:
    print("Error during load:")
    traceback.print_exc()
