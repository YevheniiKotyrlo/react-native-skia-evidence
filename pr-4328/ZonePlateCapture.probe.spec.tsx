import fs from "fs";
import path from "path";

import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// Writes the zone plate as the device shows it to CAPTURE_DIRECTORY.
describe("Zone plate, captured (probe)", () => {
  itRunsE2eOnly("captures the zone plate", async () => {
    const directory = process.env.CAPTURE_DIRECTORY ?? "";
    expect(directory).not.toBe("");
    const image = await surface.screen("ZonePlate");
    fs.writeFileSync(path.join(directory, "ZonePlate.png"), image.encodeToBytes());
  });
});
