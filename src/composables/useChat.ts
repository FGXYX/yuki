// src/composables/useChat.ts
import { ref, shallowRef, nextTick, watch, onMounted, onUnmounted, triggerRef } from 'vue';
import { fetchHistory, insertMessage, clearHistoryDB } from '@/core/Database';
import { ConfigStore } from '@/core/ConfigStore'; 
import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

import { useTTS } from '@/composables/useTTS';
import { useConsole } from '@/composables/useConsole';
import { invoke } from '@tauri-apps/api/core';

import { exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

import { smartFilterSkills, buildSkillPrompt } from '@/core/SkillManager';

export function useChat() {
  const isChatInputOpen = ref(false); 
  const isSpeaking = ref(false);      
  const chatInputText = ref('');
  const bubbleMessage = ref('');
  const chatInputRef = ref<HTMLTextAreaElement | null>(null);
  const isChatHistoryOpen = ref(false);
  const historyScrollRef = ref<HTMLElement | null>(null);
  let speechTimer: ReturnType<typeof setTimeout> | null = null;

  const chatHistory = shallowRef<{role: string, content: string, timestamp?: number | string}[]>([]);
  const bubbleScrollRef = ref<HTMLElement | null>(null);

  const currentEmotion = ref('normal');
  const { addLog } = useConsole();
  const { stopTTS, speakSentence } = useTTS();

  const mcpConfigs = ref<any[]>([]);
  const agentSkills = ref<any[]>([]);

  const loadSkills = async () => {
    const saved = await ConfigStore.get<any[]>('yuki_agent_skills', []);
    agentSkills.value = saved;
  };

  const saveSkills = async () => {
    await ConfigStore.set('yuki_agent_skills', agentSkills.value);
  };

  // 🌟 [修正点]：这里重新用上了 appDataDir 和 join
  const initYukiFolders = async () => {
    try {
      const hasMcpDir = await exists('mcp_plugins', { baseDir: BaseDirectory.AppData });
      if (!hasMcpDir) {
        await mkdir('mcp_plugins', { baseDir: BaseDirectory.AppData, recursive: true });
        console.log("✅ MCP 专属目录自动创建成功！");
      }
      
      // 使用 appDataDir 获取应用数据根目录
      const appDataPath = await appDataDir();
      // 使用 join 安全地拼接跨平台路径
      const mcpAbsolutePath = await join(appDataPath, 'mcp_plugins');
      console.log("📂 当前设备的 MCP 根目录位于:", mcpAbsolutePath);
      addLog('system', 'FileSystem', `MCP 插件目录已就绪: ${mcpAbsolutePath}`);
    } catch (error) {
      console.error("❌ 初始化文件夹失败:", error);
    }
  };

  const loadMcpConfigs = async () => {
    const saved = await ConfigStore.get<any[]>('yuki_mcp_configs', []);
    mcpConfigs.value = saved;
  };

  const saveMcpConfigs = async () => {
    await ConfigStore.set('yuki_mcp_configs', mcpConfigs.value);
  };

  watch(bubbleMessage, () => { nextTick(() => { if (bubbleScrollRef.value) bubbleScrollRef.value.scrollTop = bubbleScrollRef.value.scrollHeight; }); });
  watch(chatHistory, () => { if (isChatHistoryOpen.value) { nextTick(() => { if (historyScrollRef.value) historyScrollRef.value.scrollTop = historyScrollRef.value.scrollHeight; }); } }, { deep: true });

  const loadChatHistory = async () => {
    const activeSessionId = await ConfigStore.get<string>('yuki_active_session', 'default');
    const rawHistory = await fetchHistory(50, activeSessionId); 
    chatHistory.value = rawHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at
    }));
  };

  const clearChatHistory = async () => {
    stopTTS(); 
    const activeSessionId = await ConfigStore.get<string>('yuki_active_session', 'default');
    await clearHistoryDB(activeSessionId);
    chatHistory.value = [];
    triggerSpeechBubble('唔...脑袋空空的，前面的事情我都忘光啦！', 4000);
    await emit('yuki-history-updated');
  };

  const openChatWindow = async () => {
    try {
      const chatWin = await WebviewWindow.getByLabel('chat-room');
      if (chatWin) { await chatWin.show(); await chatWin.setFocus(); } 
      else { 
        new WebviewWindow('chat-room', { url: '/', title: 'Yuki 专属聊天室', width: 850, height: 700 }); 
      }
    } catch (e) { console.warn('获取聊天窗口失败:', e); }
  };

  const adjustTextareaHeight = () => {
    if (!chatInputRef.value) return;
    const textarea = chatInputRef.value;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const triggerSpeechBubble = (text: string, durationMs: number = 6000) => {
    bubbleMessage.value = text;
    isSpeaking.value = true;
    if (speechTimer) clearTimeout(speechTimer);
    speechTimer = setTimeout(() => { isSpeaking.value = false; }, durationMs);
  };

  const sendMessage = async () => {
    const text = chatInputText.value.trim();
    if (!text) return;

    if (text === '/clear' || text === '清除记忆') {
      chatInputText.value = ''; clearChatHistory(); return;
    }

    stopTTS(); 
    chatInputText.value = '';
    if (chatInputRef.value) { chatInputRef.value.style.height = '24px'; chatInputRef.value.focus(); }
    triggerSpeechBubble('正在思考...', 99999);
    currentEmotion.value = 'thinking'; 

    try {
      const aiList = await ConfigStore.get<any[]>('yuki_ai_list', []);
      const activeAiId = await ConfigStore.get<string>('yuki_active_ai', '');
      const aiConfig = aiList.find((a: any) => a.id === activeAiId);
      if (!aiConfig) { triggerSpeechBubble('AI 未配置哦！', 4000); return; }

      const persona = await ConfigStore.get<any>('yuki_persona', null);
      let basePrompt = '你是 Yuki，傲娇萝莉。';
      let emotionInstruction = `\n\n【指令】开头必须带情绪标签如 [happy]。`;

      let tools: any[] = [];
      try {
        const toolsStr = await invoke<string>('get_all_mcp_tools', { configs: mcpConfigs.value });
        if (toolsStr) tools = JSON.parse(toolsStr);
      } catch (e) { addLog('warning', 'MCP', '加载工具失败'); }

      let systemPrompt = (persona?.prompt || basePrompt) + emotionInstruction;
      const activeSkills = smartFilterSkills(agentSkills.value, text);
      if (activeSkills.length > 0) {
        systemPrompt += buildSkillPrompt(activeSkills);
      }

      const activeSessionId = await ConfigStore.get<string>('yuki_active_session', 'default');
      chatHistory.value = [...chatHistory.value, { role: 'user', content: text, timestamp: Date.now() }];
      await insertMessage('user', text, activeSessionId); 
      await emit('yuki-history-updated'); 

      const apiHistory = chatHistory.value.map(msg => ({ role: msg.role, content: msg.content }));
      const messages = [ { role: 'system', content: systemPrompt }, ...apiHistory ];

      let isToolCall = false;
      let toolCallName = '';
      let toolCallArgs = '';
      const assistantMsg = { role: 'assistant', content: '', timestamp: Date.now(), usage: null as any };

      const interceptTextToolCall = () => {
        const regex = /<tool_call>([\s\S]*?)(?:<\/tool_call>|<\/arg_value>)/;
        const match = assistantMsg.content.match(regex);
        if (match) {
          try {
            const rawJson = match[1].trim();
            const parsed = JSON.parse(rawJson);
            isToolCall = true;
            toolCallName = parsed.name;
            toolCallArgs = JSON.stringify(parsed.args || {});
            assistantMsg.content = assistantMsg.content.replace(regex, '').replace(/<\/think>/g, '').trim();
            bubbleMessage.value = assistantMsg.content;
            addLog('warning', 'Text_Interceptor', `捕捉到文本调用 [${toolCallName}]`);
            return true;
          } catch (e) { addLog('error', 'Parser', 'JSON 解析失败'); }
        }
        return false;
      };

      let endpoint = aiConfig.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const requestBody: any = { 
        model: aiConfig.modelName, messages: messages, temperature: 0.5, stream: true,
        frequency_penalty: 0.7, presence_penalty: 0.6,
        tools: tools.length > 0 ? tools : undefined,
        stream_options: { "include_usage": true }
      };

      addLog('system', 'Prompt_Assembly', `--- 🚀 发送给 AI 的全量数据包 ---\n${JSON.stringify(requestBody, null, 2)}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
        body: JSON.stringify(requestBody)
      });

      // --- 新增：HTTP 状态码预检 ---
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        let detail = errorData.error?.message || response.statusText;
        
        // 记录到系统日志
        addLog('error', 'API_Response', `请求失败 [${status}]: ${detail}`);
        
        // 抛出特定错误供外部 catch 捕获
        if (status === 401) throw new Error("API_KEY_INVALID");
        if (status === 429) throw new Error("RATE_LIMIT_REACHED");
        throw new Error(`SERVER_ERROR_${status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let sentenceBuffer = '';
      let isParsingEmotion = true;
      let tempEmotionBuffer = '';

      chatHistory.value = [...chatHistory.value, assistantMsg];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (!line || line === 'data: [DONE]') continue;
            line = line.replace(/^data:\s*/i, '').trim();
            try {
              const parsed = JSON.parse(line);
              if (parsed.usage) {
                assistantMsg.usage = parsed.usage;
                addLog('info', 'Token_Usage', `[第一轮] 输入: ${parsed.usage.prompt_tokens}, 输出: ${parsed.usage.completion_tokens}`);
              }
              const delta = parsed.choices?.[0]?.delta || {};
              
              if (delta.tool_calls) {
                isToolCall = true;
                const tc = delta.tool_calls[0];
                if (tc.function?.name) {
                  toolCallName += tc.function.name;
                  addLog('warning', 'AI_Decision', `AI 决策调用工具 [${tc.function.name}]`);
                }
                if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                bubbleMessage.value = `⚙️ 正在执行：${toolCallName}...`;
                continue;
              }

              const token = delta.content || '';
              if (token && !isToolCall) {
                if (isParsingEmotion) {
                  tempEmotionBuffer += token;
                  if (/[\]】]/.test(tempEmotionBuffer)) {
                    const match = tempEmotionBuffer.match(/^\s*[\[【]([a-zA-Z]+)[\]】]/);
                    if (match) {
                      currentEmotion.value = match[1].toLowerCase();
                      emit('yuki-trigger-emotion-motion', currentEmotion.value);
                      const rest = tempEmotionBuffer.replace(/^\s*[\[【][a-zA-Z]+[\]】]/, '');
                      assistantMsg.content += rest; sentenceBuffer += rest;
                    } else { assistantMsg.content += tempEmotionBuffer; sentenceBuffer += tempEmotionBuffer; }
                    isParsingEmotion = false;
                  } else if (tempEmotionBuffer.length > 25) { isParsingEmotion = false; assistantMsg.content += tempEmotionBuffer; }
                } else { assistantMsg.content += token; sentenceBuffer += token; }
                bubbleMessage.value = assistantMsg.content;
                triggerRef(chatHistory);
                if (/[。！？\n]/.test(token)) { speakSentence(sentenceBuffer, currentEmotion.value); sentenceBuffer = ''; }
              }
            } catch (e) {
              // --- 改进：记录解析失败的行，但不中断整个循环 ---
              // 过滤掉已知的非 JSON 内容，其余报错
              if (!line.includes('keep-alive')) {
                addLog('warning', 'Stream_Parser', `非法数据行: "${line.slice(0, 60)}..." | 错误: ${e}`);
              }
              continue;
            }
          }
        }
      }

      if (!isToolCall) interceptTextToolCall();

      while (isToolCall) {
        const currentName = toolCallName;
        const currentArgs = toolCallArgs;
        isToolCall = false; 

        addLog('success', 'MCP_Skill', `--- 🛠️ 触发工具执行 ---\n参数: ${currentArgs}`);
        bubbleMessage.value = `⚙️ 正在执行：${currentName}...`;

        let resultMsg = "";
        try {
          const resultStr = await invoke<string>('execute_mcp_tool', {
            toolName: currentName, toolArgs: currentArgs, configs: mcpConfigs.value
          });
          const mcpResult = JSON.parse(resultStr);
          resultMsg = mcpResult.result?.content?.[0]?.text || "执行成功！";
          addLog('success', 'MCP_Return', `--- 📥 工具结果已返回 AI ---\n${resultMsg}`);
        } catch (mcpErr: any) { resultMsg = String(mcpErr); addLog('error', 'MCP_Error', resultMsg); }

        messages.push({ role: 'assistant', content: assistantMsg.content }); 
        messages.push({ role: 'user', content: `【系统通知】工具 \`${currentName}\` 执行完毕：\n${resultMsg}` });

        assistantMsg.content = ''; 
        toolCallName = ''; toolCallArgs = ''; 
        sentenceBuffer = '';

        const feedbackBody = { model: aiConfig.modelName, messages: messages, temperature: 0.5, stream: true, stream_options: { "include_usage": true } };
        addLog('system', 'LLM_Feedback', `--- 🚀 发送反馈轮全量数据包 ---\n${JSON.stringify(feedbackBody, null, 2)}`);

        const res2 = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
          body: JSON.stringify(feedbackBody)
        });

        const reader2 = res2.body?.getReader();
        const decoder2 = new TextDecoder('utf-8');
        let buffer2 = '';
        let isParsingEmotion2 = true;
        let tempEmotionBuffer2 = '';

        if (reader2) {
          while (true) {
            const { done, value } = await reader2.read();
            if (done) break;
            buffer2 += decoder2.decode(value, { stream: true });
            let newlineIndex;
            while ((newlineIndex = buffer2.indexOf('\n')) !== -1) {
              let line = buffer2.slice(0, newlineIndex).trim();
              buffer2 = buffer2.slice(newlineIndex + 1);
              if (!line || line === 'data: [DONE]') continue;
              line = line.replace(/^data:\s*/i, '').trim();
              try {
                const parsed = JSON.parse(line);
                if (parsed.usage) {
                  assistantMsg.usage = parsed.usage;
                  addLog('info', 'Token_Usage', `[反馈轮] 输入: ${parsed.usage.prompt_tokens}, 输出: ${parsed.usage.completion_tokens}`);
                }
                const token = parsed.choices?.[0]?.delta?.content || '';
                if (token) {
                  if (isParsingEmotion2) {
                    tempEmotionBuffer2 += token;
                    if (/[\]】]/.test(tempEmotionBuffer2)) {
                      const match = tempEmotionBuffer2.match(/^\s*[\[【]([a-zA-Z]+)[\]】]/);
                      if (match) {
                        currentEmotion.value = match[1].toLowerCase();
                        emit('yuki-trigger-emotion-motion', currentEmotion.value);
                        const rest = tempEmotionBuffer2.replace(/^\s*[\[【][a-zA-Z]+[\]】]/, '');
                        assistantMsg.content += rest; sentenceBuffer += rest;
                      } else { assistantMsg.content += tempEmotionBuffer2; sentenceBuffer += tempEmotionBuffer2; }
                      isParsingEmotion2 = false;
                    } else if (tempEmotionBuffer2.length > 25) { isParsingEmotion2 = false; assistantMsg.content += tempEmotionBuffer2; }
                  } else { assistantMsg.content += token; sentenceBuffer += token; }
                  bubbleMessage.value = assistantMsg.content;
                  triggerRef(chatHistory);
                  if (/[。！？\n]/.test(token)) { speakSentence(sentenceBuffer, currentEmotion.value); sentenceBuffer = ''; }
                }
              } catch (e) {}
            }
          }
        }
        interceptTextToolCall();
      }

      const imgRegex = /(https:\/\/ibb\.co\/\S+|https:\/\/i\.ibb\.co\/\S+|https:\/\/ibb\.co\/album\/\S+|https:\/\/pixiv\.re\/\S+)/g;
      if (assistantMsg.content.includes('http') && !assistantMsg.content.includes('![')) {
        assistantMsg.content = assistantMsg.content.replace(imgRegex, "![图片]($1)");
        bubbleMessage.value = assistantMsg.content;
      }

      await insertMessage('assistant', assistantMsg.content, activeSessionId);
      await emit('yuki-history-updated'); 
      if (sentenceBuffer.trim()) speakSentence(sentenceBuffer, currentEmotion.value);
      
      const displayTime = Math.max(4000, assistantMsg.content.length * 35);
      triggerSpeechBubble(assistantMsg.content, displayTime);
      setTimeout(() => { currentEmotion.value = 'normal'; }, displayTime);

    } catch (err: any) {
      addLog('error', 'Chat_Logic', `对话中断: ${err.message}`);
      
      let feedback = "唔... 感觉大脑断网了，主人能检查一下配置吗？";
      currentEmotion.value = 'shame'; // 切换到尴尬或困扰的表情

      if (err.message === "API_KEY_INVALID") {
        feedback = "主人，API Key 好像失效了，去设置里看看吧？";
      } else if (err.message === "RATE_LIMIT_REACHED") {
        feedback = "呼... 说得太快了，歇一会儿再聊吧。";
      } else if (err.name === 'AbortError') {
        feedback = "这次思考太久了，我有点累了...";
      }

      triggerSpeechBubble(feedback, 6000); // UI 气泡反馈
    }
  };

  // 🌟 [修正点]：彻底补回生命周期逻辑
  let unlistenHistory: UnlistenFn | null = null;
  onMounted(async () => {
    await loadMcpConfigs();
    loadChatHistory();
    // 补回数据库监听
    unlistenHistory = await listen('yuki-history-updated', async () => { await loadChatHistory(); });
    await loadSkills();
    initYukiFolders();
  });

  // 补回清理逻辑
  onUnmounted(() => { if (unlistenHistory) unlistenHistory(); });

  return {
    isChatInputOpen, isSpeaking, chatInputText, bubbleMessage, 
    chatInputRef, isChatHistoryOpen, historyScrollRef, chatHistory, bubbleScrollRef,
    clearChatHistory, loadChatHistory, openChatWindow, adjustTextareaHeight, triggerSpeechBubble, sendMessage,
    currentEmotion, mcpConfigs, saveMcpConfigs, agentSkills, saveSkills
  };
}