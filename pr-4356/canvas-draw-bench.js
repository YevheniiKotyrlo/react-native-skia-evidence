import { AppRegistry } from "react-native";
import "react-native-skia";

import { CanvasDrawBench } from "./src/Examples/API/CanvasDrawBench";
import { name as appName } from "./app.json";

if (!Symbol.dispose) {
  Symbol.dispose = Symbol.for("Symbol.dispose");
}

AppRegistry.registerComponent(appName, () => CanvasDrawBench);
