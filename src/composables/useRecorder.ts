// src/composables/useRecorder.ts
import { ref } from 'vue';
import { useConsole } from '@/composables/useConsole';
import { ConfigStore } from '@/core/ConfigStore';

// ==========================================
// 工业级 16kHz 16-bit 单声道 WAV 编码器
// 彻底解决 Whisper 引擎"挑食"不认格式的问题
// ==========================================
const encodeTo16kHzWAV = async (audioChunks: BlobPart[]): Promise<Uint8Array> => {
  // 1. 把所有小碎块拼成一个大 Blob
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const arrayBuffer = await blob.arrayBuffer();

  // 2. 使用 AudioContext 强行以 16000Hz 采样率解码音频
  const audioCtx = new window.AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // 3. 提取单声道数据
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
  view.setUint32(28, 16000 * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16 bit)
  writeString(view, 36, 'data');
  view.setUint32(40, channelData.length * 2, true);

  // 5. 写入 16-bit PCM 数据
  let offset = 44;
  for (let i = 0; i < channelData.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Uint8Array(wavBuffer);
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export function useRecorder() {
  const { addLog } = useConsole();
  
  // ==========================================
  // 1. 响应式状态与总开关
  // ==========================================
  const isAutoVoiceMode = ref(false);
  const isListening = ref(false);
  const isRecording = ref(false);

  // ==========================================
  // 2. VAD 核心参数（从 ConfigStore 读取，支持热更新）
  // ==========================================
  const silenceThreshold = ref(30);     // 唤醒灵敏度 (0~255)
  const silenceDuration = ref(1500);    // 闭口判定延迟 (ms)

  // 从持久化配置加载 VAD 参数
  const loadVadConfig = async () => {
    silenceThreshold.value = await ConfigStore.get<number>('yuki_vad_threshold', 30);
    silenceDuration.value = await ConfigStore.get<number>('yuki_vad_duration', 1500);
  };

  // 保存 VAD 参数（供设置面板调用）
  const saveVadConfig = async (threshold: number, duration: number) => {
    silenceThreshold.value = threshold;
    silenceDuration.value = duration;
    await ConfigStore.set('yuki_vad_threshold', threshold);
    await ConfigStore.set('yuki_vad_duration', duration);
    addLog('success', 'AudioVAD', `VAD 参数已更新: 阈值=${threshold}, 静默时长=${duration}ms`);
  };

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
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  let onSentenceFinished: ((wav: Uint8Array) => void) | null = null;

  let frameCount = 0;

  // ==========================================
  // 3. 原子操作：真正的录音启停
  // ==========================================
  const startActualRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'inactive') return;
    audioChunks = [];
    mediaRecorder.start();
    isRecording.value = true;
    addLog('info', 'AudioVAD', '🎙️ 检测到人声，开始捕获音频...');
    
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
  // 4. 高频雷达循环 (60FPS)
  // ==========================================
  const checkVolume = () => {
    if (!analyser || !isAutoVoiceMode.value) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const averageVolume = sum / dataArray.length;

    // 使用可配置的阈值
    const threshold = silenceThreshold.value;
    const duration = silenceDuration.value;

    if (averageVolume > threshold) {
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
         }, duration);
      }
    }

    animationFrameId = requestAnimationFrame(checkVolume);
  };

  // ==========================================
  // 5. 模式启停控制器
  // ==========================================
  const startAutoVoice = async (callback: (wav: Uint8Array) => void) => {
    if (isAutoVoiceMode.value) return; 
    try {
      await loadVadConfig(); // 每次开启时重新加载最新配置
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

      mediaRecorder.onstop = async () => {
         try {
           const wavBytes = await encodeTo16kHzWAV(audioChunks);
           addLog('success', 'AudioVAD', `句子切割完成`);
           if (onSentenceFinished) onSentenceFinished(wavBytes); 
         } catch (err: any) {
           addLog('error', 'AudioVAD', `❌ 音频转码失败: ${err.message}`);
         }
      };

      isAutoVoiceMode.value = true;
      isListening.value = true;
      addLog('info', 'AudioVAD', '🟢 自动语音模式已开启');
      
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

     addLog('warning', 'AudioVAD', '🔴 自动语音模式已关闭');
  };

  return {
    isAutoVoiceMode,
    isListening,
    isRecording,
    silenceThreshold,
    silenceDuration,
    startAutoVoice,
    stopAutoVoice,
    loadVadConfig,
    saveVadConfig,
  };
}
