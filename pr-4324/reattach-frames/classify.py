"""A reading of a trace from reattach-probe.patch: for every view put back (SYNC_ATTACH), what the
redraw on its attach decided and whether its new layer got a present before the commit of the run loop turn that
carried it (COMMITTED)."""
import re
import sys
from collections import Counter


def fields(line):
    return dict(re.findall(r"(\w+)=(\S+)", line))


def classify(lines):
    for index, line in enumerate(lines):
        if not line.startswith("SYNC_ATTACH"):
            continue
        attach = fields(line)
        layer, surface = attach["layer"], attach["surface"]
        decision = "no redraw"
        shown_before_commit = False
        for later in lines[index + 1:]:
            if later.startswith("VSYNC"):
                continue
            values = fields(later)
            kind = later.split()[0]
            if decision == "no redraw" and kind.startswith("REDRAW_") and values.get("surface") == surface:
                decision = kind + (" (never presented)" if values.get("last") == "0" else "")
            if kind in ("DECLINED", "NO_DRAWABLE") and values.get("layer") == layer:
                decision += f" {kind}"
            if kind == "PRESENT" and values.get("layer") == layer:
                shown_before_commit = True
            if kind == "COMMITTED" and values.get("layer") == layer:
                break
        yield decision, shown_before_commit


lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
counts = Counter(classify(lines))
for (decision, shown), count in sorted(counts.items()):
    print(f"{count:3}  {decision:36} presented inside the commit: {'yes' if shown else 'no'}")
print(f"{sum(counts.values())} views put back; declined or without a drawable: "
      f"{sum(1 for line in lines if line.startswith(('DECLINED', 'NO_DRAWABLE')))}")
