// Summarizes a run of the canvas draw bench, a folder of launches pairN-base and pairN-head, each with the launch's
// CANVAS_BENCH lines in bench-lines.txt: per arm, each launch's median ns a call, each side's median of its launches with
// their range, the head against the base, the noise floor — the base's launches against each other, the largest gap
// between two of them — and each pair's head minus its base, the launches run back to back.
//   bun summarize-canvas-bench.ts <folder>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const output = process.argv[2];
if (output === undefined) {
  console.error("usage: bun summarize-canvas-bench.ts <folder>");
  process.exit(2);
}

type Side = "base" | "head";
const sides: readonly Side[] = ["base", "head"];

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

// arm -> side -> each launch's median, in pair order
const launchMedians = new Map<string, Map<Side, number[]>>();
const pairNumber = (entry: string) => Number(/^pair(\d+)-/.exec(entry)?.[1]);
const launches = readdirSync(output)
  .filter((entry) => /^pair\d+-(base|head)$/.test(entry))
  .sort((left, right) => pairNumber(left) - pairNumber(right) || left.localeCompare(right));
for (const launch of launches) {
  const side = launch.endsWith("-base") ? "base" : "head";
  const lines = readFileSync(join(output, launch, "bench-lines.txt"), "utf8").split("\n");
  const samples = new Map<string, number[]>();
  for (const line of lines) {
    const match = /arm=(\S+) round=\d+ ms=\S+ nsPerCall=(\S+)/.exec(line);
    if (match === null) continue;
    const arm = match[1]!;
    samples.set(arm, [...(samples.get(arm) ?? []), Number(match[2])]);
  }
  for (const [arm, values] of samples) {
    const bySide = launchMedians.get(arm) ?? new Map<Side, number[]>();
    bySide.set(side, [...(bySide.get(side) ?? []), median(values)]);
    launchMedians.set(arm, bySide);
  }
}

console.log(`launches: ${launches.join(", ")}\n`);
console.log("| Arm | Base, ns a call (launches) | Head, ns a call (launches) | Head − base | Noise floor (base against base) |");
console.log("| --- | --- | --- | --- | --- |");
for (const [arm, bySide] of launchMedians) {
  const cells = sides.map((side) => {
    const values = bySide.get(side) ?? [];
    return { values, median: median(values) };
  });
  const [base, head] = cells as [(typeof cells)[number], (typeof cells)[number]];
  const noiseFloor = Math.max(...base.values) - Math.min(...base.values);
  const difference = head.median - base.median;
  const describe = (cell: (typeof cells)[number]) =>
    `${cell.median.toFixed(1)} (${cell.values.map((value) => value.toFixed(1)).join(", ")})`;
  console.log(
    `| ${arm} | ${describe(base)} | ${describe(head)} | ${difference >= 0 ? "+" : ""}${difference.toFixed(1)} (${((difference / base.median) * 100).toFixed(1)}%) | ${noiseFloor.toFixed(1)} |`
  );
}

console.log("\nEach pair's head minus its base, ns a call:");
for (const [arm, bySide] of launchMedians) {
  const base = bySide.get("base") ?? [];
  const head = bySide.get("head") ?? [];
  const differences = head.map((value, index) => value - (base[index] ?? Number.NaN));
  console.log(`  ${arm}: ${differences.map((difference) => `${difference >= 0 ? "+" : ""}${difference.toFixed(0)}`).join(", ")}`);
}
