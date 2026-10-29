"""Evidence only: counts each SkiaView's display-link ticks and writes one line a second to the app's Documents, as
#4273 measured with a once-per-second tick counter in onFrame, with the link's preferred maximum, the screen's maximum
rate, and the time scheduleFrame spends on the display link — making it where there is none, asking for the full rate
wherever the tree does it there, and unpausing it — which is what a frame pays for the request on every tree: each call
is timed, and each second's line gives the calls' median and their mean without the slowest tenth, which a preemption
of the main thread mid-call lands in, beside the plain mean. Edits packages/skia/apple/SkiaView.mm in place, alike on
every tree it measures, so that the same probe measures each.
With --window-less-link it also schedules a frame at the end of willMoveToSuperview:, where the view has its new
superview and no window yet, so that every phase makes its display link before the view is in a window, as a frame
scheduled by a redraw there does; with --drop-did-move-to-window it removes the tree's didMoveToWindow, the mutant that
shows whether that override is what asks then.
    python3 add-tick-counter.py <worktree> [--window-less-link] [--drop-did-move-to-window]
"""
import pathlib
import sys

path = pathlib.Path(sys.argv[1]) / "packages/skia/apple/SkiaView.mm"
options = set(sys.argv[2:])
source = path.read_text()


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f"text not found once: {old!r}")
    return text.replace(old, new)


def insert_after(text: str, anchor: str, addition: str) -> str:
    return replace_once(text, anchor, anchor + addition)


source = insert_after(
    source, "#import <QuartzCore/CATransaction.h>\n", "#import <mach/mach_time.h>\n\n#include <algorithm>\n"
)
source = insert_after(
    source,
    "  CADisplayLink *_displayLink;\n",
    "  NSUInteger _probeTicks;\n  CFTimeInterval _probeSince;\n  NSUInteger _probeScheduled;\n"
    "  uint64_t _probeScheduleTime;\n  uint64_t _probeScheduleSamples[512];\n",
)
source = replace_once(
    source,
    "#if !TARGET_OS_OSX\n  if (_displayLink == nil) {\n    _displayLink = [CADisplayLink",
    "#if !TARGET_OS_OSX\n  const uint64_t probeScheduleStart = mach_absolute_time();\n"
    "  const bool probeMakesLink = _displayLink == nil;\n"
    "  if (_displayLink == nil) {\n    _displayLink = [CADisplayLink",
)
source = insert_after(
    source,
    "  _displayLink.paused = NO;\n",
    "  const uint64_t probeScheduleDuration = mach_absolute_time() - probeScheduleStart;\n"
    "  if (probeMakesLink) {\n"
    "    [self probeWrite:[NSString stringWithFormat:@\"link made view=%p ns=%.1f\", self,\n"
    "                                                [self probeNanoseconds:probeScheduleDuration]]];\n"
    "  } else {\n"
    "    if (_probeScheduled < 512) {\n"
    "      _probeScheduleSamples[_probeScheduled] = probeScheduleDuration;\n"
    "    }\n"
    "    _probeScheduleTime += probeScheduleDuration;\n"
    "    _probeScheduled += 1;\n"
    "  }\n",
)
window_anchor = "- (void)didMoveToWindow {\n  [super didMoveToWindow];\n  [self requestFullFrameRate];\n"
if source.count(window_anchor) == 1:
    source = source.replace(
        window_anchor,
        "- (void)didMoveToWindow {\n  [super didMoveToWindow];\n"
        "  const uint64_t probeWindowStart = mach_absolute_time();\n"
        "  [self requestFullFrameRate];\n"
        "  const uint64_t probeWindowDuration = mach_absolute_time() - probeWindowStart;\n"
        "  [self probeWrite:[NSString stringWithFormat:@\"window moved view=%p link=%d window=%d ns=%.1f\", self,\n"
        "                                              _displayLink != nil, self.window != nil,\n"
        "                                              [self probeNanoseconds:probeWindowDuration]]];\n",
    )
