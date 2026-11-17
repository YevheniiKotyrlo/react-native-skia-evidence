import React, { useState } from "react";
import { Skia, SkiaImageView } from "react-native-skia";

const makeTextureImage = () => {
  const surface = Skia.Surface.MakeOffscreen(16, 16)!;
  surface.getCanvas().drawColor(Skia.Color("cyan"));
  surface.flush();
  return surface.makeImageSnapshot();
};

// An image view VoiceOver should read by its label.
export const ImageViewAccessible = () => {
  const [image] = useState(makeTextureImage);
  return (
    <SkiaImageView
      image={image}
      accessible
      accessibilityRole="image"
      accessibilityLabel="SkiaImageView accessibility probe"
      style={{ flex: 1 }}
    />
  );
};
