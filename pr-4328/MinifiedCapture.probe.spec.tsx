import fs from "fs";
import path from "path";

import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// Writes the minified screens as the device shows them, the evidence's before
// and after: CAPTURE_DIRECTORY names the folder.
describe("Minified screens, captured (probe)", () => {
  itRunsE2eOnly.each(["ImageViewMinified", "ImageViewMinifiedOdd"])(
    "captures %s",
    async (screen) => {
      const directory = process.env.CAPTURE_DIRECTORY ?? "";
      expect(directory).not.toBe("");
      const image = await surface.screen(screen);
      fs.writeFileSync(path.join(directory, `${screen}.png`), image.encodeToBytes());
    }
  );
});
