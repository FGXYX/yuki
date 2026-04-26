// src/composables/useTTS.ts
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ConfigStore } from '@/core/ConfigStore';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event'; // 🌟 引入事件系统

// 保持全局状态（这些变量在同一个窗口的多个组件间共享）
const isTtsEnabled = ref(false);
const ttsList = ref<any[]>([]);
const activeTtsId = ref('');

interface AudioTask { text: string; emotion: string; }
const audioQueue = ref<AudioTask[]>([]);
const isPlayingTTS = ref(false);
let currentAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;

export function useTTS() {
  // 🌟 核心：从数据库加载配置
  const loadTtsConfig = async () => {
    isTtsEnabled.value = await ConfigStore.get<boolean>('yuki_tts_enabled', false);
    const savedList = await ConfigStore.get<any[]>('yuki_tts_list', []);
    
    if (savedList && savedList.length > 0) {
      ttsList.value = savedList;
    } else {
      ttsList.value = [{
        id: 'tts_default',
        name: '默认 GPT-SoVITS',
        engineType: 'gpt-sovits', 
        apiUrl: 'http://127.0.0.1:9880',
        refAudioPath: '', 
        promptText: '',   
        promptLang: 'zh',
        textLang: 'zh'
      }];
    }
    const savedActiveId = await ConfigStore.get<string>('yuki_active_tts', '');
    activeTtsId.value = savedActiveId || (ttsList.value[0]?.id || '');
  };

  // 🌟 核心：保存配置并广播给所有窗口
  const saveTtsConfig = async () => {
    await ConfigStore.set('yuki_tts_enabled', isTtsEnabled.value);
    await ConfigStore.set('yuki_tts_list', ttsList.value);
    await ConfigStore.set('yuki_active_tts', activeTtsId.value);
    // 广播：嘿！语音设置改了，大家快刷新！
    await emit('yuki-tts-config-changed');
  };

  // 自动挂载监听器
  let unlistenTtsConfig: UnlistenFn | null = null;
  
  onMounted(async () => {
    await loadTtsConfig();
    // 监听：收到其他窗口的更新指令，立刻重新加载内存状态
    unlistenTtsConfig = await listen('yuki-tts-config-changed', async () => {
      await loadTtsConfig();
    });
  });

  // 🛡️ 新增：组件卸载时清理监听器
  onUnmounted(() => {
    if (unlistenTtsConfig) {
      unlistenTtsConfig();
      unlistenTtsConfig = null;
    }
  });

  const activeConfig = computed(() => {
    return ttsList.value.find(t => t.id === activeTtsId.value) || ttsList.value[0];
  });

  const stopTTS = () => {
    audioQueue.value = [];
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
    isPlayingTTS.value = false;
  };

  const playNextTTS = async () => {
    if (!isTtsEnabled.value || isPlayingTTS.value || audioQueue.value.length === 0) return;
    
    const config = activeConfig.value;
    if (!config || !config.apiUrl) {
      console.warn('TTS 配置无效，跳过播放');
      audioQueue.value.shift();
      playNextTTS();
      return;
    }

    isPlayingTTS.value = true;
    const task = audioQueue.value.shift();
    if (!task) { isPlayingTTS.value = false; return; }
    
    let textToSpeak = task.text
      .replace(/```[\s\S]*?```/g, '')         // 1. 过滤代码块
      .replace(/!\[.*?\]\(.*?\)/g, '')        // 2. 过滤 Markdown 图片格式 ![alt](url)
      .replace(/\[.*?\]\(.*?\)/g, '')         // 3. 过滤 Markdown 链接格式 [text](url)
      .replace(/(https?:\/\/[^\s]+)/g, '')    // 4. 过滤残留的纯 URL 链接
      .replace(/[#*`~_]/g, '')                // 5. 过滤加粗、标题、斜体等特殊符号
      .replace(/\[happy\]|\[sad\]|\[angry\]|\[shy\]|\[normal\]/g, '') // 6. 过滤掉情绪标签本身
      .replace(/，/g, ' ')                    // 7. 滤掉中文逗号，换成空格，避免语音合成时的停顿
      .trim();
    if (!textToSpeak) { isPlayingTTS.value = false; playNextTTS(); return; }

    try {
      if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }

      if (config.engineType === 'gpt-sovits') {
        // 动态情感映射
        const emotionDictionary: Record<string, { audio: string, text: string }> = {
          happy: { audio: config.happyAudioPath || config.refAudioPath, text: config.happyPromptText || config.promptText },
          sad: { audio: config.sadAudioPath || config.refAudioPath, text: config.sadPromptText || config.promptText },
          angry: { audio: config.angryAudioPath || config.refAudioPath, text: config.angryPromptText || config.promptText },
          shy: { audio: config.shyAudioPath || config.refAudioPath, text: config.shyPromptText || config.promptText },
          normal: { audio: config.refAudioPath, text: config.promptText }
        };

        const emo = emotionDictionary[task.emotion] || emotionDictionary['normal'];
        const baseUrl = config.apiUrl.replace(/\/$/, '');
        const url = new URL(`${baseUrl}/tts`);
        url.searchParams.append('text', textToSpeak);
        url.searchParams.append('text_lang', config.textLang || 'zh');
        url.searchParams.append('prompt_text', emo.text || '');
        url.searchParams.append('prompt_lang', config.promptLang || 'zh');
        url.searchParams.append('ref_audio_path', emo.audio || '');
        // 🌟 [新增]：添加语速参数，默认值为 1.0
        url.searchParams.append('speed', config.speed || 1.0);

        // 🌟 发起请求
        currentAudio = new Audio(url.toString());
      } else if (config.engineType === 'openai') {
        const response = await fetch(config.apiUrl.replace(/\/+$/, '') + '/audio/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}) },
          body: JSON.stringify({ model: "tts-1", input: textToSpeak, voice: config.voiceId || "alloy" })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        currentBlobUrl = URL.createObjectURL(blob);
        currentAudio = new Audio(currentBlobUrl);
      }

      if (currentAudio) {
        currentAudio.onended = () => { isPlayingTTS.value = false; playNextTTS(); };
        currentAudio.onerror = (e) => { console.error('音频播放失败:', e); isPlayingTTS.value = false; playNextTTS(); };
        await currentAudio.play();
      }
    } catch (err) {
      console.error('TTS 引擎请求失败:', err);
      isPlayingTTS.value = false;
      playNextTTS();
    }
  };

  const speakSentence = (sentence: string, emotion: string = 'normal') => {
    // 🌟 如果此时 loadTtsConfig 还没完成，isTtsEnabled 为 false，这里就会拦截
    if (!isTtsEnabled.value) return; 
    if (sentence.trim()) {
      audioQueue.value.push({ text: sentence.trim(), emotion });
      playNextTTS();
    }
  };

  return {
    isTtsEnabled, ttsList, activeTtsId, isPlayingTTS, 
    loadTtsConfig, saveTtsConfig, stopTTS, speakSentence
  };
}