"""Time to first pixel per presenter and size, from FirstPixel.probe's jest logs.

python -I first-pixel.py <jest.log>...

Each log holds one FIRST_PIXEL line: for every presenter and size, the milliseconds from the commit that mounts one
view until its pixels show, twelve times over. Prints each one's median, range and missed count, a log at a time.
"""

import json
import re
import statistics
import sys

for path in sys.argv[1:]:
    text = open(path, encoding="utf-8", errors="replace").read()
    match = re.search(r"FIRST_PIXEL (\[.*?\])\s*$", text, re.MULTILINE)
    if match is None:
        print(f"{path}: no FIRST_PIXEL line")
        continue
    print(path)
    for entry in json.loads(match.group(1)):
        timings = entry["milliseconds"]
        print(
            f"  {entry['presenter']:<16} {entry['size']:>4} pt: median {statistics.median(timings):.1f} ms"
            f" ({min(timings):.1f}-{max(timings):.1f}), {len(timings)} views, {entry['missed']} missed"
        )
