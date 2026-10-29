# Reloads on Android 11 (API 30)

| Run | GPU device made on | Reload began | JS instance destroyed | Breathe opened | The app's process |
| --- | --- | --- | --- | --- | --- |
| control 1 | tid 4810 (mqt_v_js) | — | — | 12:53:59.552 | alive |
| control 2 | tid 4991 (mqt_v_js) | — | — | 12:54:29.470 | alive |
| control 3 | tid 5133 (mqt_v_js) | — | — | 12:54:58.996 | alive |
| reload 1 | tid 5267 (mqt_v_js) | 12:55:29.269 | 12:55:29.291 | 12:55:39.494 | died: 11 (SIGSEGV) at 12:55:31.219 on 5232 (iveskia.example), 1950 ms after the reload began, before the route opened |
| reload 2 | tid 5457 (mqt_v_js) | 12:56:09.907 | 12:56:09.985 | 12:56:20.159 | died: 11 (SIGSEGV) at 12:56:13.341 on 5423 (iveskia.example), 3434 ms after the reload began, before the route opened |
| reload 3 | tid 5658 (mqt_v_js) | 12:56:49.419 | 12:56:49.456 | 12:56:59.638 | died: 11 (SIGSEGV) at 12:56:51.245 on 5625 (iveskia.example), 1826 ms after the reload began, before the route opened |

## Tombstone (reload 1)

    pid: 5232, tid: 5232, name: iveskia.example  >>> com.reactnativeskia.example <<<
    uid: 10167
    signal 11 (SIGSEGV), code 2 (SEGV_ACCERR), fault addr 0x76d9dc895210
        rax 000076d9dc2868d8  rbx 0000000000000004  rcx 0000000000000001  rdx 0000000000000004
        r8  0000000000000004  r9  00007ffddf0971b8  r10 000076da85f7f070  r11 0000000000000213
        r12 00007ffddf096e2c  r13 000076dad6047b38  r14 00007ffddf096e18  r15 000076dad6047af0
        rdi 000076da85f81fb0  rsi 0000000000000004
        rbp 000076da1eff1ee8  rsp 00007ffddf096dc8  rip 000076d9dc895210
    backtrace:
          #00 pc 0000000000001210  base.apk (offset 0x8bb000)
          #01 pc 00000000000bffe6  /vendor/lib64/libvulkan_enc.so (goldfish_vk::VulkanStreamGuest::Impl::write(void const*, unsigned long)+22) (BuildId: adb4252219108ab0a39d0c3660044826)
          #02 pc 00000000007f7e27  [stack]
          #03 pc 0000000000135172  /vendor/lib64/libvulkan_enc.so (goldfish_vk::VkEncoder::vkCommandBufferHostSyncGOOGLE(VkCommandBuffer_T*, unsigned int, unsigned int)+338) (BuildId: adb4252219108ab0a39d0c3660044826)
          #04 pc 0000000000014e4f  [anon:scudo:primary]
          #05 pc 00000000000d1e84  /vendor/lib64/libvulkan_enc.so (goldfish_vk::ResourceTracker::Impl::syncEncodersForCommandBuffer(VkCommandBuffer_T*, goldfish_vk::VkEncoder*)+404) (BuildId: adb4252219108ab0a39d0c3660044826)
          #06 pc 00000000000000b0  <unknown>
          #07 pc 000000000001c23a  /vendor/lib64/hw/vulkan.ranchu.so (goldfish_vk::entry_vkBeginCommandBuffer(VkCommandBuffer_T*, VkCommandBufferBeginInfo const*)+90) (BuildId: e463db1a85f3a0c411651200184556b4)
          #08 pc 000000000003312f  [anon:scudo:primary]
          #09 pc 000000000082012f  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::BeginVkCommandBuffer()+415) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #10 pc 00000000007f807f  [stack]
          #11 pc 000000000081e59b  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::PrepareRecordingContext()+43) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #12 pc 000000000000b92f  base.apk (offset 0x73ef000)
          #13 pc 0000000000820e3c  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::RecycleRecordingContext()+364) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
