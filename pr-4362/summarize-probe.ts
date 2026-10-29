// Prints the GPU memory each step of a recorder-trim probe run left: from the `dumpsys meminfo` the runner took at the
// step's marker, GL mtrack and EGL mtrack (the GPU driver's account, in KB of PSS) and the App Summary's Graphics; and,
// in a build with probe-memory.patch, from the step's `TRIM memory` line, what the recorders of the thread it names hold
// and Dawn's account of the device (allocated from the driver, used by live resources).
//   bun summarize-probe.ts <run folder>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface StepMemory {
  readonly step: string;
  readonly gpuMemoryBytes: number | undefined;
  readonly glMtrackKilobytes: number | undefined;
  readonly eglMtrackKilobytes: number | undefined;
  readonly graphicsKilobytes: number | undefined;
}

interface ProbeMemory {
  readonly thread: string;
  readonly recorderBudgetedBytes: number;
  readonly dawnAllocatedBytes: number;
  readonly dawnUsedBytes: number;
  readonly dawnTexturesBytes: number;
}

const firstNumberAfter = (text: string, pattern: RegExp): number | undefined => {
  const match = pattern.exec(text);
  return match?.[1] === undefined ? undefined : Number(match[1]);
};

// `dumpsys gpu --gpumem`, behind the app's pid: the process's total, in bytes.
const readGpuMemory = (runFolder: string, step: string): number | undefined => {
  const path = join(runFolder, `${step}.gpumem.txt`);
  if (!existsSync(path)) {
    return undefined;
  }
  const dump = readFileSync(path, 'utf8');
  const pid = /^pid (\d+)/m.exec(dump)?.[1];
  return pid === undefined ? undefined : firstNumberAfter(dump, new RegExp(`^Proc ${pid} total: (\\d+)`, 'm'));
};

const readStepMemory = (runFolder: string, step: string): StepMemory => {
  const dump = readFileSync(join(runFolder, `${step}.meminfo.txt`), 'utf8');
  return {
    step,
    gpuMemoryBytes: readGpuMemory(runFolder, step),
    glMtrackKilobytes: firstNumberAfter(dump, /^\s*GL mtrack\s+(\d+)/m),
    eglMtrackKilobytes: firstNumberAfter(dump, /^\s*EGL mtrack\s+(\d+)/m),
    graphicsKilobytes: firstNumberAfter(dump, /^\s*Graphics:\s+(\d+)/m),
  };
};

const readProbeMemory = (runFolder: string): ReadonlyMap<string, ProbeMemory> => {
  const logcatPath = join(runFolder, 'logcat.txt');
  const probeMemory = new Map<string, ProbeMemory>();
  if (!existsSync(logcatPath)) {
    return probeMemory;
  }
  const pattern =
    /TRIM memory step=(\S+) thread=(\S+) rounds=\d+ recorderBudgeted=(\d+) recorderPurgeable=\d+ dawnAllocated=(\d+) dawnUsed=(\d+) textures=(\d+)/;
  for (const line of readFileSync(logcatPath, 'utf8').split('\n')) {
    const match = pattern.exec(line);
    if (match !== null) {
      const [, step = '', thread = '', recorderBudgeted, dawnAllocated, dawnUsed, dawnTextures] = match;
      probeMemory.set(step, {
        thread,
        recorderBudgetedBytes: Number(recorderBudgeted),
        dawnAllocatedBytes: Number(dawnAllocated),
        dawnUsedBytes: Number(dawnUsed),
        dawnTexturesBytes: Number(dawnTextures),
      });
    }
  }
  return probeMemory;
};

const formatMegabytes = (kilobytes: number | undefined): string =>
  kilobytes === undefined ? '—' : (kilobytes / 1024).toFixed(1);

const formatBytesAsMegabytes = (bytes: number | undefined): string =>
  bytes === undefined ? '—' : (bytes / (1024 * 1024)).toFixed(1);

const formatDelta = (kilobytes: number | undefined, baselineKilobytes: number | undefined): string =>
  kilobytes === undefined || baselineKilobytes === undefined
    ? '—'
    : `${kilobytes >= baselineKilobytes ? '+' : ''}${((kilobytes - baselineKilobytes) / 1024).toFixed(1)}`;

const runFolder = process.argv[2];
if (runFolder === undefined) {
  console.error('usage: bun summarize-probe.ts <run folder>');
  process.exit(2);
}
const steps = readFileSync(join(runFolder, 'steps.txt'), 'utf8')
  .split('\n')
  .filter((step) => step !== '' && step !== 'done');
const finalStep = 'hidden-home-10s';
const measured: readonly StepMemory[] = [
  ...steps.map((step) => readStepMemory(runFolder, step)),
  ...(existsSync(join(runFolder, `${finalStep}.meminfo.txt`)) ? [readStepMemory(runFolder, finalStep)] : []),
];
const baseline = measured.find((stepMemory) => stepMemory.step === 'baseline');
const probeMemory = readProbeMemory(runFolder);

console.log(
  '| Step | GPU memory (MB) | over baseline | GL mtrack (MB) | over baseline | EGL mtrack (MB) | Graphics (MB) | recorders of (MB) | Dawn allocated / used (MB) | Dawn textures (MB) |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const stepMemory of measured) {
  const memory = probeMemory.get(stepMemory.step);
  const recorders =
    memory === undefined ? '—' : `${memory.thread}: ${formatBytesAsMegabytes(memory.recorderBudgetedBytes)}`;
  const dawn =
    memory === undefined
      ? '—'
      : `${formatBytesAsMegabytes(memory.dawnAllocatedBytes)} / ${formatBytesAsMegabytes(memory.dawnUsedBytes)}`;
  const textures = memory === undefined ? '—' : formatBytesAsMegabytes(memory.dawnTexturesBytes);
  const gpuMemoryDelta =
    stepMemory.gpuMemoryBytes === undefined || baseline?.gpuMemoryBytes === undefined
      ? '—'
      : formatDelta(stepMemory.gpuMemoryBytes / 1024, baseline.gpuMemoryBytes / 1024);
  console.log(
    `| ${stepMemory.step} | ${formatBytesAsMegabytes(stepMemory.gpuMemoryBytes)} | ${gpuMemoryDelta} | ${formatMegabytes(stepMemory.glMtrackKilobytes)} | ${formatDelta(stepMemory.glMtrackKilobytes, baseline?.glMtrackKilobytes)} | ${formatMegabytes(stepMemory.eglMtrackKilobytes)} | ${formatMegabytes(stepMemory.graphicsKilobytes)} | ${recorders} | ${dawn} | ${textures} |`,
  );
}

const submitCost = existsSync(join(runFolder, 'logcat.txt'))
  ? /TRIM submit-cost (.+)$/m.exec(readFileSync(join(runFolder, 'logcat.txt'), 'utf8'))?.[1]
  : undefined;
console.log('');
console.log(`Submit cost on the JS thread (a clear and a flush of 32 × 32): ${submitCost ?? 'not logged'}`);
