"""Export a fine-tuned checkpoint to the two-output ONNX contract.

Outputs:
  logits:      [batch, 10]
  feature_map: [batch, 7, 7]  (top-class CAM, matching model_infer.py)
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

from training.finetune_nih import ChestXrayNet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, default=Path("training/runs/finetune_nih_25000/best.pt"))
    parser.add_argument("--out", type=Path, default=Path("backend/model_finetuned.onnx"))
    args = parser.parse_args()

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    model = ChestXrayNet()
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    model.eval()
    class ExportModel(torch.nn.Module):
        def __init__(self, inner):
            super().__init__()
            self.inner = inner
        def forward(self, images):
            return self.inner(images, return_cam=True)
    export_model = ExportModel(model).eval()
    dummy = torch.zeros(1, 3, 224, 224, dtype=torch.float32)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        export_model,
        dummy,
        str(args.out),
        input_names=["input"],
        output_names=["logits", "feature_map"],
        opset_version=17,
        do_constant_folding=True,
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}, "feature_map": {0: "batch"}},
    )
    session = ort.InferenceSession(str(args.out), providers=["CPUExecutionProvider"])
    outputs = session.run(None, {"input": np.zeros((1, 3, 224, 224), dtype=np.float32)})
    print("saved", args.out, "shape", [tuple(item.shape) for item in outputs])


if __name__ == "__main__":
    main()
