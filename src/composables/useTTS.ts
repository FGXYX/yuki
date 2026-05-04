// src/composables/useTTS.ts
import { ref, shallowRef } from 'vue';
import { ConfigStore } from '@/core/ConfigStore';
import { useConsole } from '@/composables/useConsole';

// 全局状态：确保在不同组件间共享同一个播放队列
interface AudioTask { 
  text: string; 
  emotion: string; 
}

const audioQueue = shallowRef<AudioTask[]>([]);
const isPlayingTTS = ref(false);
const isTtsEnabled = ref(false);

// TTS 配置列表（全局共享，设置面板和主窗口都能访问）
const ttsList = ref<any[]>([]);
const activeTtsId = ref('');

let isProcessingQueue = false;
let currentAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;

export function useTTS() {
  const { addLog } = useConsole();

  /**
   * 加载配置：从数据库同步 TTS 开关状态 + 配置列表
   */
  const loadTtsConfig = async () => {
    isTtsEnabled.value = await ConfigStore.get<boolean>('yuki_tts_enabled', false);
    ttsList.value = await ConfigStore.get<any[]>('yuki_tts_list', []);
    activeTtsId.value = await ConfigStore.get<string>('yuki_tts_active_id', '');

    // 如果列表不为空但没有选中的配置，默认选中第一个
    if (ttsList.value.length > 0 && !activeTtsId.value) {
      activeTtsId.value = ttsList.value[0].id;
    }

    addLog('info', 'TTS', `语音引擎状态: ${isTtsEnabled.value ? '已开启' : '已关闭'}`);
  };

  /**
   * 获取当前启用的 TTS 配置
   */
  const getActiveTtsConfig = () => {
    if (!activeTtsId.value || ttsList.value.length === 0) return null;
    return ttsList.value.find((t: any) => t.id === activeTtsId.value) || ttsList.value[0];
  };

  /**
   * 保存 TTS 配置列表 + 活跃 ID
   */
  const saveTtsConfig = async () => {
    await ConfigStore.set('yuki_tts_list', ttsList.value);
    await ConfigStore.set('yuki_tts_active_id', activeTtsId.value);
    addLog('success', 'TTS', 'TTS 配置已保存');
  };

  /**
   * 核心：停止播放并重置队列
   */
  const stopTTS = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    audioQueue.value = [];
    isProcessingQueue = false;
    isPlayingTTS.value = false;
    addLog('info', 'TTS', '🛑 语音播放已强制停止，队列已清空');
  };

  /**
   * 对外暴露的入队接口
   */
  const speakSentence = (text: string, emotion: string = 'normal') => {
    if (!isTtsEnabled.value) return;
    
    const cleanText = text.trim();
    if (!cleanText) return;

    audioQueue.value.push({ text: cleanText, emotion });
    processQueue();
  };

  /**
   * 队列调度器
   */
  const processQueue = async () => {
    if (isProcessingQueue || audioQueue.value.length === 0) return;

    isProcessingQueue = true;
    isPlayingTTS.value = true;

    while (audioQueue.value.length > 0) {
      const task = audioQueue.value.shift();
      if (!task) continue;

      try {
        await playSingleSentence(task);
      } catch (err) {
        addLog('error', 'TTS', `播放异常: ${err}`);
      }
    }

    isProcessingQueue = false;
    isPlayingTTS.value = false;
  };

  /**
   * 播放单句逻辑：从当前活跃的 TTS 配置读取引擎参数
   */
  const playSingleSentence = (task: AudioTask): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // 从配置列表中获取当前启用的 TTS 配置
        const config = getActiveTtsConfig();
        if (!config) {
          addLog('warning', 'TTS', '没有可用的 TTS 配置，请先在设置中配置');
          resolve();
          return;
        }

        const engineType = config.engineType || 'gpt-sovits';
        let audioUrl = '';

        if (engineType === 'gpt-sovits') {
          // GPT-SoVITS V2 通过 GET 请求返回音频流
          const baseUrl = config.apiUrl ? config.apiUrl.replace(/\/+$/, '') : '';
          if (!baseUrl) throw new Error('GPT-SoVITS API 地址未配置');
          audioUrl = `${baseUrl}?text=${encodeURIComponent(task.text)}&emotion=${task.emotion}`;
        } else if (engineType === 'openai') {
          // 标准 OpenAI TTS 协议（POST）
          const baseUrl = config.apiUrl ? config.apiUrl.replace(/\/+$/, '') : '';
          if (!baseUrl) throw new Error('OpenAI TTS API 地址未配置');
          const response = await fetch(`${baseUrl}/audio/speech`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}) 
            },
            body: JSON.stringify({
              model: "tts-1",
              input: task.text,
              voice: config.voiceId || "alloy"
            })
          });
          if (!response.ok) throw new Error(`API 返回错误: ${response.status}`);
          const blob = await response.blob();
          currentBlobUrl = URL.createObjectURL(blob);
          audioUrl = currentBlobUrl;
        }

        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
          if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
            currentBlobUrl = null;
          }
          currentAudio = null;
          resolve(); 
        };

        audio.onerror = (e) => {
          currentAudio = null;
          reject(new Error('音频加载或播放失败'));
        };

        await audio.play();
      } catch (e) {
        reject(e);
      }
    });
  };

  return {
    isPlayingTTS,
    isTtsEnabled,
    ttsList,
    activeTtsId,
    loadTtsConfig,
    saveTtsConfig,
    stopTTS,
    speakSentence,
  };
}
