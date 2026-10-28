// Two threads log through RNSkLogger::logToConsole at once, as the render
// pool's threads do; built with ThreadSanitizer (see README.md).
#include <cstdarg>
#include <cstdio>
#include <thread>

#include "utils/RNSkLog.h"

int main() {
  auto logMany = [](const char *who) {
    for (int i = 0; i < 1000; i++) {
      RNSkia::RNSkLogger::logToConsole("Canvas: %s failed: %d", who, i);
    }
  };
  std::thread first(logMany, "replaying the scene");
  std::thread second(logMany, "beginning the frame");
  first.join();
  second.join();
  return 0;
}
