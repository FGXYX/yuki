// src/core/AudioEncoder.ts

/**
 * 将前端录制的 WebM/OGG 音频 Blob 转换为 16kHz, 16-bit, 单声道的 WAV Uint8Array
 */
export async function convertTo16kHzWav(audioBlob: Blob): Promise<Uint8Array> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new window.AudioContext();
  
  // 1. 解码原始音频
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // 2. 使用离线上下文进行降采样 (目标：单声道, 16000Hz)
  const offlineContext = new window.OfflineAudioContext(
    1, // 单声道
    audioBuffer.duration * 16000, // 总采样帧数
    16000 // 目标采样率 16kHz
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  // 渲染出降采样后的音频
  const resampledBuffer = await offlineContext.startRendering();
  
  // 获取单声道数据 (Float32Array, 范围 -1 到 1)
  const channelData = resampledBuffer.getChannelData(0);
  
  // 3. 编码为 16-bit PCM 并添加 WAV 头
  return encodeWAV(channelData, 16000);
}

/**
 * 手工拼接 WAV 文件头
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // 辅助函数：写入字符串
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  
  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, 1, true);  // audio format (1 for PCM)
  view.setUint16(22, 1, true);  // num channels (1)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * numChannels * bytesPerSample)
  view.setUint16(32, 2, true);  // block align (numChannels * bytesPerSample)
  view.setUint16(34, 16, true); // bits per sample (16)
  
  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true); // data size
  
  // 写入 16-bit PCM 数据 (将 -1~1 的浮点数映射到 -32768~32767)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Uint8Array(buffer);
}