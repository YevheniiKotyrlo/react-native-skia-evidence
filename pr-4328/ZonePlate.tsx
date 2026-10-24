import React, { useState } from "react";
import { Skia, SkiaImageView } from "react-native-skia";

const SIZE = 4096;

// Rings whose frequency grows from the centre to one cycle per two pixels at
// the edge: drawn smaller, a filtered image keeps the coarse rings and fades
// the fine ones to grey, where sampling without mipmaps draws false rings.
const makeZonePlate = () => {
  const effect = Skia.RuntimeEffect.Make(`
    uniform float size;
    half4 main(float2 position) {
      float2 offset = position - size * 0.5;
      float level = 0.5 + 0.5 * cos(3.14159265 / size * dot(offset, offset));
      return half4(half3(level), 1);
    }`)!;
  const paint = Skia.Paint();
  paint.setShader(effect.makeShader([SIZE]));
  const surface = Skia.Surface.MakeOffscreen(SIZE, SIZE)!;
  surface.getCanvas().drawPaint(paint);
  surface.flush();
  return surface.makeImageSnapshot();
};

export const ZonePlate = () => {
  const [image] = useState(makeZonePlate);
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};
