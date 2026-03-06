from pathlib import Path

import numpy as np
import torch
from sam2.build_sam import build_sam2, build_sam2_video_predictor
from sam2.sam2_image_predictor import SAM2ImagePredictor
from torchvision.ops import masks_to_boxes

from src.aliases import Int32Array, UInt8Array
from src.api.exceptions import PredictionFailedError
from src.config import MAX_INFERENCE_STATE_FRAMES, SAM_2_MODEL_CONFIGS

torch.set_autocast_enabled(False)
def load_predictor(checkpoint_path: Path) -> SAM2ImagePredictor:
    model_cfg = SAM_2_MODEL_CONFIGS[checkpoint_path]

    # Zorg dat Hydra een bestaand bestand kan vinden
    config_file = Path("configs/sam2/sam2.1_hiera_l.yaml").resolve()  # <== pas dit aan
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    sam2_model = build_sam2(str(config_file), str(checkpoint_path), device=device)
    sam2_model = sam2_model.float()
    predictor = SAM2ImagePredictor(sam2_model)
    return predictor



def load_video_predictor(checkpoint_path: Path, max_inference_state_frames: int = MAX_INFERENCE_STATE_FRAMES):
    ckpt_name = checkpoint_path.stem.upper()
    if "LARGE" in ckpt_name:
        image_size = 1024
        config_file = Path("configs/sam2/sam2.1_hiera_l.yaml")
    elif "SMALL" in ckpt_name:
        image_size = 512
        config_file = Path("configs/sam2/sam2.1_hiera_s.yaml")
    elif "BASE" in ckpt_name:
        image_size = 512
        config_file = Path("configs/sam2/sam2.1_hiera_b+.yaml")
    elif "TINY" in ckpt_name:
        image_size = 256
        config_file = Path("configs/sam2/sam2.1_hiera_t.yaml")
    else:
        image_size = 512
        config_file = Path("configs/sam2/sam2.1_hiera_s.yaml")  # fallback

    config_file = config_file.resolve()  # Zorg dat het absolute pad is
    config_file = Path("configs/sam2/sam2.1_hiera_l.yaml").resolve()

    predictor = build_sam2_video_predictor(
        str(config_file),
        str(checkpoint_path),
        device=torch.device("cuda" if torch.cuda.is_available() else "cpu"),
        max_cond_frames_in_attn=max_inference_state_frames,
        clear_non_cond_mem_around_input=True,
        image_size=image_size,
        async_loading_frames=True,
    )
    # Force **entire model** to float32
    def force_float32(module):
        for m in module.modules():
            if hasattr(m, "weight") and m.weight is not None:
                m.to(torch.float32)
        return module

    predictor.model = force_float32(predictor.model)

    return predictor


def predict(
    predictor: SAM2ImagePredictor,
    points: list[tuple[int, int]],
    points_labels: list[int],
) -> tuple[UInt8Array, Int32Array]:
    masks, _, _ = predictor.predict(
        point_coords=np.array(points),
        point_labels=np.array(points_labels),
        multimask_output=False,
    )

    if len(masks) == 0:
        raise PredictionFailedError("No masks found for the given points")

    mask_torch = torch.from_numpy(masks[0]).unsqueeze(0)
    x1, y1, x2, y2 = masks_to_boxes(mask_torch)[0].cpu().numpy().astype(np.int32)
    mask = mask_torch.cpu().numpy().astype(np.uint8)

    x1, x2 = min(x1, x2), max(x1, x2)
    y1, y2 = min(y1, y2), max(y1, y2)
    final_mask = mask[:, y1:y2, x1:x2]

    return final_mask, np.array([x1, y1, x2, y2]).astype(np.int32)
