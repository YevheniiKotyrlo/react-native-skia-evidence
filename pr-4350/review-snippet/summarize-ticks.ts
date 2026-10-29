// Summarizes the display-link probe's rounds: each round's file (add-tick-counter.py's lines) is divided at its stop
// lines into the phases probe-entry.js steps through. Each phase gives the median of its one-second readings in ticks
// per second, the link's preferred maximum, the screen's maximum rate, and the time scheduleFrame spent in
// requestFullFrameRate per call: the median of the seconds' medians, and the mean without each second's slowest tenth;
// the rounds then give each phase's median and range per side.
//   bun summarize-ticks.ts <side folder>...
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PHASES = ["mounted", "after a trip out of its superview", "after a recycle"] as const;
type Phase = (typeof PHASES)[number];

interface Reading {
  readonly ticksPerSecond: number;
  readonly preferredMax: number;
  readonly screenMax: number;
  readonly requests: number;
  readonly requestMedianNanoseconds: number;
  readonly requestTrimmedNanoseconds: number;
}

type Round = ReadonlyMap<Phase, readonly Reading[]>;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const tickLine =
  /ticks view=\S+ (\d+) in ([\d.]+) s preferredMax=(\d+) requests=(\d+) requestNs=[\d.]+ requestMedianNs=([\d.]+) requestTrimmedNs=([\d.]+) screenMax=(\d+)/;

// A phase ends at a burst of stop lines: one when the view leaves its superview, and two when it is unmounted, as it
// leaves its superview and is recycled. Stops less than half a second apart are one burst.
const BURST_SECONDS = 0.5;

const phasesOf = (text: string): Round => {
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
    phases.get(PHASES[phaseIndex])?.push({
      ticksPerSecond: Number(match[1]) / Number(match[2]),
      preferredMax: Number(match[3]),
      requests: Number(match[4]),
      requestMedianNanoseconds: Number(match[5]),
      requestTrimmedNanoseconds: Number(match[6]),
      screenMax: Number(match[7]),
    });
  }
  return phases;
};

const weightedTrimmedNanoseconds = (readings: readonly Reading[]): number => {
  const requests = readings.reduce((sum, reading) => sum + reading.requests, 0);
  const total = readings.reduce((sum, reading) => sum + reading.requestTrimmedNanoseconds * reading.requests, 0);
  return requests === 0 ? 0 : total / requests;
};

const distinct = (values: readonly number[]): string => [...new Set(values)].join("/");

const range = (values: readonly number[], digits: number): string =>
  `${median(values).toFixed(digits)} (${Math.min(...values).toFixed(digits)}–${Math.max(...values).toFixed(digits)})`;

for (const folder of process.argv.slice(2)) {
  const rounds: readonly Round[] = readdirSync(folder)
    .filter((name) => /^round-\d+\.txt$/.test(name))
    .sort()
    .map((name) => phasesOf(readFileSync(join(folder, name), "utf8")));
  console.log(`${basename(folder)}: ${rounds.length} rounds`);
  for (const phase of PHASES) {
    const phaseRounds = rounds.map((round) => round.get(phase) ?? []).filter((readings) => readings.length > 0);
    if (phaseRounds.length === 0) {
      console.log(`  ${phase}: no readings`);
      continue;
    }
    const readings = phaseRounds.flat();
    const ticks = phaseRounds.map((round) => median(round.map((reading) => reading.ticksPerSecond)));
    const medians = phaseRounds.map((round) => median(round.map((reading) => reading.requestMedianNanoseconds)));
    const trimmed = phaseRounds.map(weightedTrimmedNanoseconds);
    const requests = readings.reduce((sum, reading) => sum + reading.requests, 0);
    console.log(
      `  ${phase}: ${range(ticks, 0)} ticks/s, preferred max ${distinct(readings.map((reading) => reading.preferredMax))}, ` +
        `screen max ${distinct(readings.map((reading) => reading.screenMax))}, requestFullFrameRate a call: ` +
        `median ${range(medians, 1)} ns, mean without the slowest tenth ${range(trimmed, 1)} ns, over ${requests} calls`
    );
  }
}
