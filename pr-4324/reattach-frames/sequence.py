"""The re-attach trace: for each layer made for a view put back, what happened to it, in order, from its making to
its first present (SYNC_REDRAW, DECLINED, NO_DRAWABLE with the surface texture's status, COMMITTED, PRESENT), each
with its time after the making, in ms.
    python sequence.py <reattach-probe.log>"""
import sys
from collections import Counter

events = []
for line in open(sys.argv[1], encoding="utf-8").read().splitlines():
    kind, *fields = line.split()
    values = dict(field.split("=", 1) for field in fields)
    # SYNC_ATTACH names its layer without a time; the redraw lines name the surface.
    if "layer" in values and "t" in values:
        events.append((float(values["t"]), kind, values["layer"], values.get("status")))
events.sort()
patterns = Counter()
for index, (made_at, kind, layer, _) in enumerate(events):
    if kind != "MADE":
        continue
    sequence = []
    for t, other_kind, other_layer, status in events[index + 1:]:
        if other_layer != layer:
            continue
        if other_kind == "MADE":
            break
        label = other_kind if status is None else f"{other_kind}({status})"
        sequence.append(f"{label} +{1000 * (t - made_at):.1f}")
        if other_kind == "PRESENT":
            break
    print(f"{made_at:.4f} {layer}: " + ", ".join(sequence))
    patterns[" > ".join(item.split(" +")[0] for item in sequence)] += 1
print("\nsequences:")
for pattern, count in patterns.most_common():
    print(f"  {count:3d}  {pattern}")
