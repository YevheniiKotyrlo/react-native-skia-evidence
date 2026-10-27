"""The mutant the odd-sided case is red on, for the native halving: PresentedImage's halving back to
createScaledBitmap, which scales an odd side by (n / 2) / n. Run from the worktree to apply it, with --reverse to take
it out again.
    python -I mutant-scaled-halving.py [--reverse]"""
import os
import sys

PATH = "packages/skia/android/src/main/java/com/reactnative/skia/PresentedImage.java"
START = "            Bitmap half = Bitmap.createBitmap(Math.max(1, bitmap.getWidth() / 2), Math.max(1, bitmap.getHeight() / 2),\n"
END = "            return half;\n        }\n\n        @Override\n        public boolean isSmallest"
SCALED = """            return Bitmap.createScaledBitmap(bitmap, Math.max(1, bitmap.getWidth() / 2),
                    Math.max(1, bitmap.getHeight() / 2), true);
        }

        @Override
        public boolean isSmallest"""
SAVED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "native-halving-body.saved")

text = open(PATH, encoding="utf-8", newline="").read()
if "--reverse" in sys.argv:
    original = open(SAVED, encoding="utf-8", newline="").read()
    assert text.count(SCALED) == 1, SCALED
    open(PATH, "w", encoding="utf-8", newline="").write(text.replace(SCALED, original))
    os.remove(SAVED)
    print("mutant reversed")
else:
    assert text.count(START) == 1 and text.count(END) == 1, "the native halving is not where the mutant expects it"
    begin = text.index(START)
    end = text.index(END) + len(END)
    open(SAVED, "w", encoding="utf-8", newline="").write(text[begin:end])
    open(PATH, "w", encoding="utf-8", newline="").write(text[:begin] + SCALED + text[end:])
    print("mutant applied")
