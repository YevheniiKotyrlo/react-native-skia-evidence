import fs from "fs";
import path from "path";

import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// Writes the force-dark screens as the device shows them, the evidence's
// before and after: CAPTURE_DIRECTORY names the folder by its absolute path,
// since Jest runs in packages/skia.
describe("Force-dark screens, captured (probe)", () => {
  itRunsE2eOnly.each(["CanvasAboveImageView", "CanvasAboveStaticCanvas"])(
    "captures %s",
    async (screen) => {
      const directory = process.env.CAPTURE_DIRECTORY ?? "";
      expect(path.isAbsolute(directory)).toBe(true);
      const image = await surface.screen(screen);
      fs.writeFileSync(
        path.join(directory, `${screen}.png`),
        image.encodeToBytes()
      );
    }
  );
});
