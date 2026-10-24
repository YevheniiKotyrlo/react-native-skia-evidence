"""The re-attach trace: for each layer made for a view put back in its superview, the Core Animation commit that carries it,
the first present onto it, and the vsyncs between (reattach-probe.log, CACurrentMediaTime's clock).
    python analyze.py <reattach-probe.log>"""
import re
import sys
from bisect import bisect_right

lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
made, committed, presents, vsyncs = {}, {}, [], []
for line in lines:
    kind, *fields = line.split()
    values = dict(field.split("=", 1) for field in fields)
    if kind == "MADE":
        made.setdefault(values["layer"], []).append(float(values["t"]))
    elif kind == "COMMITTED":
        committed.setdefault(values["layer"], []).append(float(values["t"]))
    elif kind == "PRESENT":
        presents.append((float(values["t"]), values["layer"]))
    elif kind == "VSYNC":
        vsyncs.append((float(values["t"]), float(values["target"])))
vsync_times = [t for t, _ in vsyncs]
rows = []
for layer, made_times in made.items():
    for made_at in made_times:
        commit_at = next((t for t in committed.get(layer, []) if t >= made_at), None)
        present_at = next((t for t, l in presents if l == layer and t >= made_at), None)
        if commit_at is None or present_at is None:
            rows.append((made_at, layer, commit_at, present_at, None))
            continue
        between = bisect_right(vsync_times, present_at) - bisect_right(vsync_times, commit_at)
        rows.append((made_at, layer, commit_at, present_at, between))
rows.sort()
print(f"{len(rows)} layers made for views put back; {len(vsyncs)} vsyncs; {len(presents)} presents")
print("made          layer               commit-made ms  present-commit ms  vsyncs between")
for made_at, layer, commit_at, present_at, between in rows:
    if between is None:
        print(f"{made_at:.4f}  {layer:18}  commit {commit_at}  present {present_at}")
        continue
    print(f"{made_at:.4f}  {layer:18}  {1000 * (commit_at - made_at):14.2f}  {1000 * (present_at - commit_at):17.2f}  {between:14d}")
counted = [r[4] for r in rows if r[4] is not None]
print("vsyncs between the commit and the first present, per layer: " + ", ".join(map(str, counted)))
print(f"layers whose first present came a vsync or more after their commit: {sum(1 for c in counted if c >= 1)} of {len(counted)}")
