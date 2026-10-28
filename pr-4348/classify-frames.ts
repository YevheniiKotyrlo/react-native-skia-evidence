// Classifies each loss's snapshot pair of a ProducerDeviceLoss run (screen-sequence.patch's numbered PNGs: the first
// one the mount, then a before and an after per loss): where the cyan square's left edge is in each, and whether the
// pair is identical. A pair where neither snapshot shows the square cannot tell a stalled canvas from a square outside
// the captured area.
//   bun classify-frames.ts <screens folder>...
import { readdirSync } from "node:fs";
import { join } from "node:path";

const SIDE = 768;

interface Frame {
  readonly name: string;
  readonly squareLeft: number | null;
  readonly pixels: Uint8Array;
}

const isCyan = (pixels: Uint8Array, offset: number): boolean =>
  pixels[offset] < 64 && pixels[offset + 1] > 192 && pixels[offset + 2] > 192;

const readFrame = (folder: string, name: string): Frame => {
  const path = join(folder, name);
  const decoded = Bun.spawnSync(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  if (decoded.exitCode !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${decoded.stderr.toString()}`);
  }
  const pixels = new Uint8Array(decoded.stdout);
  let squareLeft: number | null = null;
  for (let x = 0; x < SIDE && squareLeft === null; x++) {
    if (isCyan(pixels, x * 3)) {
      squareLeft = x;
    }
  }
  return { name, squareLeft, pixels };
};

const identical = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length && first.every((channel, index) => channel === second[index]);

const describe = (frame: Frame): string => (frame.squareLeft === null ? "no square" : `square at ${frame.squareLeft}`);

for (const folder of process.argv.slice(2)) {
  const names = readdirSync(folder)
    .filter((name) => name.endsWith(".png"))
    .sort();
  console.log(folder);
  for (let index = 1; index + 1 < names.length; index += 2) {
    const before = readFrame(folder, names[index]);
    const after = readFrame(folder, names[index + 1]);
    const verdict = identical(before.pixels, after.pixels)
      ? before.squareLeft === null
        ? "SAME, no square in either: undecidable"
        : "SAME with the square in view: stalled"
      : "moved";
    console.log(
      `  loss ${(index + 1) / 2}: ${describe(before)} -> ${describe(after)}: ${verdict}`
    );
  }
}
