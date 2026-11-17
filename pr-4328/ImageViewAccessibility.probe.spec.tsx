import { execFileSync } from "child_process";

import { surface } from "../setup";

const LABEL = "SkiaImageView accessibility probe";

// The accessibility tree of the app in front, as the device's WebDriverAgent runner reads it: what VoiceOver reads.
const accessibilitySource = (): string => {
  const runner = process.env.WDA_RUNNER_URL;
  if (runner === undefined || runner === "") {
    throw new Error("WDA_RUNNER_URL names no WebDriverAgent runner");
  }
  const answer = JSON.parse(
    execFileSync("curl", ["-s", "--max-time", "60", `${runner}/source`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
  ) as { readonly value: string };
  return answer.value;
};

describe("SkiaImageView accessibility probe", () => {
  it("is an accessibility element carrying its label", async () => {
    await surface.screen("ImageViewAccessible");
    const source = accessibilitySource();
    const elements = source.match(new RegExp(`<XCUIElementType\\w+ [^>]*label="${LABEL}"[^>]*>`, "g")) ?? [];
    console.log(`elements labelled "${LABEL}":\n${elements.join("\n") || "none"}`);
    expect(elements.some((element) => element.includes('accessible="true"'))).toBe(true);
  });
});
