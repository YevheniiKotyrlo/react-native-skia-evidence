// What RNSkThreadPool's worker loop costs per job, built once against each
// side's packages/skia/cpp/rnskia/RNSkThreadPool.h, for the pool of #4389,
// where each thread runs the jobs of its own lane. `burst` posts every job at
// once, spread over the lanes as views spread over them, and waits for the
// last, so the threads mostly find work waiting; `ping-pong` posts one job to
// one lane and waits for it before the next, as a view does with its frames,
// so every job wakes that lane's thread from an empty queue, where the loop
// asks when the idle task is due. It prints one line per round of jobs; the
// first round warms the threads up.
//   pool-bench <burst|ping-pong> <jobs> <rounds>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <mutex>

#include "rnskia/RNSkThreadPool.h"

using Clock = std::chrono::steady_clock;
using Lane = RNSkia::RNSkThreadPool::Lane;

int main(int argc, char **argv) {
  if (argc != 4) {
    std::fprintf(stderr, "usage: pool-bench <burst|ping-pong> <jobs> <rounds>\n");
    return 2;
  }
  const bool burst = std::strcmp(argv[1], "burst") == 0;
  const int jobs = std::atoi(argv[2]);
  const int rounds = std::atoi(argv[3]);
  auto &pool = RNSkia::RNSkThreadPool::getInstance();
  pool.setIdleTask([](bool) {});
  const Lane lanes = pool.size();
  const Lane viewLane = pool.acquireLane();
  for (int round = 0; round < rounds; round++) {
    std::mutex mutex;
    std::condition_variable condition;
    std::atomic<int> finished{0};
    const auto start = Clock::now();
    if (burst) {
      for (int job = 0; job < jobs; job++) {
        pool.post(static_cast<Lane>(job) % lanes, [&]() {
          if (finished.fetch_add(1) + 1 == jobs) {
            std::lock_guard<std::mutex> lock(mutex);
            condition.notify_one();
          }
        });
      }
      std::unique_lock<std::mutex> lock(mutex);
      condition.wait(lock, [&]() { return finished.load() == jobs; });
    } else {
      for (int job = 0; job < jobs; job++) {
        pool.post(viewLane, [&]() {
          std::lock_guard<std::mutex> lock(mutex);
          finished.fetch_add(1);
          condition.notify_one();
        });
        std::unique_lock<std::mutex> lock(mutex);
        condition.wait(lock, [&]() { return finished.load() == job + 1; });
      }
    }
    const double elapsed =
        std::chrono::duration<double, std::nano>(Clock::now() - start).count();
    std::printf("arm=%s round=%d jobs=%d ns_per_job=%.1f\n", argv[1], round,
                jobs, elapsed / jobs);
  }
  pool.releaseLane(viewLane);
  return 0;
}
