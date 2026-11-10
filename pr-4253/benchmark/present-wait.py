"""What the app's present thread waited for in a trace trace-present-wait.sh recorded.

python present-wait.py <trace> [<trace> ...]

For each trace: the present thread's (RNSkia Present) time running and blocked over the trace, and for the swapchain's
present (QueuePresentKHR, libvulkan's swapchain) and acquire (AcquireNextImageKHR) and libgui's queueBuffer and
dequeueBuffer, the count and the median, 90th percentile and total of their durations, counting a slice nested in one
of the same name once; then how much of them was a fence wait (libui's Fence::waitForever), which on a producer libgui
throttles is the wait for the GPU to finish the frame before the one presented. Then the thread's ten longest slice
names by total time.
"""

import statistics
import sys

from perfetto.trace_processor import TraceProcessor

PACKAGE = "com.reactnativeskia.example"
PRESENT_THREAD = "RNSkia Present"
WATCHED = ["QueuePresentKHR", "queueBuffer", "AcquireNextImageKHR", "dequeueBuffer", "waitForever"]


def milliseconds(nanoseconds):
    return nanoseconds / 1e6


def summarize(durations):
    if not durations:
        return "none"
    ordered = sorted(durations)
    p90 = ordered[min(len(ordered) - 1, int(0.9 * len(ordered)))]
    return (
        f"n={len(ordered)} median={milliseconds(statistics.median(ordered)):.2f} ms "
        f"p90={milliseconds(p90):.2f} ms total={milliseconds(sum(ordered)):.1f} ms"
    )


def analyze(trace_path):
    processor = TraceProcessor(trace=trace_path)
    threads = list(
        processor.query(
            f"""
            select t.utid, t.tid, t.name from thread t join process p using(upid)
            where p.name like '{PACKAGE}%' and t.name like '{PRESENT_THREAD}%'
            """
        )
    )
    print(f"== {trace_path}")
    if not threads:
        print("   no present thread in the trace")
        return
    bounds = next(iter(processor.query("select start_ts, end_ts from trace_bounds")))
    span = bounds.end_ts - bounds.start_ts
    for thread in threads:
        states = {
            row.state: row.total
            for row in processor.query(
                f"""
                select state, sum(dur) as total from thread_state
                where utid = {thread.utid} group by state
                """
            )
        }
        running = states.get("Running", 0)
        print(
            f"   thread {thread.name} ({thread.tid}) over {milliseconds(span):.0f} ms: "
            f"running {milliseconds(running):.0f} ms, "
            + ", ".join(f"{state} {milliseconds(total):.0f} ms" for state, total in sorted(states.items()) if state != "Running")
        )
        slices = list(
            processor.query(
                f"""
                select s.id, s.name, s.dur, s.parent_id from slice s join thread_track tt on s.track_id = tt.id
                where tt.utid = {thread.utid} and s.dur > 0
                """
            )
        )
        by_id = {row.id: row for row in slices}

        def has_ancestor_named(row, name):
            parent = by_id.get(row.parent_id)
            while parent is not None:
                if parent.name == name:
                    return True
                parent = by_id.get(parent.parent_id)
            return False

        for name in WATCHED:
            durations = [row.dur for row in slices if row.name == name and not has_ancestor_named(row, name)]
            print(f"   {name}: {summarize(durations)}")
        for outer in ["QueuePresentKHR", "AcquireNextImageKHR"]:
            waits = [
                row.dur
                for row in slices
                if row.name == "waitForever" and has_ancestor_named(row, outer)
            ]
            print(f"   waitForever inside {outer}: {summarize(waits)}")
        totals = {}
        for row in slices:
            totals[row.name] = totals.get(row.name, 0) + row.dur
        longest = sorted(totals.items(), key=lambda item: -item[1])[:10]
        print("   longest: " + "; ".join(f"{name} {milliseconds(total):.0f} ms" for name, total in longest))


for path in sys.argv[1:]:
    analyze(path)
