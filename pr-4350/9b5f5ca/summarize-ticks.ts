// Summarizes the display-link probe's rounds: each round's file (add-tick-counter.py's lines) is divided at its stop
// lines into the phases probe-entry.js steps through. Each phase gives the median of its one-second readings in ticks
// per second, the link's preferred maximum, the screen's maximum rate, the time scheduleFrame spent on the display link
// on a frame whose link already existed (the median of the seconds' medians, and the mean without each second's slowest
// tenth), and what making the phase's link cost; the rounds then give each phase's median and range per side. The
// window moves that found a link, where the tree asks again there, are summed up per side.
//   bun summarize-ticks.ts <side folder>...
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PHASES = ["mounted", "after a trip out of its superview", "after a recycle"] as const;
type Phase = (typeof PHASES)[number];

interface Reading {
  readonly ticksPerSecond: number;
  readonly preferredMax: number;
  readonly screenMax: number;
  readonly scheduled: number;
  readonly scheduleMedianNanoseconds: number;
  readonly scheduleTrimmedNanoseconds: number;
}

interface PhaseRecord {
  readonly readings: readonly Reading[];
  readonly linksMadeNanoseconds: readonly number[];
}

interface Round {
  readonly phases: ReadonlyMap<Phase, PhaseRecord>;
  readonly windowMovesWithLinkNanoseconds: readonly number[];
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const tickLine =
  /ticks view=\S+ (\d+) in ([\d.]+) s preferredMax=(\d+) scheduled=(\d+) scheduleNs=[\d.]+ scheduleMedianNs=([\d.]+) scheduleTrimmedNs=([\d.]+) screenMax=(\d+)/;
const linkMadeLine = /link made view=\S+ ns=([\d.]+)/;
const windowMovedLine = /window moved view=\S+ link=(\d) window=(\d) ns=([\d.]+)/;

// A phase ends at a burst of stop lines: one when the view leaves its superview, and two when it is unmounted, as it
// leaves its superview and is recycled. Stops less than half a second apart are one burst.
const BURST_SECONDS = 0.5;

const roundOf = (text: string): Round => {
  const readings = new Map<Phase, Reading[]>(PHASES.map((phase) => [phase, []]));
  const linksMade = new Map<Phase, number[]>(PHASES.map((phase) => [phase, []]));
  const windowMovesWithLink: number[] = [];
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
    const phase = PHASES[phaseIndex];
    const linkMade = linkMadeLine.exec(line);
    if (linkMade !== null) {
      linksMade.get(phase)?.push(Number(linkMade[1]));
      continue;
    }
    const windowMoved = windowMovedLine.exec(line);
    if (windowMoved !== null) {
      if (windowMoved[1] === "1") {
        windowMovesWithLink.push(Number(windowMoved[3]));
      }
      continue;
    }
    const tick = tickLine.exec(line);
    if (tick === null) {
      continue;
    }
    readings.get(phase)?.push({
      ticksPerSecond: Number(tick[1]) / Number(tick[2]),
      preferredMax: Number(tick[3]),
      scheduled: Number(tick[4]),
      scheduleMedianNanoseconds: Number(tick[5]),
      scheduleTrimmedNanoseconds: Number(tick[6]),
      screenMax: Number(tick[7]),
    });
  }
  return {
    phases: new Map(
      PHASES.map((phase) => [
        phase,
        { readings: readings.get(phase) ?? [], linksMadeNanoseconds: linksMade.get(phase) ?? [] },
      ])
    ),
    windowMovesWithLinkNanoseconds: windowMovesWithLink,
  };
};

const weightedTrimmedNanoseconds = (readings: readonly Reading[]): number => {
  const scheduled = readings.reduce((sum, reading) => sum + reading.scheduled, 0);
  const total = readings.reduce((sum, reading) => sum + reading.scheduleTrimmedNanoseconds * reading.scheduled, 0);
  return scheduled === 0 ? 0 : total / scheduled;
};

const distinct = (values: readonly number[]): string => [...new Set(values)].join("/");

const range = (values: readonly number[], digits: number): string =>
  values.length === 0
    ? "none"
    : `${median(values).toFixed(digits)} (${Math.min(...values).toFixed(digits)}–${Math.max(...values).toFixed(digits)})`;

for (const folder of process.argv.slice(2)) {
  const rounds: readonly Round[] = readdirSync(folder)
    .filter((name) => /^round-\d+\.txt$/.test(name))
    .sort()
    .map((name) => roundOf(readFileSync(join(folder, name), "utf8")));
  console.log(`${basename(folder)}: ${rounds.length} rounds`);
  for (const phase of PHASES) {
    const records = rounds.map((round) => round.phases.get(phase)).filter((record) => record !== undefined);
    const withReadings = records.filter((record) => record.readings.length > 0);
    const linksMade = records.flatMap((record) => record.linksMadeNanoseconds);
    if (withReadings.length === 0) {
      console.log(`  ${phase}: no readings; links made ${range(linksMade, 0)} ns`);
      continue;
    }
    const readings = withReadings.flatMap((record) => record.readings);
    const ticks = withReadings.map((record) => median(record.readings.map((reading) => reading.ticksPerSecond)));
    const medians = withReadings.map((record) =>
      median(record.readings.map((reading) => reading.scheduleMedianNanoseconds))
    );
    const trimmed = withReadings.map((record) => weightedTrimmedNanoseconds(record.readings));
    const scheduled = readings.reduce((sum, reading) => sum + reading.scheduled, 0);
    console.log(
      `  ${phase}: ${range(ticks, 0)} ticks/s, preferred max ${distinct(readings.map((reading) => reading.preferredMax))}, ` +
        `screen max ${distinct(readings.map((reading) => reading.screenMax))}; scheduleFrame's display-link work a ` +
        `frame: median ${range(medians, 1)} ns, mean without the slowest tenth ${range(trimmed, 1)} ns, over ` +
        `${scheduled} frames; links made ${range(linksMade, 0)} ns`
    );
  }
  const windowMoves = rounds.flatMap((round) => round.windowMovesWithLinkNanoseconds);
  console.log(`  window moves that found a link: ${windowMoves.length}, ${range(windowMoves, 0)} ns`);
}
