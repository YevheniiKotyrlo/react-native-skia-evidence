// Summarizes the display-link tick probe's rounds: each round's file (add-tick-counter.py's lines) is divided at its
// stop lines into the phases probe-entry.js steps through, and each phase gives the median of its one-second
// readings in ticks per second; the rounds then give each phase's median and range per side.
//   bun summarize-ticks.ts <side folder>...
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PHASES = ["mounted", "after a trip out of its superview", "after a recycle"] as const;
type Phase = (typeof PHASES)[number];

interface Reading {
  readonly ticksPerSecond: number;
  readonly preferredMax: number;
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const tickLine = /ticks view=\S+ (\d+) in ([\d.]+) s preferredMax=(\d+)/;

// A phase ends at a burst of stop lines: one when the view leaves its superview, and two when it is unmounted, as it
// leaves its superview and is recycled. Stops less than half a second apart are one burst.
const BURST_SECONDS = 0.5;

const phasesOf = (text: string): ReadonlyMap<Phase, readonly Reading[]> => {
  const phases = new Map<Phase, Reading[]>(PHASES.map((phase) => [phase, []]));
  let phaseIndex = 0;
  let lastStopAt = Number.NEGATIVE_INFINITY;
  for (const line of text.split("\n")) {
    const at = Number(line.split(" ", 1)[0]);
    if (line.includes(" stop view=")) {
      if (at - lastStopAt > BURST_SECONDS) {
        phaseIndex = Math.min(phaseIndex + 1, PHASES.length - 1);
      }
      lastStopAt = at;
      continue;
    }
    const match = tickLine.exec(line);
    if (match === null) {
      continue;
    }
    const reading = { ticksPerSecond: Number(match[1]) / Number(match[2]), preferredMax: Number(match[3]) };
    phases.get(PHASES[phaseIndex])?.push(reading);
  }
  return phases;
};

for (const folder of process.argv.slice(2)) {
  const rounds = readdirSync(folder)
    .filter((name) => /^round-\d+\.txt$/.test(name))
    .sort()
    .map((name) => phasesOf(readFileSync(join(folder, name), "utf8")));
  console.log(`${basename(folder)}: ${rounds.length} rounds`);
  for (const phase of PHASES) {
    const roundMedians = rounds
      .map((round) => round.get(phase) ?? [])
      .filter((readings) => readings.length > 0)
      .map((readings) => median(readings.map((reading) => reading.ticksPerSecond)));
    const preferred = rounds.flatMap((round) => (round.get(phase) ?? []).map((reading) => reading.preferredMax));
    if (roundMedians.length === 0) {
      console.log(`  ${phase}: no readings`);
      continue;
    }
    console.log(
      `  ${phase}: ${median(roundMedians).toFixed(0)} ticks/s (${Math.min(...roundMedians).toFixed(0)}–${Math.max(...roundMedians).toFixed(0)}), preferred max ${[...new Set(preferred)].join("/")}`
    );
  }
}
