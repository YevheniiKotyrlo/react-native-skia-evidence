"""Evidence only: counts each SkiaView's display-link ticks and writes one line a second to the app's Documents, as
#4273 measured with a once-per-second tick counter in onFrame, with the link's preferred maximum, the screen's maximum
rate, and the time scheduleFrame spends in requestFullFrameRate. Edits packages/skia/apple/SkiaView.mm in place, alike
on every tree it measures, so that the same probe measures each.
    python3 add-tick-counter.py <worktree>
"""
import pathlib
import sys

path = pathlib.Path(sys.argv[1]) / "packages/skia/apple/SkiaView.mm"
source = path.read_text()


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f"text not found once: {old!r}")
    return text.replace(old, new)


def insert_after(text: str, anchor: str, addition: str) -> str:
    return replace_once(text, anchor, anchor + addition)


source = insert_after(source, "#import <QuartzCore/CATransaction.h>\n", "#import <mach/mach_time.h>\n")
source = insert_after(
    source,
    "  CADisplayLink *_displayLink;\n",
    "  NSUInteger _probeTicks;\n  CFTimeInterval _probeSince;\n  NSUInteger _probeRequests;\n  uint64_t _probeRequestTime;\n",
)
source = replace_once(
    source,
    "  [self requestFullFrameRate];\n",
    "  const uint64_t probeRequestStart = mach_absolute_time();\n"
    "  [self requestFullFrameRate];\n"
    "  _probeRequestTime += mach_absolute_time() - probeRequestStart;\n"
    "  _probeRequests += 1;\n",
)
source = insert_after(source, "- (void)onFrame:(CADisplayLink *)link {\n", "  [self probeTick:link];\n")
source = insert_after(
    source,
    "  [_displayLink invalidate];\n  _displayLink = nil;\n",
    "  _probeTicks = 0;\n  _probeSince = 0;\n  _probeRequests = 0;\n  _probeRequestTime = 0;\n"
    "  [self probeWrite:[NSString stringWithFormat:@\"stop view=%p\", self]];\n",
)
source = insert_after(
    source,
    "#pragma mark - Frames\n",
    """
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
    _probeRequests = 0;
    _probeRequestTime = 0;
    return;
  }
  const CFTimeInterval elapsed = link.timestamp - _probeSince;
  if (elapsed >= 1.0) {
    static mach_timebase_info_data_t timebase;
    if (timebase.denom == 0) {
      mach_timebase_info(&timebase);
    }
    const double requestNanoseconds =
        _probeRequests == 0 ? 0
                            : (double)_probeRequestTime * timebase.numer / timebase.denom / _probeRequests;
    [self probeWrite:[NSString stringWithFormat:@"ticks view=%p %lu in %.3f s preferredMax=%.0f requests=%lu "
                                                @"requestNs=%.1f screenMax=%ld",
                                                self, (unsigned long)_probeTicks, elapsed,
                                                link.preferredFrameRateRange.maximum, (unsigned long)_probeRequests,
                                                requestNanoseconds, (long)self.window.screen.maximumFramesPerSecond]];
    _probeTicks = 0;
    _probeRequests = 0;
    _probeRequestTime = 0;
    _probeSince = link.timestamp;
  }
}
#endif
""",
)
path.write_text(source)
print(f"probe added to {path}")
