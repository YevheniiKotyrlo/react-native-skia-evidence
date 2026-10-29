# Reloads on Android 10 (API 29)

| Run | GPU device made on | Reload began | JS instance destroyed | Breathe opened | The app's process |
| --- | --- | --- | --- | --- | --- |
| control 1 | tid 13703 (mqt_v_js) | — | — | 12:56:25.477 | alive |
| control 2 | tid 13899 (mqt_v_js) | — | — | 12:56:55.402 | alive |
| control 3 | tid 14072 (mqt_v_js) | — | — | 12:57:29.570 | alive |
| reload 1 | tid 14221 (mqt_v_js) | 12:57:59.330 | 12:57:59.374 | 12:58:35.156 | died: 6 (SIGABRT) at 12:58:01.628 on 14177 (iveskia.example), 2298 ms after the reload began, before the route opened |
| reload 2 | tid 14551 (mqt_v_js) | 12:59:14.111 | 12:59:14.126 | 12:59:24.363 | alive |
| reload 3 | tid 14744 (mqt_v_js) | 12:59:53.530 | 12:59:53.565 | 13:00:06.267 | died: 6 (SIGABRT) at 12:59:55.120 on 14694 (iveskia.example), 1590 ms after the reload began, before the route opened |

## Tombstone (reload 1)

    pid: 14177, tid: 14177, name: iveskia.example  >>> com.reactnativeskia.example <<<
    uid: 10146
    signal 6 (SIGABRT), code -1 (SI_QUEUE), fault addr --------
        rax 0000000000000000  rbx 0000000000003761  rcx 0000709195cde3f8  rdx 0000000000000006
        r8  0000000000000001  r9  0000000000000000  r10 00007fff46861890  r11 0000000000000246
        r12 00007090b1cc4380  r13 00007090b3bb1eb0  r14 00007fff46861918  r15 0000000000003761
        rdi 0000000000003761  rsi 0000000000003761
        rbp 0000000000000018  rsp 00007fff46861888  rip 0000709195cde3f8
    
    backtrace:
          #00 pc 00000000000943f8  /apex/com.android.runtime/lib64/bionic/libc.so (syscall+24) (BuildId: b5c6019a3b4ea61b5e9a2f56319b584e)
          #01 pc 0000000000097146  /apex/com.android.runtime/lib64/bionic/libc.so (abort+182) (BuildId: b5c6019a3b4ea61b5e9a2f56319b584e)
          #02 pc 000000000000b844  /vendor/lib64/libOpenglSystemCommon.so (QemuPipeStream::writeFully(void const*, unsigned long)+148) (BuildId: 9e1f1713753fc3439af85bf4faea017d)
          #03 pc 000000000000bce1  /vendor/lib64/libOpenglSystemCommon.so (IOStream::flush()+33) (BuildId: 9e1f1713753fc3439af85bf4faea017d)
          #04 pc 00000000000bc1eb  /vendor/lib64/libvulkan_enc.so (goldfish_vk::VulkanStreamGuest::flush()+59) (BuildId: a9cf7e85b4055253475e48d71cd8f7ff)
          #05 pc 00000000000f00a4  /vendor/lib64/libvulkan_enc.so (goldfish_vk::VkEncoder::flush()+20) (BuildId: a9cf7e85b4055253475e48d71cd8f7ff)
          #06 pc 00000000000ce07e  /vendor/lib64/libvulkan_enc.so (goldfish_vk::ResourceTracker::Impl::syncEncodersForCommandBuffer(VkCommandBuffer_T*, goldfish_vk::VkEncoder*)+414) (BuildId: a9cf7e85b4055253475e48d71cd8f7ff)
          #07 pc 000000000001b68a  /vendor/lib64/hw/vulkan.ranchu.so (goldfish_vk::entry_vkBeginCommandBuffer(VkCommandBuffer_T*, VkCommandBufferBeginInfo const*)+90) (BuildId: 016566978fc5617027d12fb569e295ae)
          #08 pc 000000000082012f  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::BeginVkCommandBuffer()+415) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #09 pc 000000000081e59b  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::PrepareRecordingContext()+43) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #10 pc 0000000000820e3c  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::RecycleRecordingContext()+364) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #11 pc 000000000081f264  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::vulkan::Queue::SubmitPendingCommandsImpl()+1716) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #12 pc 000000000081eb3f  base.apk!libwebgpu_dawn.so (offset 0x6400000) (_ZN4dawn6native6vulkan5Queue10SubmitImplENS_6detail8SpanBaseIKPNS0_17CommandBufferBaseEmPS7_Lm18446744073709551615EEE+127) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #13 pc 000000000076e8bb  base.apk!libwebgpu_dawn.so (offset 0x6400000) (_ZN4dawn6native9QueueBase14SubmitInternalENS_6detail8SpanBaseIKPNS0_17CommandBufferBaseEmPS6_Lm18446744073709551615EEE+219) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #14 pc 000000000076e6fd  base.apk!libwebgpu_dawn.so (offset 0x6400000) (_ZN4dawn6native9QueueBase9APISubmitENS_6detail8SpanBaseIKPNS0_17CommandBufferBaseEmPS6_Lm18446744073709551615EEE+77) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #15 pc 000000000067a2be  base.apk!libwebgpu_dawn.so (offset 0x6400000) (dawn::native::NativeQueueSubmit(WGPUQueueImpl*, unsigned long, WGPUCommandBufferImpl* const*)+78) (BuildId: 3ae7b7b83e4d18dacab8514c759327a209777c31)
          #16 pc 0000000001e7e30e  base.apk!librnskia.so (offset 0x4278000) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
          #17 pc 0000000001e2e15e  base.apk!librnskia.so (offset 0x4278000) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
          #18 pc 0000000001de2bf2  base.apk!librnskia.so (offset 0x4278000) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
          #19 pc 0000000001274005  base.apk!librnskia.so (offset 0x4278000) (RNSkia::DawnContext::submitRecording(skgpu::graphite::Recorder*, skgpu::graphite::SyncToCpu)+725) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
          #20 pc 000000000129edbf  base.apk!librnskia.so (offset 0x4278000) (RNSkia::DawnContext::upload(sk_sp<SkImage> const&, bool)+207) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
          #21 pc 00000000016d44bf  base.apk!librnskia.so (offset 0x4278000) (RNSkia::DawnContext::MakeTextureImage(sk_sp<SkImage> const&, bool)+175) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
          #22 pc 00000000016b6b75  base.apk!librnskia.so (offset 0x4278000) (RNSkia::JsiSkImage::makeTextureImage(facebook::jsi::Runtime&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)+405) (BuildId: 74bb6812968b396fef2f94cf5d09163272a344a6)
