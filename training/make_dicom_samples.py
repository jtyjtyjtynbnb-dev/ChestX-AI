"""Generate PHI-free DICOM acceptance samples from the bundled CXR demo image.

Creates:
  cxr_uncompressed_8bit.dcm   Explicit VR Little Endian, 8-bit
  cxr_uncompressed_16bit.dcm   Explicit VR Little Endian, 16-bit
  cxr_compressed_jpeg.dcm      JPEG Baseline 8-bit transfer syntax
  broken_truncated.dcm         truncated invalid file

All metadata is fake/anonymous. Run from the project root.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pydicom
from PIL import Image
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, JPEGBaseline8Bit, generate_uid

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dicom_samples"
SOURCE = ROOT / "frontend" / "assets" / "sample_2.jpg"


def _base_meta(transfer_syntax: str, *, bits: int) -> FileMetaDataset:
    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = transfer_syntax
    meta.ImplementationClassUID = generate_uid()
    meta.ImplementationVersionName = "CHESTX_DEMO_1"
    return meta


def _base_dataset(meta: FileMetaDataset, *, bits: int, rows: int, cols: int) -> FileDataset:
    ds = FileDataset("", {}, file_meta=meta, preamble=b"\0" * 128)
    ds.SOPClassUID = meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = meta.MediaStorageSOPInstanceUID
    ds.PatientName = "ANONYMOUS^DEMO"
    ds.PatientID = "DEMO-001"
    ds.PatientBirthDate = ""
    ds.PatientSex = "O"
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.StudyID = "DEMO"
    ds.SeriesNumber = 1
    ds.InstanceNumber = 1
    ds.Modality = "CR"
    ds.BodyPartExamined = "CHEST"
    ds.ViewPosition = "PA"
    ds.StudyDescription = "Chest X-ray teaching demo"
    ds.SeriesDescription = "PA chest"
    ds.ImageType = ["ORIGINAL", "PRIMARY"]
    ds.Rows = rows
    ds.Columns = cols
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated = bits
    ds.BitsStored = bits
    ds.HighBit = bits - 1
    ds.PixelRepresentation = 0
    ds.PixelSpacing = [0.143, 0.143]
    ds.WindowCenter = 2048 if bits == 16 else 128
    ds.WindowWidth = 4096 if bits == 16 else 256
    return ds


def _gray() -> np.ndarray:
    with Image.open(SOURCE) as image:
        return np.asarray(image.convert("L"))


def write_uncompressed(path: Path, *, bits: int) -> None:
    gray = _gray()
    meta = _base_meta(ExplicitVRLittleEndian, bits=bits)
    ds = _base_dataset(meta, bits=bits, rows=gray.shape[0], cols=gray.shape[1])
    if bits == 8:
        pixels = gray.astype(np.uint8)
    else:
        pixels = (gray.astype(np.uint16) * 257)
    ds.PixelData = pixels.tobytes()
    ds.save_as(path, enforce_file_format=True)


def write_compressed(path: Path) -> None:
    import io
    from pydicom.encaps import encapsulate

    gray = _gray()
    meta = _base_meta(JPEGBaseline8Bit, bits=8)
    ds = _base_dataset(meta, bits=8, rows=gray.shape[0], cols=gray.shape[1])
    buffer = io.BytesIO()
    Image.fromarray(gray.astype(np.uint8), mode="L").save(buffer, format="JPEG", quality=90)
    ds.PixelData = encapsulate([buffer.getvalue()])
    ds["PixelData"].is_undefined_length = True
    ds.save_as(path, enforce_file_format=True)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    write_uncompressed(OUT / "cxr_uncompressed_8bit.dcm", bits=8)
    write_uncompressed(OUT / "cxr_uncompressed_16bit.dcm", bits=16)
    write_compressed(OUT / "cxr_compressed_jpeg.dcm")
    data = (OUT / "cxr_uncompressed_8bit.dcm").read_bytes()
    (OUT / "broken_truncated.dcm").write_bytes(data[:100])
    for path in sorted(OUT.glob("*.dcm")):
        print(f"{path.name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
