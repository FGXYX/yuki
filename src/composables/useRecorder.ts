// src/composables/useRecorder.ts
import { ref } from 'vue';
import { useConsole } from '@/composables/useConsole';

// ==========================================
// 🌟 核心利器：工业级 16kHz 16-bit 单声道 WAV 编码器
// 彻底解决 Whisper 引擎“挑食”不认格式的问题
// ==========================================
const encodeTo16kHzWAV = async (audioChunks: BlobPart[]): Promise<Uint8Array> => {
  // 1. 把所有小碎块拼成一个大 Blob
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const arrayBuffer = await blob.arrayBuffer();

  // 2. 使用 AudioContext 强行以 16000Hz 采样率解码音频！(极其关键)
  const audioCtx = new window.AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // 3. 提取单声道数据 (如果原来是双声道，强行剥离只取第一个声道)
  const channelData = audioBuffer.getChannelData(0);

  // 4. 准备 WAV 文件头和数据体
  const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
  const view = new DataView(wavBuffer);

  // 写入标准的 RIFF/WAVE 头
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + channelData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 mono)
  view.setUint32(24, 16000, true); // SampleRate (16000Hz)
  view.setUint32(28, 16000 * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16 bit)
  writeString(view, 36, 'data');
  view.setUint32(40, channelData.length * 2, true);

  // 5. 写入 16-bit PCM 数据 (将 Float32 转换为 Int16)
  let offset = 44;
  for (let i = 0; i < channelData.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Uint8Array(wavBuffer);
};

// 辅助函数：向 DataView 写入 ASCII 字符串
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export function useRecorder() {
  const { addLog } = useConsole();
  
  // ==========================================
  // 🌟 1. 响应式状态与总开关
  // ==========================================
  const isAutoVoiceMode = ref(false); // UI 总开关：用户是否开启了语音唤醒
  const isListening = ref(false);     // 底层状态：麦克风硬件是否在通电监听
  const isRecording = ref(false);     // 行为状态：雷达是否检测到声音，正在往阵列里写数据

  // ==========================================
  // 🌟 2. VAD 雷达核心调优参数 (根据需要微调)
  // ==========================================
  const SILENCE_THRESHOLD = 30;   // 唤醒灵敏度 (0~255)：大于这个值认为有人说话
  const SILENCE_DURATION = 1500;  // 闭口判定延迟：低于阈值持续 1.5 秒后结算这段录音 (这里帮你从6000调回了1500，6秒太长了容易卡死)

  // 底层实例缓存
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: BlobPart[] = [];
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let microphone: MediaStreamAudioSourceNode | null = null;
  let stream: MediaStream | null = null;

  // 控制流状态锁
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let animationFrameId: number | null = null;
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null; // 最大录音时长定时器
  let onSentenceFinished: ((wav: Uint8Array) => void) | null = null; // 录音结算后的回调

  let frameCount = 0;

  // ==========================================
  // 🌟 3. 原子操作：真正的录音启停
  // ==========================================
  const startActualRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'inactive') return;
    audioChunks = [];
    mediaRecorder.start();
    isRecording.value = true;
    addLog('info', 'AudioVAD', '🎙️ 检测到人声，开始捕获音频...');
    
    // 15 秒硬上限，防止长时间录音导致内存溢出
    maxDurationTimer = setTimeout(() => {
      if (isRecording.value) {
        addLog('warning', 'AudioVAD', '⏰ 达到最大录音时长（15秒），强制结算');
        stopActualRecording();
      }
    }, 15000);
  };

  const stopActualRecording = () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer);
      maxDurationTimer = null;
    }
    
    mediaRecorder.stop();
    isRecording.value = false;
    addLog('info', 'AudioVAD', '⏹️ 人声停止，正在结算音频流...');
  };

  // ==========================================
  // 🌟 4. 高频雷达循环 (60FPS)
  // ==========================================
  const checkVolume = () => {
    if (!analyser || !isAutoVoiceMode.value) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const averageVolume = sum / dataArray.length;

    // 每秒打印一次底噪方便调试，确认没问题后可以注释掉这行
    if (frameCount++ % 60 === 0) {
      // console.log(`🎤 当前麦克风底噪体积: ${averageVolume.toFixed(2)} | 触发阈值: ${SILENCE_THRESHOLD}`);
    }

    if (averageVolume > SILENCE_THRESHOLD) {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (!isRecording.value) {
        startActualRecording();
      }
    } else {
      if (isRecording.value && !silenceTimer) {
         silenceTimer = setTimeout(() => {
           stopActualRecording();
           silenceTimer = null;
         }, SILENCE_DURATION);
      }
    }

    animationFrameId = requestAnimationFrame(checkVolume);
  };

  // ==========================================
  // 🌟 5. 模式启停控制器
  // ==========================================
  const startAutoVoice = async (callback: (wav: Uint8Array) => void) => {
    if (isAutoVoiceMode.value) return; 
    try {
      onSentenceFinished = callback;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContext = new window.AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; 
      
      microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser); 

      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      // 🌟 【核心修改点】当录音判定结束，调用全新的 16kHz 编码器
      mediaRecorder.onstop = async () => {
         try {
           // 不再依赖外部文件，直接使用内嵌的高级编码器降采样
           const wavBytes = await encodeTo16kHzWAV(audioChunks);
           addLog('success', 'AudioVAD', `句子切割完成`);
           if (onSentenceFinished) onSentenceFinished(wavBytes); 
         } catch (err: any) {
           addLog('error', 'AudioVAD', `❌ 音频转码失败: ${err.message}`);
         }
      };

      isAutoVoiceMode.value = true;
      isListening.value = true;
      addLog('info', 'AudioVAD', '🟢 自动语音模式已开启，底层雷达持续扫描中...');
      
      checkVolume(); 

    } catch (err: any) {
      addLog('error', 'AudioVAD', `❌ 启动语音模式失败: ${err.message}`);
      stopAutoVoice();
    }
  };

  const stopAutoVoice = () => {
     isAutoVoiceMode.value = false;
     isListening.value = false;
     isRecording.value = false;
     
     if (silenceTimer) clearTimeout(silenceTimer);
     if (animationFrameId) cancelAnimationFrame(animationFrameId);
     if (maxDurationTimer) clearTimeout(maxDurationTimer);
     
     if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = null; 
        mediaRecorder.stop();
     }

     if (microphone) microphone.disconnect();
     if (analyser) analyser.disconnect();
     if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
     }
     if (stream) {
        stream.getTracks().forEach(track => track.stop());
     }

     addLog('warning', 'AudioVAD', '🔴 自动语音模式已关闭，麦克风已彻底释放。');
  };

  return {
    isAutoVoiceMode,
    isListening,
    isRecording,
    startAutoVoice,
    stopAutoVoice
  };
}