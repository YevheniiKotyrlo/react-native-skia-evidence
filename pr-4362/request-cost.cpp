// What a thread outside the render pool pays per GPU submit for the request it
// makes (RNSkThreadTrims::ranWorkOnCurrentThread), against the same loop with
// no request: each round times kCalls calls on one thread, alternating the two
// arms, and the program prints every round's nanoseconds per call and each
// arm's median and spread.
//   g++ -std=c++20 -O2 -I <packages/skia>/cpp request-cost.cpp -o request-cost && ./request-cost

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstdio>
#include <vector>

#include "rnskia/RNSkThreadTrims.h"

namespace {

using Clock = std::chrono::steady_clock;

constexpr int kRounds = 21;
constexpr int kCalls = 200000;

std::atomic<int> sink{0};

double nanosecondsPerCall(const std::function<void()> &call) {
  const auto start = Clock::now();
  for (int index = 0; index < kCalls; index++) {
    call();
  }
  const auto elapsed = Clock::now() - start;
  return std::chrono::duration<double, std::nano>(elapsed).count() / kCalls;
}

void report(const char *arm, std::vector<double> samples) {
  std::sort(samples.begin(), samples.end());
  std::printf("%s: median %.1f ns, min %.1f, max %.1f over %zu rounds\n", arm,
              samples[samples.size() / 2], samples.front(), samples.back(),
              samples.size());
}

} // namespace

int main() {
  // Never destroyed, as the library's instance: its thread is detached.
  auto *trims = new RNSkia::RNSkThreadTrims(std::chrono::seconds(2));
  trims->setIdleTask([](bool) { return false; });
  std::vector<double> without;
  std::vector<double> with;
  for (int round = 0; round < kRounds; round++) {
    const auto noRequest = [] { sink.fetch_add(1, std::memory_order_relaxed); };
    const auto request = [trims] {
      sink.fetch_add(1, std::memory_order_relaxed);
      trims->ranWorkOnCurrentThread();
    };
    if (round % 2 == 0) {
      without.push_back(nanosecondsPerCall(noRequest));
      with.push_back(nanosecondsPerCall(request));
    } else {
      with.push_back(nanosecondsPerCall(request));
      without.push_back(nanosecondsPerCall(noRequest));
    }
    std::printf("round %d: without %.1f ns, with %.1f ns\n", round,
                without.back(), with.back());
  }
  report("without a request", without);
  report("with a request", with);
  return 0;
}
