// SkiaImageView.web's two ways of scaling an image past the largest canvas, timed in Chromium on the checkout's
// CanvasKit: the raster path (a full readback into a raster copy, mipmapped on the
// CPU, the scaled pixels read) and the GPU path (the image drawn mipmapped on a WebGL render target of the scaled
// size, its pixels read); and whether the GPU path draws a CPU image wider than the GPU's largest texture.
// --gpu asks Chromium for the machine's GPU, through Direct3D 11 on Windows; without it Chromium draws on SwiftShader.
//   node web-scale-paths.mjs <react-native-skia checkout> <output.json> [--gpu]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const [worktree, output, gpuFlag] = process.argv.slice(2);
const require = createRequire(join(worktree, "package.json"));
const { chromium } = require("playwright");
const canvasKitDir = join(worktree, "node_modules", "canvaskit-wasm", "bin");
const gpuArgs = ["--ignore-gpu-blocklist", "--enable-gpu", ...(process.platform === "win32" ? ["--use-angle=d3d11"] : [])];
const args = gpuFlag === "--gpu" ? gpuArgs : [];
const browser = await chromium.launch({ args });
const page = await browser.newPage();
await page.route("http://probe.local/**", (route) => {
  const name = new URL(route.request().url()).pathname.slice(1);
  if (name === "") {
    return route.fulfill({ contentType: "text/html", body: "<!doctype html><body></body>" });
  }
  const types = { js: "text/javascript", wasm: "application/wasm" };
  return route.fulfill({
    contentType: types[name.split(".").pop()],
    body: readFileSync(join(canvasKitDir, name)),
  });
});
await page.goto("http://probe.local/");
await page.addScriptTag({ url: "http://probe.local/canvaskit.js" });
const result = await page.evaluate(async () => {
  const CanvasKit = await window.CanvasKitInit({ locateFile: (file) => `http://probe.local/${file}` });
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  document.body.appendChild(canvas);
  const handle = CanvasKit.GetWebGLContext(canvas, { antialias: 0, depth: 0, stencil: 0, alpha: 1 });
  const grContext = CanvasKit.MakeWebGLContext(handle);
  const probeGl = document.createElement("canvas").getContext("webgl2");
  const debug = probeGl.getExtension("WEBGL_debug_renderer_info");
  const renderer = debug ? probeGl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : probeGl.getParameter(probeGl.RENDERER);
  const maxTextureSize = probeGl.getParameter(probeGl.MAX_TEXTURE_SIZE);
  const readInfo = (width, height) => ({
    width,
    height,
    colorType: CanvasKit.ColorType.RGBA_8888,
    alphaType: CanvasKit.AlphaType.Unpremul,
    colorSpace: CanvasKit.ColorSpace.SRGB,
  });
  // As SkiaImageView.web's encodedSizeOf: at most 4096 x 4096 pixels, and 32767 on a side.
  const encodedSize = (width, height) => {
    const scale = Math.min(1, Math.sqrt((4096 * 4096) / (width * height)), 32767 / width, 32767 / height);
    return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))];
  };
  const drawScaled = (surface, image, width, height) => {
    surface
      .getCanvas()
      .drawImageRectOptions(
        image,
        CanvasKit.XYWHRect(0, 0, image.width(), image.height()),
        CanvasKit.XYWHRect(0, 0, width, height),
        CanvasKit.FilterMode.Linear,
        CanvasKit.MipmapMode.Linear,
        null
      );
    surface.flush();
    const scaled = surface.makeImageSnapshot();
    const pixels = scaled.readPixels(0, 0, readInfo(width, height));
    scaled.delete();
    surface.delete();
    return pixels;
  };
  const rasterPath = (image, width, height) => {
    const info = image.getImageInfo();
    const full = image.readPixels(0, 0, { ...info, colorSpace: CanvasKit.ColorSpace.SRGB });
    const raster = CanvasKit.MakeImage({ ...info, colorSpace: CanvasKit.ColorSpace.SRGB }, full, info.width * 4);
    const pixels = drawScaled(CanvasKit.MakeSurface(width, height), raster, width, height);
    raster.delete();
    return pixels;
  };
  const gpuPath = (image, width, height) => {
    const target = CanvasKit.MakeRenderTarget(grContext, width, height);
    return target === null ? null : drawScaled(target, image, width, height);
  };
  const meanDifference = (first, second) => {
    let sum = 0;
    for (let index = 0; index < first.length; index++) {
      sum += Math.abs(first[index] - second[index]);
    }
    return sum / first.length;
  };
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  // A 24-megapixel GPU image of fine stripes over a gradient, made as a view's offscreen drawing is.
  const photoWidth = 6000;
  const photoHeight = 4000;
  const source = CanvasKit.MakeRenderTarget(grContext, photoWidth, photoHeight);
  const sourceCanvas = source.getCanvas();
  const paint = new CanvasKit.Paint();
  paint.setShader(
    CanvasKit.Shader.MakeLinearGradient([0, 0], [photoWidth, photoHeight], [CanvasKit.CYAN, CanvasKit.MAGENTA], null, CanvasKit.TileMode.Clamp)
  );
  sourceCanvas.drawPaint(paint);
  const stripe = new CanvasKit.Paint();
  stripe.setColor(CanvasKit.BLACK);
  for (let x = 0; x < photoWidth; x += 2) {
    sourceCanvas.drawRect(CanvasKit.XYWHRect(x, 0, 1, photoHeight), stripe);
  }
  source.flush();
  const photo = source.makeImageSnapshot();
  const [width, height] = encodedSize(photoWidth, photoHeight);
  const timings = { raster: [], gpu: [] };
  let raster = null;
  let gpu = null;
  for (let round = 0; round < 5; round++) {
    for (const path of round % 2 === 0 ? ["raster", "gpu"] : ["gpu", "raster"]) {
      const started = performance.now();
      const pixels = path === "raster" ? rasterPath(photo, width, height) : gpuPath(photo, width, height);
      timings[path].push(performance.now() - started);
      if (path === "raster") {
        raster = pixels;
      } else {
        gpu = pixels;
      }
    }
  }
  // A CPU image half again as wide as the GPU's largest texture, all red, whose encoded size the GPU takes.
  const wideWidth = maxTextureSize * 1.5;
  const wideHeight = Math.ceil((4096 * 4096 * 2.25) / wideWidth / 256) * 256;
  const widePixels = new Uint8Array(wideWidth * wideHeight * 4);
  for (let index = 0; index < widePixels.length; index += 4) {
    widePixels[index] = 255;
    widePixels[index + 3] = 255;
  }
  const wide = CanvasKit.MakeImage(
    { width: wideWidth, height: wideHeight, colorType: CanvasKit.ColorType.RGBA_8888, alphaType: CanvasKit.AlphaType.Unpremul, colorSpace: CanvasKit.ColorSpace.SRGB },
    widePixels,
    wideWidth * 4
  );
  const [wideEncodedWidth, wideEncodedHeight] = encodedSize(wideWidth, wideHeight);
  const wideOnGpu = gpuPath(wide, wideEncodedWidth, wideEncodedHeight);
  let wideNonRed = null;
  if (wideOnGpu !== null) {
    wideNonRed = 0;
    for (let index = 0; index < wideOnGpu.length; index += 4) {
      if (wideOnGpu[index] < 250 || wideOnGpu[index + 1] > 5 || wideOnGpu[index + 2] > 5 || wideOnGpu[index + 3] < 250) {
        wideNonRed++;
      }
    }
  }
  return {
    renderer,
    maxTextureSize,
    photo: [photoWidth, photoHeight],
    encoded: [width, height],
    rasterMilliseconds: timings.raster.map((value) => Math.round(value)),
    gpuMilliseconds: timings.gpu.map((value) => Math.round(value)),
    rasterMedian: Math.round(median(timings.raster)),
    gpuMedian: Math.round(median(timings.gpu)),
    meanByteDifference: raster && gpu ? Math.round(meanDifference(raster, gpu) * 100) / 100 : null,
    wideCpuImage: [wideWidth, wideHeight],
    wideEncoded: [wideEncodedWidth, wideEncodedHeight],
    widePixelsNotRedOnGpu: wideNonRed,
    widePixelsOnGpu: wideOnGpu === null ? null : wideOnGpu.length / 4,
  };
});
writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await browser.close();
