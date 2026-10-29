// Prints the evidence comment's table for one phone from summaries of the recorder-trim probe (summarize-probe.ts),
// one or more runs a side: for each step, the base's and the head's readings the probe took at the step itself, what
// the thread's recorders hold and what Dawn has allocated, and for the step after Home, which the probe does not
// read, the process's GPU memory over the baseline from the runner's dump (dumpsys gpu --gpumem where the phone
// reports it, GL mtrack otherwise), which on a slow phone can land after the step it is named for. Each value is the
// median of the side's runs, with the lowest and the highest run where they differ.
//   bun compare-runs.ts <base run folder>... -- <head run folder>...
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface StepRow {
  readonly gpuMemoryOverBaseline: string;
  readonly glMtrackOverBaseline: string;
  readonly recorders: string;
  readonly dawn: string;
}

const steps: readonly (readonly [step: string, label: string])[] = [
  ['js-disposed-5s', "the JS thread's 20 surfaces, 5 s after their dispose"],
  ['js-reduced', '… and Dawn asked to give back what it caches'],
  ['ui-disposed-5s', "the UI runtime's 20, 5 s after"],
  ['worker-disposed-5s', "a worker runtime's 20, 5 s after"],
  ['worker-next-use-5s', '… 5 s after its next surface'],
  ['js-drawing-disposed-5s', "the JS thread's 20 while it draws on every frame, 5 s after"],
  ['js-disposed-on-ui-5s', 'the JS thread\'s 20 disposed on the UI runtime, 5 s after'],
  ['js-shared-on-ui-disposed-5s', "`asImage()` images the UI runtime took of the JS thread's 20, 5 s after their dispose"],
  ['js-snapshots-disposed-5s', 'snapshots taken into `MakeNull()` images, 5 s after those are disposed'],
  ['js-shaders-disposed-15s', 'snapshots shaders hold, 15 s after the shaders are disposed'],
  ['js-view-snapshots-5s', '20 snapshots of a canvas, 5 s after their dispose'],
  ['js-collected-5s', "`drawAsImage`'s surfaces left to the collector, 5 s after"],
  ['hidden-home-10s', '10 s after Home'],
];

const readRows = (runFolder: string): ReadonlyMap<string, StepRow> => {
  const rows = new Map<string, StepRow>();
  for (const line of readFileSync(join(runFolder, 'summary.md'), 'utf8').split('\n')) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [step, , gpuMemoryOverBaseline = '—', , glMtrackOverBaseline = '—', , , recorders = '—', dawn = '—'] = cells;
    if (step !== undefined && step !== 'Step' && step !== '---') {
      rows.set(step, { gpuMemoryOverBaseline, glMtrackOverBaseline, recorders, dawn });
    }
  }
  return rows;
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? Number.NaN;
  return sorted.length % 2 === 1 ? upper : ((sorted[middle - 1] ?? Number.NaN) + upper) / 2;
};

// A side's value at a step: its median, and the lowest and the highest run where the runs differ.
const spread = (readings: readonly string[], signed: boolean): string => {
  const values = readings.map(Number).filter((value) => !Number.isNaN(value));
  if (values.length === 0) {
    return '—';
  }
  const shown = (value: number): string => `${signed && value >= 0 ? '+' : ''}${value.toFixed(1)}`;
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  return lowest === highest ? shown(lowest) : `${shown(median(values))} (${shown(lowest)} to ${shown(highest)})`;
};

const cell = (rows: readonly (StepRow | undefined)[]): string => {
  const read = rows.filter((row): row is StepRow => row !== undefined);
  if (read.length === 0) {
    return '—';
  }
  if (read.every((row) => row.recorders === '—')) {
    const memory = read.map((row) =>
      row.gpuMemoryOverBaseline !== '—' ? row.gpuMemoryOverBaseline : row.glMtrackOverBaseline,
    );
    return `GPU memory ${spread(memory, true)} MB`;
  }
  const recorders = spread(
    read.map((row) => row.recorders.replace(/^\w+: /, '')),
    false,
  );
  const allocated = spread(
    read.map((row) => row.dawn.split(' / ')[0] ?? '—'),
    false,
  );
  return `${recorders} MB · Dawn ${allocated} MB`;
};

const folders = process.argv.slice(2);
const separator = folders.indexOf('--');
const baseFolders = separator < 0 ? folders.slice(0, 1) : folders.slice(0, separator);
const headFolders = separator < 0 ? folders.slice(1, 2) : folders.slice(separator + 1);
if (baseFolders.length === 0 || headFolders.length === 0) {
  console.error('usage: bun compare-runs.ts <base run folder>... -- <head run folder>...');
  process.exit(2);
}
const base = baseFolders.map(readRows);
const head = headFolders.map(readRows);
console.log("| Step: the thread's recorders · Dawn's allocation | `main` with #4353 | this PR |");
console.log('| --- | --- | --- |');
for (const [step, label] of steps) {
  const baseCell = cell(base.map((rows) => rows.get(step)));
  const headCell = cell(head.map((rows) => rows.get(step)));
  console.log(`| ${label} | ${baseCell} | ${headCell} |`);
}
