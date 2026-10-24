"""The static-content bench's missed frames per window, per device and arm: the median of every pass with the
range of the passes, from the "BENCH probe" lines the bench logs (`adb logcat -s ReactNativeJS:V` on Android, the
Metro or device log on iOS). Logs of one device are pooled.
    python spread.py <device>=<log>[,<log>...] ..."""
import re
import statistics
import sys
from collections import defaultdict

ARMS = [
    ("mount, one image", "mount-shared"),
    ("mount, 120 images", "mount-distinct"),
    ("mounted, the parent animating", "render-shared"),
    ("a new image every 800 ms", "swap-shared"),
]
PRESENTERS = [("<Canvas>", "canvas-texture"), ("<Canvas static>", "canvas-static"), ("SkiaImageView", "image-view")]


PROBE = re.compile(r"BENCH probe arm=(\S+) pass=(\d+) .*?missedFrames=(\d+)")


def read_device(logs):
    windows = defaultdict(list)
    for log in logs:
        with open(log, encoding="utf-8", errors="replace") as lines:
            for line in lines:
                match = PROBE.search(line)
                if match:
                    windows[match.group(1)].append(int(match.group(3)))
    return windows


def cell(values):
    if not values:
        return "—"
    median = statistics.median(values)
    text = f"{median:g}"
    low, high = min(values), max(values)
    return text if low == high else f"{text} ({low}–{high})"


devices = []
for argument in sys.argv[1:]:
    name, logs = argument.split("=", 1)
    devices.append((name, read_device(logs.split(","))))
print("| Drive | Presenter | " + " | ".join(name for name, _ in devices) + " |")
print("| --- | --- | " + " | ".join("---" for _ in devices) + " |")
for label, drive in ARMS:
    for index, (presenter_label, presenter) in enumerate(PRESENTERS):
        arm = f"{drive}-{presenter}"
        cells = [cell(windows.get(arm, [])) for _, windows in devices]
        print(f"| {label if index == 0 else ''} | `{presenter_label}` | " + " | ".join(cells) + " |")
cells = [cell(windows.get("mount-shared-none", [])) for _, windows in devices]
print("| plain views, mounted the same way | | " + " | ".join(cells) + " |")
counts = {name: sorted({len(v) for v in windows.values()}) for name, windows in devices}
print(f"\npasses per arm: {counts}")
