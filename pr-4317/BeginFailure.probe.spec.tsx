// A probe for #4317, run like the e2e specs from
// packages/skia/src/renderer/__tests__/e2e/ with `adb logcat` recording.
// JS contexts hold open the targets the next canvases take, so the frames of
// those canvases cannot begin; logcat says whether the failure is logged.
// Once the recordings close and the canvases are asked to redraw, they draw.
import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkGraphiteContext, SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

interface HeldContexts {
  heldBeginFailureContexts: SkGraphiteContext[];
  heldBeginFailureIds: number[];
}

// Pixels of a screen snapshot in each colour the OnLayout screen paints.
const countColors = (image: SkImage) => {
  const pixels = image.readPixels(0, 0, {
    width: image.width(),
    height: image.height(),
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (pixels === null) {
    return "unreadable";
  }
  const counts = { red: 0, cyan: 0 };
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    if (red > 200 && green < 60 && blue < 60) {
      counts.red++;
    } else if (red < 60 && green > 200 && blue > 200) {
      counts.cyan++;
    }
  }
  return `red ${counts.red}, cyan ${counts.cyan}`;
};

describe("A canvas whose frame cannot begin", () => {
  itRunsE2eOnly(
    "draws nothing while its target's recording is open",
    async () => {
      const control = await surface.screen("OnLayout");
      console.log(`control mount: ${countColors(control)}`);
      // Another screen, so that the next OnLayout is a new canvas.
      await surface.screen("IsOnMainThread");
      const held = await surface.eval(() => {
        const { SkiaViewApi } = globalThis;
        const store = globalThis as unknown as HeldContexts;
        const last = SkiaViewApi.allocateNativeId();
        store.heldBeginFailureContexts = [];
        store.heldBeginFailureIds = [];
        for (let id = last + 1; id <= last + 8; id++) {
          const context = SkiaViewApi.makeGraphiteContext(
            id,
            16,
            16,
            false,
            false
          );
          context.beginRecording();
          store.heldBeginFailureContexts.push(context);
          store.heldBeginFailureIds.push(id);
        }
        return { first: last + 1, last: last + 8 };
      });
      console.log(`held the targets of ids ${held.first} to ${held.last}`);
      const blocked = await surface.screen("OnLayout");
      console.log(`mount while held: ${countColors(blocked)}`);
      await surface.eval(() => {
        const { SkiaViewApi } = globalThis;
        const store = globalThis as unknown as HeldContexts;
        store.heldBeginFailureContexts.forEach((context) =>
          context.finishRecording()
        );
        store.heldBeginFailureIds.forEach((id) =>
          SkiaViewApi.requestRedraw(id)
        );
        store.heldBeginFailureContexts = [];
        store.heldBeginFailureIds = [];
        return true;
      });
      const released = await surface.screen("OnLayout");
      console.log(`redrawn once released: ${countColors(released)}`);
    }
  );
});
