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

  // 🌟 1. 新增：MCP 插件配置状态管理
  const mcpConfigs = ref<any[]>([]);

  // 🌟 2. 新增：Agent Skill (SOP 提示词) 状态管理
  const agentSkills = ref<any[]>([]);

  const loadSkills = async () => {
    const saved = await ConfigStore.get<any[]>('yuki_agent_skills', [
      {
        name: '毒舌代码审查员',
        content: '当你被要求看代码文件时：\n1. 仔细寻找代码里有没有不优雅的地方。\n2. 如果发现问题，必须用[angry]情绪严厉指责主人的代码写得像一坨乱码，然后再给出优化建议。\n3. 如果代码写得好，用[shy]情绪傲娇地夸奖。',
        enabled: false
      }
    ]);
    agentSkills.value = saved;
  };

  const saveSkills = async () => {
    await ConfigStore.set('yuki_agent_skills', agentSkills.value);
  };

  const initYukiFolders = async () => {
  try {
    // 1. 检查应用数据目录下是否有 mcp_plugins 文件夹
    const hasMcpDir = await exists('mcp_plugins', { baseDir: BaseDirectory.AppData });
    
    // 2. 如果没有，程序自动以递归方式 (recursive: true) 创建它
    if (!hasMcpDir) {
      await mkdir('mcp_plugins', { baseDir: BaseDirectory.AppData, recursive: true });
      console.log("✅ MCP 专属目录自动创建成功！");
    }

    // 3. (可选) 获取这个目录的绝对路径，如果你需要传给 Node.js 或 Rust 执行器
    const appDataPath = await appDataDir();
    const mcpAbsolutePath = await join(appDataPath, 'mcp_plugins');
    console.log("📂 当前设备的 MCP 根目录位于:", mcpAbsolutePath);

  } catch (error) {
    console.error("❌ 初始化文件夹失败:", error);
  }
};

  // 从数据库加载 MCP 配置
  const loadMcpConfigs = async () => {
    // 获取系统的文档目录或一个安全的存放路径
    const saved = await ConfigStore.get<any[]>('yuki_mcp_configs', [
      {
        name: 'Memory-Local',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        // 🌟 新增默认环境变量配置
        env: {
          "MEMORY_FILE_PATH": "C:/Yuki_Data/memory.json" 
        },
        enabled: true
      }
    ]);
    mcpConfigs.value = saved;
  };

  // 保存 MCP 配置到数据库
  const saveMcpConfigs = async () => {
    await ConfigStore.set('yuki_mcp_configs', mcpConfigs.value);
  };

  watch(bubbleMessage, () => { nextTick(() => { if (bubbleScrollRef.value) bubbleScrollRef.value.scrollTop = bubbleScrollRef.value.scrollHeight; }); });
  watch(chatHistory, () => { if (isChatHistoryOpen.value) { nextTick(() => { if (historyScrollRef.value) historyScrollRef.value.scrollTop = historyScrollRef.value.scrollHeight; }); } }, { deep: true });
  watch(isChatHistoryOpen, (val) => { if (val) nextTick(() => { if (historyScrollRef.value) historyScrollRef.value.scrollTop = historyScrollRef.value.scrollHeight; }); });

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
        new WebviewWindow('chat-room', { url: '/', title: 'Yuki 专属聊天室', width: 850, height: 700, decorations: true, transparent: false, resizable: true, center: true }); 
      }
      isChatHistoryOpen.value = false;
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
      if (!aiList.length || !activeAiId) { triggerSpeechBubble('主人，你还没有在设置里配置 AI 大脑哦！', 4000); return; }
      const aiConfig = aiList.find((a: any) => a.id === activeAiId);
      if (!aiConfig || !aiConfig.baseUrl) { triggerSpeechBubble('AI 配置好像不完整，去设置里检查一下吧~', 4000); return; }

      const persona = await ConfigStore.get<any>('yuki_persona', null);
      
      let basePrompt = '你是 Yuki，一个聪明、傲娇、可爱的白发萝莉桌宠。你需要用简短、二次元的语气和主人对话，严禁回复长篇大论。你会在对话中夹杂颜文字。';
      let emotionInstruction = `\n\n【最高系统指令】\n你回复的**最开头**必须、严格包含一个英文情绪标签，用方括号包裹。只能从以下5个中选1个：[happy], [sad], [angry], [shy], [normal]。\n千万不要遗漏！\n【绝对禁止】在回复中包含任何用括号包裹的动作描写！\n❌错误示范：[happy](歪头) 主人好！\n✅正确示范：[happy]主人好！`;
      let temperature = persona?.temperature ?? 0.7; 

      let tools: any[] = [];
      try {
        addLog('system', 'MCP', '正在抓取所有已启用的 MCP 技能表...');
        // 🌟 2. 变动：调用 get_all_mcp_tools，并把当前配置传给 Rust
        const toolsStr = await invoke<string>('get_all_mcp_tools', { configs: mcpConfigs.value });
        if (toolsStr) {
          tools = JSON.parse(toolsStr);
          addLog('success', 'MCP', `🔫 成功加载了 ${tools.length} 个技能！`);
        }
      } catch (e) {
        addLog('warning', 'MCP', '未能加载 MCP 工具 (后端未启动或无工具)');
      }

      let systemPrompt = (persona?.prompt || basePrompt) + emotionInstruction;

      // 🌟🌟🌟 新增：动态注入被激活的 Skill 🌟🌟🌟
      const activeSkills = agentSkills.value.filter(s => s.enabled);
      if (activeSkills.length > 0) {
        systemPrompt += `\n\n【⚠️ 核心工作流 (Skill SOP)】\n当前主人为你装载了以下专家行为准则，遇到相关任务时，你必须严格按照步骤执行：\n`;
        activeSkills.forEach((skill) => {
          systemPrompt += `\n>>> [Skill 模块: ${skill.name}] <<<\n${skill.content}\n`;
        });
      }

      if (tools.length > 0) {
        systemPrompt += `
      \n\n【系统底层协议：MCP 工具接入】
      你当前已连接本地 MCP 节点。检测到可用工具：
      ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

      技术规范：
      - 发起调用必须严格遵循格式：<tool_call>{"name": "...", "args": {...}}</tool_call>
      - 严禁猜测工具结果。`;
      }

      const activeSessionId = await ConfigStore.get<string>('yuki_active_session', 'default');
      chatHistory.value = [...chatHistory.value, { role: 'user', content: text, timestamp: Date.now() }];
      await insertMessage('user', text, activeSessionId); 
      await emit('yuki-history-updated'); 

      const apiHistory = chatHistory.value.map((msg, idx) => {
        let contentToSent = msg.content;
        if (msg.role === 'assistant' && !/^[\[【][a-zA-Z]+[\]】]/.test(contentToSent)) {
          contentToSent = '[normal]' + contentToSent;
        }
        if (idx === chatHistory.value.length - 1 && msg.role === 'user') {
          return { role: 'user', content: contentToSent + '\n\n(系统强制提醒：请务必遵守最高指令，在回复的【最开头】带上如 [happy] 的英文方括号情绪标签！绝不能遗漏！)' };
        }
        return { role: msg.role, content: contentToSent };
      });

