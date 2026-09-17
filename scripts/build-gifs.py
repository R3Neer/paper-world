from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRAME_ROOT = ROOT / "artifacts" / "demo-frames"
OUTPUT = ROOT / "public" / "demos"
OUTPUT.mkdir(parents=True, exist_ok=True)

CAPTURE_FRAME_MS = 83
GIF_FRAME_MS = 125
GIF_WIDTH = 360
GIF_COLORS = 144


def build(source: Path, destination: Path) -> None:
    paths = sorted(source.glob("*.png"))
    if not paths:
        raise RuntimeError(f"No frames found in {source}")

    total_duration = len(paths) * CAPTURE_FRAME_MS
    selected = []
    timestamp = 0
    while timestamp < total_duration:
        selected.append(paths[min(len(paths) - 1, round(timestamp / CAPTURE_FRAME_MS))])
        timestamp += GIF_FRAME_MS

    resized = []
    for frame_path in selected:
        with Image.open(frame_path) as image:
            height = round(image.height * GIF_WIDTH / image.width)
            resized.append(
                image.convert("RGB").resize(
                    (GIF_WIDTH, height),
                    Image.Resampling.LANCZOS,
                )
            )

    samples = resized[:: max(1, len(resized) // 20)][:20]
    thumbs = []
    for sample in samples:
        copy = sample.copy()
        copy.thumbnail((GIF_WIDTH, sample.height))
        thumbs.append(copy)
    sheet = Image.new("RGB", (GIF_WIDTH * 5, resized[0].height * 4), "#526a81")
    for index, image in enumerate(thumbs):
        sheet.paste(image, ((index % 5) * GIF_WIDTH, (index // 5) * resized[0].height))
    palette = sheet.quantize(colors=GIF_COLORS, method=Image.Quantize.MEDIANCUT)

    frames = [
        image.quantize(palette=palette, dither=Image.Dither.NONE)
        for image in resized
    ]

    frames[0].save(
        destination,
        save_all=True,
        append_images=frames[1:],
        duration=GIF_FRAME_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"{destination.name}: {len(frames)} frames, {destination.stat().st_size / 1024 / 1024:.2f} MiB")


build(FRAME_ROOT / "01-spatial-world", OUTPUT / "01-spatial-world.gif")
build(FRAME_ROOT / "02-timers-and-chrono", OUTPUT / "02-timers-and-chrono.gif")