source = insert_after(source, "- (void)onFrame:(CADisplayLink *)link {\n", "  [self probeTick:link];\n")
source = insert_after(
    source,
    "  [_displayLink invalidate];\n  _displayLink = nil;\n",
    "  _probeTicks = 0;\n  _probeSince = 0;\n  _probeScheduled = 0;\n  _probeScheduleTime = 0;\n"
    "  [self probeWrite:[NSString stringWithFormat:@\"stop view=%p\", self]];\n",
)
source = insert_after(
    source,
    "#pragma mark - Frames\n",
    """
- (double)probeNanoseconds:(uint64_t)duration {
  static mach_timebase_info_data_t timebase;
  if (timebase.denom == 0) {
    mach_timebase_info(&timebase);
  }
  return (double)duration * timebase.numer / timebase.denom;
}

- (void)probeWrite:(NSString *)event {
  NSURL *documents = [[NSFileManager defaultManager] URLsForDirectory:NSDocumentDirectory
                                                            inDomains:NSUserDomainMask].firstObject;
  NSString *file = [documents URLByAppendingPathComponent:@"display-link-ticks.txt"].path;
  NSString *line = [NSString stringWithFormat:@"%.3f %@\\n", CACurrentMediaTime(), event];
  if (![[NSFileManager defaultManager] fileExistsAtPath:file]) {
    [line writeToFile:file atomically:NO encoding:NSUTF8StringEncoding error:nil];
    return;
  }
  NSFileHandle *handle = [NSFileHandle fileHandleForWritingAtPath:file];
  [handle seekToEndOfFile];
  [handle writeData:[line dataUsingEncoding:NSUTF8StringEncoding]];
  [handle closeFile];
}

#if !TARGET_OS_OSX
- (void)probeTick:(CADisplayLink *)link {
  _probeTicks += 1;
  if (_probeSince == 0) {
    _probeSince = link.timestamp;
    _probeTicks = 0;
    _probeScheduled = 0;
    _probeScheduleTime = 0;
    return;
  }
  const CFTimeInterval elapsed = link.timestamp - _probeSince;
  if (elapsed >= 1.0) {
    static mach_timebase_info_data_t timebase;
    if (timebase.denom == 0) {
      mach_timebase_info(&timebase);
    }
    const double nanosecondsPerUnit = (double)timebase.numer / timebase.denom;
    const NSUInteger sampled = std::min<NSUInteger>(_probeScheduled, 512);
    std::sort(_probeScheduleSamples, _probeScheduleSamples + sampled);
    const NSUInteger kept = sampled - sampled / 10;
    uint64_t keptTime = 0;
    for (NSUInteger index = 0; index < kept; index += 1) {
      keptTime += _probeScheduleSamples[index];
    }
    const double meanNanoseconds =
        _probeScheduled == 0 ? 0 : (double)_probeScheduleTime * nanosecondsPerUnit / _probeScheduled;
    const double medianNanoseconds = sampled == 0 ? 0 : _probeScheduleSamples[sampled / 2] * nanosecondsPerUnit;
    const double trimmedNanoseconds = kept == 0 ? 0 : (double)keptTime * nanosecondsPerUnit / kept;
    [self probeWrite:[NSString stringWithFormat:@"ticks view=%p %lu in %.3f s preferredMax=%.0f scheduled=%lu "
                                                @"scheduleNs=%.1f scheduleMedianNs=%.1f scheduleTrimmedNs=%.1f "
                                                @"screenMax=%ld",
                                                self, (unsigned long)_probeTicks, elapsed,
                                                link.preferredFrameRateRange.maximum, (unsigned long)_probeScheduled,
                                                meanNanoseconds, medianNanoseconds, trimmedNanoseconds,
                                                (long)self.window.screen.maximumFramesPerSecond]];
    _probeTicks = 0;
    _probeScheduled = 0;
    _probeScheduleTime = 0;
    _probeSince = link.timestamp;
  }
}
#endif
""",
)
if "--window-less-link" in options:
    source = replace_once(
        source,
        "      [weakSelf](bool /* forResizedWindow */) { [weakSelf scheduleFrame]; });\n}\n",
        "      [weakSelf](bool /* forResizedWindow */) { [weakSelf scheduleFrame]; });\n"
        "  if (self.window == nil) {\n"
        "    [self probeWrite:[NSString stringWithFormat:@\"frame scheduled without a window view=%p\", self]];\n"
        "    [self scheduleFrame];\n"
        "  }\n}\n",
    )
if "--drop-did-move-to-window" in options:
    start = source.index("- (void)didMoveToWindow {\n")
    end = source.index("}\n", start) + 2
    source = source[:start] + source[end:]
path.write_text(source)
print(f"probe added to {path}{''.join(' ' + option for option in sorted(options))}")
