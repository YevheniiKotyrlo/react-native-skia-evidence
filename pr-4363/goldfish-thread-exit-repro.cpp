// A thread creates a Vulkan device, records a command buffer and submits it;
// then the main thread records and submits on the same device, either reusing
// that command buffer or only the queue. The first thread either exits before
// the main thread starts or is kept alive until the main thread is done.
//
// Build with the NDK (x86_64 shown, for an emulator):
//   clang++ --target=x86_64-linux-android29 -std=c++17 -O1 -static-libstdc++
//     goldfish-thread-exit-repro.cpp -lvulkan -o goldfish-thread-exit-repro
// Run with malloc debug, so that a use after free crashes every time:
//   adb push goldfish-thread-exit-repro /data/local/tmp/
//   adb shell "LIBC_DEBUG_MALLOC_OPTIONS='free_track fill_on_free'
//     /data/local/tmp/goldfish-thread-exit-repro command-buffer exits"
// The second argument is exits or keep-alive, the first command-buffer or queue.
#include <vulkan/vulkan.h>

#include <condition_variable>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <mutex>
#include <thread>

#define CHECK(call)                                                            \
  do {                                                                         \
    VkResult result = (call);                                                  \
    if (result != VK_SUCCESS) {                                                \
      std::fprintf(stderr, "%s failed: %d\n", #call, result);                  \
      std::exit(2);                                                            \
    }                                                                          \
  } while (0)

struct Gpu {
  VkInstance instance = VK_NULL_HANDLE;
  VkPhysicalDevice physicalDevice = VK_NULL_HANDLE;
  VkDevice device = VK_NULL_HANDLE;
  uint32_t family = 0;
  VkQueue queue = VK_NULL_HANDLE;
};

static void createDevice(Gpu &gpu) {
  VkApplicationInfo application{};
  application.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
  application.apiVersion = VK_API_VERSION_1_1;
  VkInstanceCreateInfo instanceInfo{};
  instanceInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
  instanceInfo.pApplicationInfo = &application;
  CHECK(vkCreateInstance(&instanceInfo, nullptr, &gpu.instance));

  uint32_t physicalDeviceCount = 1;
  VkResult enumerated = vkEnumeratePhysicalDevices(
      gpu.instance, &physicalDeviceCount, &gpu.physicalDevice);
  if ((enumerated != VK_SUCCESS && enumerated != VK_INCOMPLETE) ||
      physicalDeviceCount == 0) {
    std::fprintf(stderr, "no physical device: %d\n", enumerated);
    std::exit(2);
  }
  VkPhysicalDeviceProperties properties;
  vkGetPhysicalDeviceProperties(gpu.physicalDevice, &properties);
  std::printf("device: %s, driver version %u\n", properties.deviceName,
              properties.driverVersion);

  uint32_t familyCount = 0;
  vkGetPhysicalDeviceQueueFamilyProperties(gpu.physicalDevice, &familyCount,
                                           nullptr);
  VkQueueFamilyProperties families[16];
  familyCount = familyCount > 16 ? 16 : familyCount;
  vkGetPhysicalDeviceQueueFamilyProperties(gpu.physicalDevice, &familyCount,
                                           families);
  while (gpu.family < familyCount &&
         (families[gpu.family].queueFlags & VK_QUEUE_GRAPHICS_BIT) == 0) {
    gpu.family++;
  }

  float priority = 1.0f;
  VkDeviceQueueCreateInfo queueInfo{};
  queueInfo.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
  queueInfo.queueFamilyIndex = gpu.family;
  queueInfo.queueCount = 1;
  queueInfo.pQueuePriorities = &priority;
  VkDeviceCreateInfo deviceInfo{};
  deviceInfo.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
  deviceInfo.queueCreateInfoCount = 1;
  deviceInfo.pQueueCreateInfos = &queueInfo;
  CHECK(vkCreateDevice(gpu.physicalDevice, &deviceInfo, nullptr, &gpu.device));
  vkGetDeviceQueue(gpu.device, gpu.family, 0, &gpu.queue);
}

static VkCommandBuffer createCommandBuffer(const Gpu &gpu) {
  VkCommandPoolCreateInfo poolInfo{};
  poolInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
  poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
  poolInfo.queueFamilyIndex = gpu.family;
  VkCommandPool commandPool = VK_NULL_HANDLE;
  CHECK(vkCreateCommandPool(gpu.device, &poolInfo, nullptr, &commandPool));
  VkCommandBufferAllocateInfo allocateInfo{};
  allocateInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
  allocateInfo.commandPool = commandPool;
  allocateInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
  allocateInfo.commandBufferCount = 1;
  VkCommandBuffer commandBuffer = VK_NULL_HANDLE;
  CHECK(vkAllocateCommandBuffers(gpu.device, &allocateInfo, &commandBuffer));
  return commandBuffer;
}

static void recordAndSubmit(const Gpu &gpu, VkCommandBuffer commandBuffer,
                            const char *thread) {
  VkCommandBufferBeginInfo beginInfo{};
  beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
  beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
  CHECK(vkBeginCommandBuffer(commandBuffer, &beginInfo));
  VkMemoryBarrier barrier{};
  barrier.sType = VK_STRUCTURE_TYPE_MEMORY_BARRIER;
  barrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
  barrier.dstAccessMask = VK_ACCESS_TRANSFER_READ_BIT;
  vkCmdPipelineBarrier(commandBuffer, VK_PIPELINE_STAGE_TRANSFER_BIT,
                       VK_PIPELINE_STAGE_TRANSFER_BIT, 0, 1, &barrier, 0,
                       nullptr, 0, nullptr);
  CHECK(vkEndCommandBuffer(commandBuffer));
  std::printf("%s: recorded\n", thread);
  std::fflush(stdout);
  VkSubmitInfo submitInfo{};
  submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
  submitInfo.commandBufferCount = 1;
  submitInfo.pCommandBuffers = &commandBuffer;
  CHECK(vkQueueSubmit(gpu.queue, 1, &submitInfo, VK_NULL_HANDLE));
  CHECK(vkQueueWaitIdle(gpu.queue));
  std::printf("%s: submitted\n", thread);
  std::fflush(stdout);
}

int main(int argc, char **argv) {
  if (argc != 3) {
    std::fprintf(stderr, "usage: %s <command-buffer|queue> <exits|keep-alive>\n",
                 argv[0]);
    return 2;
  }
  const bool sharesCommandBuffer = std::strcmp(argv[1], "command-buffer") == 0;
  const bool keepAlive = std::strcmp(argv[2], "keep-alive") == 0;
  std::printf("shared: %s; creating thread %s\n",
              sharesCommandBuffer ? "command buffer and queue" : "queue only",
              keepAlive ? "kept alive" : "exits");
  std::fflush(stdout);

  Gpu gpu;
  VkCommandBuffer creatorCommandBuffer = VK_NULL_HANDLE;
  std::mutex mutex;
  std::condition_variable condition;
  bool created = false;
  bool released = false;
  std::thread creator([&]() {
    createDevice(gpu);
    creatorCommandBuffer = createCommandBuffer(gpu);
    recordAndSubmit(gpu, creatorCommandBuffer, "creating thread");
    {
      std::lock_guard<std::mutex> lock(mutex);
      created = true;
    }
    condition.notify_all();
    if (keepAlive) {
      std::unique_lock<std::mutex> lock(mutex);
      condition.wait(lock, [&]() { return released; });
    }
  });
  {
    std::unique_lock<std::mutex> lock(mutex);
    condition.wait(lock, [&]() { return created; });
  }
  if (!keepAlive) {
    creator.join();
    std::printf("creating thread exited\n");
    std::fflush(stdout);
  }
  VkCommandBuffer mainCommandBuffer =
      sharesCommandBuffer ? creatorCommandBuffer : createCommandBuffer(gpu);
  recordAndSubmit(gpu, mainCommandBuffer, "main thread");
  if (keepAlive) {
    {
      std::lock_guard<std::mutex> lock(mutex);
      released = true;
    }
    condition.notify_all();
    creator.join();
  }
  std::printf("PASS\n");
  return 0;
}
