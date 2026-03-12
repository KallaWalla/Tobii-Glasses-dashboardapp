from pathlib import Path
import tempfile
import time
from collections.abc import Generator

from src.api.services import recordings_service
from src.utils import extract_frames_to_dir, get_frame_from_dir
from src.api.services import annotations_service
import torch
import torchvision.transforms as T
from transformers import AutoImageProcessor, AutoModel, BitImageProcessor
import torch.nn.functional as F

import base64
import numpy as np
import cv2
import torch
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

from src.aliases import UInt8Array

IMAGE_PROCESSOR: BitImageProcessor = AutoImageProcessor.from_pretrained(
    "facebook/dinov2-base"
)
EMBEDDING_DIM = 768


crop_size = IMAGE_PROCESSOR.crop_size["height"]
transformation_chain = T.Compose([
    T.ToTensor(),  # Convert numpy array (HWC) to tensor (CHW) scaled to [0,1]
    T.Resize(int((256 / 224) * crop_size)),
    T.CenterCrop(crop_size),
    T.Normalize(mean=IMAGE_PROCESSOR.image_mean, std=IMAGE_PROCESSOR.image_std),
])

device = "cuda" if torch.cuda.is_available() else "cpu"
dinov2_model: torch.nn.Module = AutoModel.from_pretrained("facebook/dinov2-base").to(device).float()
image_processor: BitImageProcessor = BitImageProcessor.from_pretrained("facebook/dinov2-base")


def get_embeddings(
    dinov2: torch.nn.Module,
    samples: list[UInt8Array],
    batch_size: int = 64,
    log_performance: bool = False,
) -> Generator[tuple[torch.Tensor, int, int], None, None]:
    """
    Generate embeddings for a list of image samples
    using the DINOv2 model in batches.
    Processes data batch by batch so that not all
    samples are loaded into memory simultaneously.

    Args:
        samples (list[UInt8Array]): A list of image samples to process.
        batch_size (int, optional): The number of samples to process per batch.

    Yields:
        tuple[torch.Tensor, int, int]:
            - torch.Tensor: The embeddings for the current batch (from the [CLS] token).
            - int: The starting index of the current batch in the overall samples list.
            - int: The ending index (exclusive) of the current batch.
    """
    total_samples = len(samples)
    batch_start_index = 0
    start_time = time.time()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    with torch.no_grad():

        for i in range(0, total_samples, batch_size):
            # Process only the current batch
            current_batch_samples = samples[i : i + batch_size]
            # Apply your transformation chain for this batch of samples
            batch_tensor = torch.stack([
                transformation_chain(sample).squeeze(0)
                for sample in current_batch_samples
            ]).to(device).float()

            # Generate embeddings
            embeddings = dinov2(batch_tensor).last_hidden_state[:, 0]
            current_batch_size = embeddings.shape[0]

            yield embeddings, batch_start_index, batch_start_index + current_batch_size
            batch_start_index += current_batch_size

    if log_performance:
        sps = total_samples / (time.time() - start_time)
        print(f"Generated {total_samples} embeddings at {sps:.2f} samples per second")

# Reuse dinov2_model already imported from embeddings_service

def get_crop_embedding(crop_bgr: np.ndarray) -> torch.Tensor:
    """DINOv2 CLS-token embedding for a single BGR crop, normalized."""
    rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)                                    # ← add this
    tensor = transformation_chain(pil).unsqueeze(0).to(device).float()  # ← pass pil
    with torch.no_grad():
        emb = dinov2_model(tensor).last_hidden_state[:, 0].squeeze(0)
    return F.normalize(emb, dim=0)

def build_prototypes(class_map: dict) -> dict[int, torch.Tensor]:
    """
    For each SimRoomClass, decode annotation crops → DINOv2 embeddings → mean prototype.
    """
    prototypes = {}

    for class_id, sim_class in class_map.items():
        embeddings = []

        for annotation in sim_class.annotations:
            if not annotation.frame_crop_base64:
                continue

            img_bytes = base64.b64decode(annotation.frame_crop_base64)
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            crop_bgr  = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if crop_bgr is None or crop_bgr.size == 0:
                continue

            embeddings.append(get_crop_embedding(crop_bgr))

        if not embeddings:
            continue

        prototype = torch.stack(embeddings).mean(dim=0)
        prototypes[class_id] = F.normalize(prototype, dim=0)

    return prototypes



