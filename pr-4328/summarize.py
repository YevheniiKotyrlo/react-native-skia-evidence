"""The web probe's windows per arm (presenter and source): missed frames as the median of the passes with their range,
and each arm's long tasks, from the IMAGE_VIEWS_WEB_PASSES line of a Playwright log.
    python summarize.py <playwright.log>"""
import json
import statistics
import sys
from collections import defaultdict

line = next(text for text in open(sys.argv[1], encoding="utf-8") if "IMAGE_VIEWS_WEB_PASSES " in text)
windows = json.loads(line.split("IMAGE_VIEWS_WEB_PASSES ", 1)[1])
arms = defaultdict(list)
for window in windows:
    arms[(window["source"], window["presenter"])].append(window)
for (source, presenter), entries in arms.items():
    missed = [entry["missedFrames"] for entry in entries]
    tasks = [task for entry in entries for task in entry["longTasks"]]
    task_text = f"{len(tasks)} long tasks, {min(tasks)}–{max(tasks)} ms" if tasks else "no long task"
    by_place = defaultdict(list)
    for entry in entries:
        by_place[entry.get("place", 0)].append(entry["missedFrames"])
    places = ", ".join(f"place {place + 1}: {values}" for place, values in sorted(by_place.items()))
    print(f"{source:14} {presenter:14} missed {statistics.median(missed):g} ({min(missed)}–{max(missed)})"
          f" over {len(missed)} passes; {places}; {task_text}")
