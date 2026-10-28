// For each device loss of a ProducerDeviceLoss run's logcat: the milliseconds to its replacement, and whether Graphite
// reported a buffer map aborted by the lost device before the replacement (a map in flight when the device went), with
// the run's verdict on that loss from its jest log: moved, or the loss it stopped at.
//   bun loss-timeline.ts <run folder>...
import { readFileSync } from "node:fs";
import { join } from "node:path";

const timeOf = (line: string): number => {
  const [hours, minutes, seconds] = line.split(" ")[1].split(":").map(Number);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
};

for (const folder of process.argv.slice(2)) {
  const logcat = readFileSync(join(folder, "logcat.txt"), "utf8").split("\n");
  const failedAt = /"loss": (\d+)/.exec(readFileSync(join(folder, "jest.log"), "utf8"));
  const stalledLoss = failedAt === null ? null : Number(failedAt[1]);
  const losses: { lostAt: number; replacedAt: number | null; mapAbortedBefore: boolean }[] = [];
  for (const line of logcat) {
    if (line.includes("React Native Skia lost its GPU device")) {
      losses.push({ lostAt: timeOf(line), replacedAt: null, mapAbortedBefore: false });
      continue;
    }
    const current = losses.at(-1);
    if (current === undefined || current.replacedAt !== null) {
      continue;
    }
    if (line.includes("replaced its lost GPU device")) {
      current.replacedAt = timeOf(line);
    } else if (line.includes("Buffer async map failed")) {
      current.mapAbortedBefore = true;
    }
  }
  console.log(folder);
  losses.forEach((loss, index) => {
    const number = index + 1;
    const verdict = stalledLoss === number ? "STALLED" : stalledLoss !== null && number > stalledLoss ? "after the stall" : "moved";
    const replacedIn = loss.replacedAt === null ? "never" : `${loss.replacedAt - loss.lostAt} ms`;
    console.log(
      `  loss ${number}: replaced in ${replacedIn}, map aborted before it: ${loss.mapAbortedBefore ? "yes" : "no"}: ${verdict}`
    );
  });
}
