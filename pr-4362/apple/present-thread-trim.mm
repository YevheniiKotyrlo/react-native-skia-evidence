// The Apple present thread's trim, through a checkout's RNSkPresentThread.mm, RNSkThreadTrims.h and
// JsiSkDispatcher.h as they are: GPU work on the present thread (what DawnContext::noteWorkOn reports for each
// present) asks for its trim, which must run on that thread once due, while its run loop sleeps (idle), and after a
// task that holds the thread past the due time rather than inside it (between). Exits 0 when both did, 1 otherwise.
// From the root of a checkout at the commit to test, on a Mac with Xcode:
//   clang++ -std=c++20 -fobjc-arc -framework Foundation -I packages/skia/apple -I packages/skia/cpp \
//     packages/skia/apple/RNSkPresentThread.mm <this folder>/present-thread-trim.mm -o present-thread-trim &&
//     ./present-thread-trim
#import <Foundation/Foundation.h>

#include <atomic>
#include <chrono>
#include <cstdio>
#include <string>
#include <thread>

#import "RNSkPresentThread.h"
#include "rnskia/RNSkThreadTrims.h"

using namespace std::chrono_literals;

namespace {

constexpr auto kDelay = 200ms;
constexpr auto kWait = 25 * kDelay;

struct Counts {
  std::atomic<int> onPresentThread{0};
  std::atomic<int> elsewhere{0};
  std::atomic<int> insideTask{0};
  std::atomic<bool> taskRunning{false};
};

bool isPresentThread() {
  return [[NSThread currentThread].name isEqualToString:@"RNSkia Present"];
}

void runOnPresentThreadAndWait(void (^task)(void)) {
  dispatch_semaphore_t done = dispatch_semaphore_create(0);
  [RNSkPresentThread post:^{
    task();
    dispatch_semaphore_signal(done);
  }];
  dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
}

long long waitForTrims(const Counts &counts, int expected) {
  const auto start = std::chrono::steady_clock::now();
  while (counts.onPresentThread.load() < expected &&
         std::chrono::steady_clock::now() - start < kWait) {
    std::this_thread::sleep_for(10ms);
  }
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             std::chrono::steady_clock::now() - start)
      .count();
}

} // namespace

int main() {
  @autoreleasepool {
    // Never destroyed: its thread is detached, as the library's instance is.
    auto *trims = new RNSkia::RNSkThreadTrims(kDelay);
    auto *counts = new Counts();
    trims->setIdleTask([counts](bool) {
      if (!isPresentThread()) {
        counts->elsewhere++;
        return;
      }
      counts->onPresentThread++;
      if (counts->taskRunning.load()) {
        counts->insideTask++;
      }
    });

    runOnPresentThreadAndWait(^{
      trims->ranWorkOnCurrentThread();
    });
    const auto idleWait = waitForTrims(*counts, 1);
    const bool idlePassed = counts->onPresentThread.load() == 1;
    std::printf("idle: %d trim(s) on the present thread %lld ms after its "
                "work (delay %lld ms)\n",
                counts->onPresentThread.load(), idleWait,
                static_cast<long long>(kDelay.count()));

    [RNSkPresentThread post:^{
      trims->ranWorkOnCurrentThread();
      counts->taskRunning = true;
      std::this_thread::sleep_for(3 * kDelay);
      counts->taskRunning = false;
    }];
    const auto betweenWait = waitForTrims(*counts, 2);
    const bool betweenPassed = counts->onPresentThread.load() == 2 &&
                               counts->insideTask.load() == 0;
    std::printf("between: %d trim(s) on the present thread %lld ms after a "
                "task holding it %lld ms began, %d inside the task\n",
                counts->onPresentThread.load() - (idlePassed ? 1 : 0),
                betweenWait, static_cast<long long>((3 * kDelay).count()),
                counts->insideTask.load());

    __block size_t drained = 0;
    runOnPresentThreadAndWait(^{
      drained = RNSkia::Dispatcher::getDispatcher()->processQueue();
    });
    std::printf("left in the present thread's queue: %zu; trims elsewhere: "
                "%d\n",
                drained, counts->elsewhere.load());

    const bool passed =
        idlePassed && betweenPassed && counts->elsewhere.load() == 0;
    std::printf("%s\n", passed ? "PASS" : "FAIL");
    return passed ? 0 : 1;
  }
}