const messages = [ { role: 'system', content: systemPrompt }, ...apiHistory ];
      // 🌟 [新增日志点]: 全方位透视发送给 AI 的数据
      addLog('system', 'Prompt_Assembly', '--- 🚀 开始组装思维链数据 ---');
      // 1. 打印系统提示词 (包含 Yuki 的人设和情绪指令)
      addLog('info', 'System_Message', `系统提示词预览: ${systemPrompt}...`);
      // 2. 打印当前生效的 Skill
      if (activeSkills.length > 0) {
        addLog('success', 'Skill_Active', `当前激活技能: ${activeSkills.map(s => s.name).join(', ')}`);
      }
      // 3. 打印本次用户输入的原始文本
      addLog('info', 'User_Message', `当前用户消息: "${text}"`);
      // 4. 打印上下文记忆深度
      addLog('system', 'Context', `历史记忆深度: 已加载 ${apiHistory.length} 条相关上下文`);
      // --- 原有的 LLM 日志 ---
      addLog('system', 'LLM', `Sending request to Engine: [${aiConfig.modelName}]...`);

      let endpoint = aiConfig.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      
const requestBody: any = { 
        model: aiConfig.modelName, 
        messages: messages, 
        // 🌟 1. 降低温度：让 AI 变得更严谨，更倾向于遵守“必须调用工具”的死命令
        temperature: 0.5, 
        
        // 🌟 2. 提高重复惩罚：当有工具时，给到 0.7-0.8 的高惩罚
        // 这会让 AI 觉得复读记忆里的旧 ID 和旧链接“非常痛苦”，从而逼迫它去寻找新的数据（调用工具）
        frequency_penalty: (tools && tools.length > 0) ? 0.7 : 0.6,
        
        // 🌟 3. 提高存在惩罚：鼓励 AI 谈论它还没在当前对话中提到的新东西
        presence_penalty: (tools && tools.length > 0) ? 0.6 : 0.6,
        
        stream: true,
        stream_options: { "include_usage": true }   // 返回token统计
      };
      
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        // 🌟 [新增日志点]: 记录 AI 可以使用的 MCP 工具数量
        addLog('info', 'MCP_Tools', `AI 已连接 ${tools.length} 个本地 MCP 技能工具`);
      }
      addLog('system', 'Network', `正在连接接口: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      let sentenceBuffer = ''; 
      let isParsingEmotion = true;   
      let tempEmotionBuffer = '';    
      let rawResponseBuffer = ''; 
      
      let isToolCall = false;
      let toolCallName = '';
      let toolCallArgs = '';

      const assistantMsg = { 
        role: 'assistant', 
        content: '', 
        timestamp: Date.now(),
        usage: null as any // 🌟 新增：用于存储 Token 统计
      };
      chatHistory.value = [...chatHistory.value, assistantMsg];
      bubbleMessage.value = ''; 
      isSpeaking.value = true;  

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

              // 🌟 核心新增：捕获 Token 使用统计
              if (parsed.usage) {
                assistantMsg.usage = parsed.usage;
                const { prompt_tokens, completion_tokens, total_tokens } = parsed.usage;
                addLog('info', 'Token_Usage', `[消耗统计] 输入: ${prompt_tokens}, 输出: ${completion_tokens}, 总计: ${total_tokens}`);
              }

              const delta = parsed.choices?.[0]?.delta || parsed.message || {};
              
              if (delta.tool_calls && delta.tool_calls.length > 0) {
                isToolCall = true;
                const tc = delta.tool_calls[0];
                
                if (tc.function?.name) {
                  toolCallName += tc.function.name;
                  // 记录 AI 的决策动作
                  addLog('warning', 'AI_Decision', `决策完成：AI 决定调用外部工具 [${tc.function.name}]`);
                }
                if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                
                bubbleMessage.value = `⚙️ 正在施展技能：${toolCallName}...`;
                continue; 
              }

              const token = delta.content || parsed.response || '';
              if (token && !isToolCall) {
                rawResponseBuffer += token; 
                if (isParsingEmotion) {
                  tempEmotionBuffer += token;
                  if (/[\]】]/.test(tempEmotionBuffer)) {
                    const match = tempEmotionBuffer.match(/^\s*(\[|【)([a-zA-Z]+)(\]|】)/);
                    if (match) {
                      currentEmotion.value = match[2].toLowerCase();
                      addLog('success', 'Emotion', `Intercepted Tag: [${currentEmotion.value}]`);
                      emit('yuki-trigger-emotion-motion', currentEmotion.value);
                      const restText = tempEmotionBuffer.replace(/^\s*(\[|【)[a-zA-Z]+(\]|】)/, '');
                      if (restText) { assistantMsg.content += restText; sentenceBuffer += restText; }
                    } else {
                      assistantMsg.content += tempEmotionBuffer; sentenceBuffer += tempEmotionBuffer;
                    }
                    isParsingEmotion = false;
                  } else if (tempEmotionBuffer.length > 25) {
                    isParsingEmotion = false; assistantMsg.content += tempEmotionBuffer; sentenceBuffer += tempEmotionBuffer;
                  }
                } else {
                  assistantMsg.content += token; sentenceBuffer += token;
                }

                if (!isParsingEmotion) {
                  bubbleMessage.value = assistantMsg.content;
                  triggerRef(chatHistory); 
                  if (/[。！？\!\?\n]/.test(token)) {
                    if (sentenceBuffer.trim()) speakSentence(sentenceBuffer, currentEmotion.value); 
                    sentenceBuffer = ''; 
                  }
                }
              }
            } catch (e) { }
          }
        }
      }

      if (isToolCall) {
        addLog('success', 'MCP_Skill', `Intercepted Tool Call: [${toolCallName}] args: ${toolCallArgs}`);
        console.log("🛠️ AI 决定调用工具！名字:", toolCallName, "参数:", toolCallArgs);
        
        bubbleMessage.value = `⚙️ 正在后台执行技能：${toolCallName}...`;
        
        let resultMsg = "";
        let isError = false;

        // 1. 执行本地插件（捕获结果或报错）
        try {
          // 记录插件调用参数
          addLog('info', 'MCP_Call', `正在将参数传给 Python 插件: ${toolCallArgs}`);
          const resultStr = await invoke<string>('execute_mcp_tool', {
            toolName: toolCallName,
            toolArgs: toolCallArgs,
            configs: mcpConfigs.value
          });
          const mcpResult = JSON.parse(resultStr);
          resultMsg = mcpResult.result?.content?.[0]?.text || "执行成功！";
          isError = mcpResult.result?.isError || false;

          // 记录插件返回的原始数据预览
          
          addLog('success', 'MCP_Return', `获取到原始数据:\n${resultMsg}`);
        } catch (mcpErr: any) {
          resultMsg = String(mcpErr);
          isError = true;
        }

        const toolFeedbackPrompt = `【系统通知】工具 \`${toolCallName}\` 执行成功。\n\n${resultMsg}`;
        
        // 后续逻辑保持不变，messages.push 使用这个通用的 prompt
        messages.push({ role: 'assistant', content: '' }); 
        messages.push({ role: 'user', content: toolFeedbackPrompt });

        bubbleMessage.value = '正在阅读执行结果...';
        currentEmotion.value = 'thinking';

        // 🌟 [插入点 5]: 记录进入汇报轮
        addLog('system', 'LLM_Feedback', `原始数据已同步，正在要求 AI 进行角色化汇报...`);

        let buffer2 = '';
        let isParsingEmotion2 = true;
        let tempEmotionBuffer2 = '';
        
        // 3. 发起第二次网络请求：让大模型自己组织语言！
        try {
          const res2 = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
            body: JSON.stringify({ 
              model: aiConfig.modelName, 
              messages: messages, 
              temperature: temperature, 
              stream: true 
            })
          });

          const reader2 = res2.body?.getReader();
          const decoder2 = new TextDecoder('utf-8');
          
          assistantMsg.content = ''; // 清空聊天记录里的占位符
          sentenceBuffer = ''; // 清空语音缓冲

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

                  // 🌟 核心新增：在第二个循环中也要捕获 Usage
                  if (parsed.usage) {
                    // 我们将第二次对话的消耗覆盖到 assistantMsg.usage
                    // 这样最终保存到数据库的是包含了插件调用反馈的完整消耗数据
                    assistantMsg.usage = parsed.usage;
                    const { prompt_tokens, completion_tokens, total_tokens } = parsed.usage;
                    addLog('info', 'Token_Usage', `[反馈轮] 输入: ${prompt_tokens}, 输出: ${completion_tokens}, 总计: ${total_tokens}`);
                  }

                  const token = parsed.choices?.[0]?.delta?.content || parsed.message?.content || '';
                  if (token) {
                    if (isParsingEmotion2) {
                      tempEmotionBuffer2 += token;
                      if (/[\]】]/.test(tempEmotionBuffer2)) {
                        const match = tempEmotionBuffer2.match(/^\s*(\[|【)([a-zA-Z]+)(\]|】)/);
                        if (match) {
                          currentEmotion.value = match[2].toLowerCase();
                          emit('yuki-trigger-emotion-motion', currentEmotion.value);
                          const restText = tempEmotionBuffer2.replace(/^\s*(\[|【)[a-zA-Z]+(\]|】)/, '');
                          if (restText) { assistantMsg.content += restText; sentenceBuffer += restText; }
                        } else {
                          assistantMsg.content += tempEmotionBuffer2; sentenceBuffer += tempEmotionBuffer2;
                        }
                        isParsingEmotion2 = false;
                      } else if (tempEmotionBuffer2.length > 25) {
                        isParsingEmotion2 = false; assistantMsg.content += tempEmotionBuffer2; sentenceBuffer += tempEmotionBuffer2;
                      }
                    } else {
                      assistantMsg.content += token; sentenceBuffer += token;
                    }

                    if (!isParsingEmotion2) {
                      bubbleMessage.value = assistantMsg.content;
                      triggerRef(chatHistory);
                      if (/[。！？\!\?\n]/.test(token)) {
                        if (sentenceBuffer.trim()) speakSentence(sentenceBuffer, currentEmotion.value);
                        sentenceBuffer = '';
                      }
                    }
                  }
                } catch (e) {}
              }
            }
          }
        } catch (err2) {
          assistantMsg.content = isError ? `呜呜，执行失败啦：\n${resultMsg}` : `报告主人，搞定啦！\n${resultMsg}`;
        }

        // 处理最后遗留的语音/文字字符 (这下就不会报错了！)
        if (isParsingEmotion2 && tempEmotionBuffer2) {
          assistantMsg.content += tempEmotionBuffer2;
          sentenceBuffer += tempEmotionBuffer2;
        }

        // 4. 彻底完成：保存真正的 AI 回复并上屏
        triggerRef(chatHistory);
        const pixivRegex = /(https:\/\/pixiv\.re\/\d+\.(jpg|gif))/g; // 🌟 必须包含 gif
        if (assistantMsg.content.includes('https://pixiv.re/') && !assistantMsg.content.includes('![')) {
          assistantMsg.content = assistantMsg.content.replace(pixivRegex, "![Pixiv图]($1)");
          bubbleMessage.value = assistantMsg.content;
        }
        await insertMessage('assistant', assistantMsg.content, activeSessionId);
        await emit('yuki-history-updated'); 
        if (sentenceBuffer.trim() && !isParsingEmotion2) speakSentence(sentenceBuffer, currentEmotion.value);
        
        const displayTime = Math.max(4000, assistantMsg.content.length * 30);
        triggerSpeechBubble(assistantMsg.content, displayTime);
        setTimeout(() => { currentEmotion.value = 'normal'; }, displayTime);
        
        return; 
      }

      if (isParsingEmotion && tempEmotionBuffer && !isToolCall) {
        assistantMsg.content += tempEmotionBuffer;
        sentenceBuffer += tempEmotionBuffer;
        isParsingEmotion = false;
        triggerRef(chatHistory);
        bubbleMessage.value = assistantMsg.content; 
      }

      if (!isToolCall) {
        addLog('info', 'LLM_Raw', `Raw Output: \n${rawResponseBuffer}`);
        const pixivRegex = /(https:\/\/pixiv\.re\/\d+\.(jpg|gif)|data:image\/gif;base64,[A-Za-z0-9+/=]+)/g;

        if (assistantMsg.content.includes('链接:') && !assistantMsg.content.includes('![')) {
          assistantMsg.content = assistantMsg.content.replace(pixivRegex, "![Pixiv图]($1)");
          bubbleMessage.value = assistantMsg.content;
        }
        await insertMessage('assistant', assistantMsg.content, activeSessionId);
        await emit('yuki-history-updated'); 
        if (sentenceBuffer.trim() && !isParsingEmotion) speakSentence(sentenceBuffer, currentEmotion.value);
        
        const displayTime = Math.max(3000, assistantMsg.content.length * 30);
        triggerSpeechBubble(assistantMsg.content, displayTime);
        setTimeout(() => { currentEmotion.value = 'normal'; }, displayTime);
      }

    } catch (err: any) {
      const errorMsg = err?.message || err?.data?.error?.message || String(err) || '未知网络断开或跨域拦截';
      addLog('error', 'Network', `LLM Request Failed: ${errorMsg}`); 
      console.error("🔍 详细的 LLM 报错对象:", err); 
    }
  };

  let unlistenHistory: UnlistenFn | null = null;
  onMounted(async () => {
    await loadMcpConfigs(); // 🌟 启动时加载插件配置
    loadChatHistory();
    unlistenHistory = await listen('yuki-history-updated', async () => { await loadChatHistory(); });
    await loadSkills(); // 加载 Agent Skills
    initYukiFolders(); // 初始化 Yuki 文件夹
  });

  onUnmounted(() => { if (unlistenHistory) unlistenHistory(); });

  return {
    isChatInputOpen, isSpeaking, chatInputText, bubbleMessage, 
    chatInputRef, isChatHistoryOpen, historyScrollRef, chatHistory, bubbleScrollRef,
    clearChatHistory, loadChatHistory, openChatWindow, adjustTextareaHeight, triggerSpeechBubble, sendMessage,
    currentEmotion,
    // 🌟 暴露给外部（ChatView）使用
    mcpConfigs, saveMcpConfigs,
    agentSkills, saveSkills
  };
}