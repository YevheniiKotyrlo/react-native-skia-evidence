import { AppRegistry } from "react-native";
import "react-native-skia";

import { PresentPostProbe } from "./src/Examples/API/PresentPostProbe";
import { name as appName } from "./app.json";

if (!Symbol.dispose) {
  Symbol.dispose = Symbol.for("Symbol.dispose");
}

AppRegistry.registerComponent(appName, () => PresentPostProbe);
