// Crops the middle of a captured screen at its own pixels, the region the minified cases read, for the evidence.
//   bun crop-capture.ts <input.png> <output.png> <width> <height>, from the repository root, where pngjs is installed
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const [input, output, widthText, heightText] = process.argv.slice(2);
const source = PNG.sync.read(readFileSync(input));
const width = Math.min(Number(widthText), source.width);
const height = Math.min(Number(heightText), source.height);
const left = Math.floor((source.width - width) / 2);
const top = Math.floor((source.height - height) / 2);
const crop = new PNG({ width, height });
PNG.bitblt(source, crop, left, top, width, height, 0, 0);
writeFileSync(output, PNG.sync.write(crop));
console.log(`${output}: ${width}x${height} from the middle of ${source.width}x${source.height}`);
