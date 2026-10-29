// Prints the evidence comment's submit-cost table from base and head run folders of the recorder-trim probe, a row per
// phone: each run's median of 21 rounds of 200 submits, in microseconds, and per side the median of its runs' medians
// with the lowest and the highest of them, the spread a run of the same build shows from one run to the next.
//   bun submit-table.ts <phone>=<base run folder>[+<base run folder>...],<head run folder>[+<head run folder>...] ...
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readSubmitMedian = (runFolder: string): number => {
  const summary = readFileSync(join(runFolder, 'summary.md'), 'utf8');
  const match = /medianMicroseconds=([\d.]+) lowMicroseconds=[\d.]+ highMicroseconds=[\d.]+/.exec(summary);
  if (match?.[1] === undefined) {
    throw new Error(`${runFolder}/summary.md has no submit cost`);
  }
  return Number(match[1]);
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? Number.NaN;
  return sorted.length % 2 === 1 ? upper : ((sorted[middle - 1] ?? Number.NaN) + upper) / 2;
};

const cell = (runFolders: readonly string[]): string => {
  const medians = runFolders.map(readSubmitMedian);
  const shown = (value: number): string => value.toFixed(1);
  return `${shown(median(medians))} µs (${shown(Math.min(...medians))} to ${shown(Math.max(...medians))})`;
};

const rows = process.argv.slice(2).map((argument) => {
  const [phone, folders] = argument.split('=');
  const [base, head] = (folders ?? '').split(',');
  if (phone === undefined || base === undefined || head === undefined) {
    console.error('usage: bun submit-table.ts <phone>=<base run folder>[+...],<head run folder>[+...] ...');
    process.exit(2);
  }
  return `| ${phone} | ${cell(base.split('+'))} | ${cell(head.split('+'))} |`;
});
console.log(['| Phone | `main` with #4353 | this PR |', '| --- | --- | --- |', ...rows].join('\n'));
