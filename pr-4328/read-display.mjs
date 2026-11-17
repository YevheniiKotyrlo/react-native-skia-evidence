// The middle of the test screen in each display capture the on-screen probe wrote, read as the e2e
// spec's readMiddleLuminance reads a snapshot: its middle the central half of the screen's width and of its height,
// the luminance's mean and standard deviation, 0 to 255, Rec. 709 weights.
// With --crop <folder>, it also writes each middle at its own pixels, as <capture's name>-middle.png there.
//   node read-display.mjs <canvaskit folder> [--crop <folder>] <capture.png>...
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [canvasKitFolder, ...rest] = process.argv.slice(2);
const cropFolder = rest[0] === "--crop" ? rest[1] : undefined;
const captures = cropFolder === undefined ? rest : rest.slice(2);
const require = createRequire(import.meta.url);
const CanvasKitInit = require(join(canvasKitFolder, "canvaskit.js"));
const CanvasKit = await CanvasKitInit({ locateFile: (file) => join(canvasKitFolder, file) });

const luminanceAt = (pixels, width, x, y) => {
  const index = 4 * (y * width + x);
  return 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
};

// The test screen: the longest run of rows with many dark pixels near the display's left edge, the stripes being half
// dark, and in its middle row the columns up to the first run of white wide enough to be no stripe.
const screenBounds = (pixels, width, height) => {
  const dark = (x, y) => luminanceAt(pixels, width, x, y) < 250;
  const span = Math.min(width, 1024);
  const isScreenRow = (y) => {
    let darkCount = 0;
    for (let x = 0; x < span; x++) darkCount += dark(x, y) ? 1 : 0;
    return darkCount > span / 8;
  };
  let best = { top: -1, length: 0 };
  let runTop = -1;
  for (let y = 0; y <= height; y++) {
    if (y < height && isScreenRow(y)) {
      runTop = runTop < 0 ? y : runTop;
      continue;
    }
    if (runTop >= 0 && y - runTop > best.length) best = { top: runTop, length: y - runTop };
    runTop = -1;
  }
  if (best.top < 0) throw new Error("no screen near the display's left edge");
  const row = best.top + Math.floor(best.length / 2);
  let right = 0;
  let whiteRun = 0;
  for (let x = 0; x < width; x++) {
    whiteRun = dark(x, row) ? 0 : whiteRun + 1;
    if (whiteRun > 8) break;
    if (whiteRun === 0) right = x;
  }
  return { left: 0, top: best.top, width: right + 1, height: best.length };
};

for (const capture of captures) {
  const image = CanvasKit.MakeImageFromEncoded(readFileSync(capture));
  if (image === null) throw new Error(`${capture} is no image`);
  const width = image.width();
  const height = image.height();
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: CanvasKit.ColorType.RGBA_8888,
    alphaType: CanvasKit.AlphaType.Unpremul,
    colorSpace: CanvasKit.ColorSpace.SRGB,
  });
  const screen = screenBounds(pixels, width, height);
  const left = screen.left + Math.round(screen.width / 4);
  const top = screen.top + Math.round(screen.height / 4);
  const middleWidth = Math.round(screen.width / 2);
  const middleHeight = Math.round(screen.height / 2);
  let sum = 0;
  let sumOfSquares = 0;
  for (let y = top; y < top + middleHeight; y++) {
    for (let x = left; x < left + middleWidth; x++) {
      const luminance = luminanceAt(pixels, width, x, y);
      sum += luminance;
      sumOfSquares += luminance * luminance;
    }
  }
  const count = middleWidth * middleHeight;
  const mean = sum / count;
  const deviation = Math.sqrt(Math.max(0, sumOfSquares / count - mean * mean));
  if (cropFolder !== undefined) {
    const surface = CanvasKit.MakeSurface(middleWidth, middleHeight);
    surface.getCanvas().drawImageRect(
      image,
      CanvasKit.XYWHRect(left, top, middleWidth, middleHeight),
      CanvasKit.XYWHRect(0, 0, middleWidth, middleHeight),
      null
    );
    const middle = surface.makeImageSnapshot();
    const output = join(cropFolder, `${basename(capture, ".png")}-middle.png`);
    writeFileSync(output, middle.encodeToBytes());
    middle.delete();
    surface.delete();
  }
  console.log(
    `${capture}: screen ${screen.width}x${screen.height} at (${screen.left}, ${screen.top}) of ${width}x${height}; middle mean ${mean.toFixed(2)} deviation ${deviation.toFixed(2)}`
  );
}
