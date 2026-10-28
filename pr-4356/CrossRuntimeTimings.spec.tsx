// The two cases of the change, run several rounds each with every timing printed, so a run shows when the worklet's
// call started and returned against the JS thread's draw. Copied into packages/skia/src/renderer/__tests__/e2e/ for a
// run and removed after; it asserts nothing.
import { surface } from "../setup";

import type { WorkletThread } from "./setup";
import { slowSvg, slowSvgSide } from "./setup";

const levels = 9;
const rounds = Number(process.env.TIMING_ROUNDS ?? 5);

describe("Cross-runtime timings", () => {
  it("a surface disposed on a worklet a quarter into the JS thread's draw", async () => {
    for (let round = 0; round < rounds; round++) {
      const result = await surface.eval(
        (Skia, ctx) => {
          const { workletThread } = ctx;
          const svg = Skia.SVG.MakeFromString(ctx.svg)!;
          const reference = Skia.Surface.MakeRaster(ctx.side, ctx.side)!;
          const referenceStart = Date.now();
          reference.getCanvas().drawSvg(svg);
          const drawDuration = Date.now() - referenceStart;
          reference.dispose();
          return workletThread
            .makeRasterSurface(ctx.side, ctx.side)
            .then((workletSurface) => {
              const canvas = workletSurface.getCanvas();
              return workletThread
                .disposeDuring(workletSurface, drawDuration / 4, () => canvas.drawSvg(svg))
                .then(({ draw, dispose }) => {
                  let next: string | null = null;
                  try {
                    canvas.drawSvg(svg);
                  } catch (error) {
                    next = (error as Error).message;
                  }
                  svg.dispose();
                  return { drawDuration, drawStart: draw.started, drawEnd: draw.ended, dispose, next };
                });
            });
        },
        { svg: slowSvg(levels), side: slowSvgSide(levels) } as {
          svg: string;
          side: number;
          workletThread: WorkletThread;
        }
      );
      const started = result.dispose.started - result.drawStart;
      console.log(
        `TIMINGS surface round=${round} drawDuration=${result.drawDuration} draw=${result.drawEnd - result.drawStart} ` +
          `disposeStartedAt=${started} disposeTook=${result.dispose.ended - result.dispose.started} ` +
          `disposeReturnedAt=${result.dispose.ended - result.drawStart} drawEndedAt=${result.drawEnd - result.drawStart} ` +
          `next=${JSON.stringify(result.next)}`
      );
    }
  });

  it("a recording finished on a worklet a quarter into the JS thread's draw", async () => {
    for (let round = 0; round < rounds; round++) {
      const result = await surface.eval(
        (Skia, ctx) => {
          const { workletThread } = ctx;
          const svg = Skia.SVG.MakeFromString(ctx.svg)!;
          const bounds = Skia.XYWHRect(0, 0, ctx.side, ctx.side);
          const reference = Skia.PictureRecorder();
          const referenceStart = Date.now();
          reference.beginRecording(bounds).drawSvg(svg);
          const drawDuration = Date.now() - referenceStart;
          const referenceFinishStart = Date.now();
          reference.finishRecordingAsPicture().dispose();
          const finishAlone = Date.now() - referenceFinishStart;
          reference.dispose();
          const recorder = Skia.PictureRecorder();
          const canvas = recorder.beginRecording(bounds);
          return workletThread
            .finishRecordingDuring(recorder, drawDuration / 4, () => canvas.drawSvg(svg))
            .then(({ draw, finish, picture }) => {
              let next: string | null = null;
              try {
                canvas.drawSvg(svg);
              } catch (error) {
                next = (error as Error).message;
              }
              const replay = Skia.Surface.MakeRaster(ctx.side, ctx.side)!;
              replay.getCanvas().drawPicture(picture);
              const corner = replay
                .makeImageSnapshot()
                .readPixels(ctx.side - 1, ctx.side - 1, {
                  width: 1,
                  height: 1,
                  colorType: 4,
                  alphaType: 3,
                });
              replay.dispose();
              picture.dispose();
              recorder.dispose();
              svg.dispose();
              return {
                drawDuration,
                finishAlone,
                drawStart: draw.started,
                drawEnd: draw.ended,
                finish,
                next,
                corner: Array.from(corner!),
              };
            });
        },
        { svg: slowSvg(levels), side: slowSvgSide(levels) } as {
          svg: string;
          side: number;
          workletThread: WorkletThread;
        }
      );
      console.log(
        `TIMINGS recording round=${round} drawDuration=${result.drawDuration} finishAlone=${result.finishAlone} ` +
          `draw=${result.drawEnd - result.drawStart} ` +
          `finishStartedAt=${result.finish.started - result.drawStart} finishTook=${result.finish.ended - result.finish.started} ` +
          `finishReturnedAt=${result.finish.ended - result.drawStart} drawEndedAt=${result.drawEnd - result.drawStart} ` +
          `corner=${result.corner.join(",")} next=${JSON.stringify(result.next)}`
      );
    }
  });
});
