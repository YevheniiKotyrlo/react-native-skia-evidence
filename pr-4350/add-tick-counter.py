"""Evidence only: counts each SkiaView's display-link ticks and writes one line a second to the app's Documents, as
#4273 measured with a once-per-second tick counter in onFrame. Edits packages/skia/apple/SkiaView.mm in place, on
main and on the fix alike, so that the same probe measures both.
    python3 add-tick-counter.py <worktree>
"""
import pathlib
import sys

path = pathlib.Path(sys.argv[1]) / "packages/skia/apple/SkiaView.mm"
source = path.read_text()


def insert_after(text: str, anchor: str, addition: str) -> str:
    if text.count(anchor) != 1:
        raise SystemExit(f"anchor not found once: {anchor!r}")
    return text.replace(anchor, anchor + addition)


source = insert_after(
    source,
    "  bool _fullFrameRateRequested;\n",
    "  NSUInteger _probeTicks;\n  CFTimeInterval _probeSince;\n",
)
source = insert_after(
    source,
    "- (void)onFrame:(CADisplayLink *)link {\n",
    "  [self probeTick:link];\n",
)
source = insert_after(
    source,
    "  [_displayLink invalidate];\n  _displayLink = nil;\n",
    "  _probeTicks = 0;\n  _probeSince = 0;\n  [self probeWrite:[NSString stringWithFormat:@\"stop view=%p\", self]];\n",
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
    return;
  }
  const CFTimeInterval elapsed = link.timestamp - _probeSince;
  if (elapsed >= 1.0) {
    [self probeWrite:[NSString stringWithFormat:@"ticks view=%p %lu in %.3f s preferredMax=%.0f", self,
                                                (unsigned long)_probeTicks, elapsed,
                                                link.preferredFrameRateRange.maximum]];
    _probeTicks = 0;
    _probeSince = link.timestamp;
  }
}
#endif
""",
)
path.write_text(source)
print(f"tick counter added to {path}")
