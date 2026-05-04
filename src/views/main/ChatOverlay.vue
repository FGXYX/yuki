<script setup lang="ts">
defineProps<{
  isChatInputOpen: boolean
  chatInputText: string
  isChatHistoryOpen: boolean
  chatHistory: { role: string; content: string; timestamp?: number | string }[]
  isPlayingTts: boolean
}>()

const emit = defineEmits<{
  'update:chatInputText': [value: string]
  sendMessage: []
  stopTTS: []
  toggleHistory: []
  openChatWindow: []
  clearHistory: []
}>()

const UI_HISTORY = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"></path></svg>'
const UI_PAPER_PLANE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M210.3,35.9L23.9,88.4a8,8,0,0,0-1.2,15l85.6,40.5a7.8,7.8,0,0,0,4.2,1.1l77.5-77.5a8,8,0,1,1,11.4,11.4l-77.5,77.5a7.8,7.8,0,0,0,1.1,4.2l40.5,85.6a8,8,0,0,0,15-1.2L232.1,57.1A8,8,0,0,0,210.3,35.9Z"></path></svg>'
const UI_EXPAND = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm112-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,200,160ZM56,88V56H88a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0Z"></path></svg>'
const UI_TRASH = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>'
</script>

<template>
  <!-- 历史面板 -->
  <Transition name="fade-slide">
    <div v-show="isChatHistoryOpen && isChatInputOpen" class="chat-history-panel">
      <div class="history-header">
        <span> 历史记忆</span>
        <div class="header-actions">
          <button class="icon-btn-small expand" @click="emit('openChatWindow')" title="在独立窗口中打开">
            <span class="icon-wrap" v-html="UI_EXPAND"></span>
          </button>
          <button class="icon-btn-small delete" @click="emit('clearHistory')" title="清空记忆">
            <span class="icon-wrap" v-html="UI_TRASH"></span>
          </button>
        </div>
      </div>
      <div class="history-content">
        <div v-for="(msg, index) in chatHistory" :key="index" :class="['msg-bubble', msg.role]">
          {{ msg.content }}
        </div>
        <div v-if="chatHistory.length === 0" class="empty-history">脑袋空空的，暂无记录~</div>
      </div>
    </div>
  </Transition>

  <!-- 输入区域 -->
  <Transition name="slide-up-bottom">
    <div v-show="isChatInputOpen" class="bottom-input-container">
      <button class="history-toggle-btn" @click="emit('toggleHistory')"
        :class="{ 'is-active': isChatHistoryOpen }" title="查看历史对话">
        <span class="icon-wrap" v-html="UI_HISTORY"></span>
      </button>

      <textarea
        :value="chatInputText"
        @input="emit('update:chatInputText', ($event.target as HTMLTextAreaElement).value)"
        placeholder="和 Yuki 聊点什么... (Enter 发送)"
        @keydown.enter.exact.prevent="emit('sendMessage')"
      ></textarea>

      <button v-if="isPlayingTts" class="send-action-btn stop-tts-btn" @click="emit('stopTTS')" title="打断说话">
        <span style="font-size: 16px; line-height: 1;">🛑</span>
      </button>
      <button v-else class="send-action-btn" @click="emit('sendMessage')" :disabled="!chatInputText.trim()">
        <span class="icon-wrap" v-html="UI_PAPER_PLANE"></span>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.icon-wrap { display: flex; justify-content: center; align-items: center; width: 22px; height: 22px; }
.icon-wrap svg { width: 100%; height: 100%; display: block; }

/* 历史面板 */
.chat-history-panel {
  position: absolute; bottom: calc(10% + 60px); left: 50%;
  transform: translateX(-50%);
  width: 340px; height: 360px;
  background: rgba(30,30,30,0.5);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.3);
  display: flex; flex-direction: column; z-index: 99; pointer-events: auto;
}
.history-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 500; color: #fff;
}
.header-actions { display: flex; gap: 12px; align-items: center; }
.icon-btn-small {
  background: transparent; border: none; cursor: pointer;
  transition: 0.2s; display: flex;
}
.icon-btn-small .icon-wrap { width: 16px; height: 16px; }
.icon-btn-small:hover { transform: scale(1.15); }
.icon-btn-small.expand { color: rgba(255,255,255,0.7); }
.icon-btn-small.expand:hover { color: #fff; }
.icon-btn-small.delete { color: #ef4444; opacity: 0.8; }
.icon-btn-small.delete:hover { opacity: 1; }

.history-content {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.history-content::-webkit-scrollbar { width: 4px; }
.history-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

.msg-bubble {
  max-width: 85%; padding: 10px 14px; border-radius: 14px;
  font-size: 13px; line-height: 1.5; color: #fff; word-break: break-all;
}
.msg-bubble.user {
  align-self: flex-end; background: #4facfe; border-bottom-right-radius: 4px;
}
.msg-bubble.assistant {
  align-self: flex-start; background: rgba(255,255,255,0.15);
  border-bottom-left-radius: 4px; border: 1px solid rgba(255,255,255,0.1);
}
.empty-history { text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; margin-top: 20px; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translate(-50%,20px) scale(0.95); }

/* 输入区域 */
.bottom-input-container {
  position: absolute; bottom: 10%; left: 50%;
  transform: translateX(-50%);
  width: 320px; min-height: 48px; height: auto;
  background: rgba(30,30,30,0.65);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  display: flex; align-items: flex-end;
  padding: 6px 6px 6px 16px; z-index: 100; pointer-events: auto;
}
.bottom-input-container textarea {
  flex: 1; background: transparent; border: none; outline: none;
  color: #fff; font-size: 14px; font-family: inherit; line-height: 1.5;
  min-height: 24px; height: 24px; max-height: 120px;
  resize: none; overflow-y: auto; margin-right: 8px; padding: 6px 0;
}
.bottom-input-container textarea::placeholder { color: rgba(255,255,255,0.4); }
.bottom-input-container textarea::-webkit-scrollbar { width: 4px; }
.bottom-input-container textarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

.history-toggle-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; border: none;
  color: rgba(255,255,255,0.6); cursor: pointer;
  display: flex; justify-content: center; align-items: center;
  margin-right: 8px; transition: 0.2s; flex-shrink: 0;
}
.history-toggle-btn:hover, .history-toggle-btn.is-active {
  color: #4facfe; background: rgba(255,255,255,0.1);
}
.history-toggle-btn .icon-wrap { width: 20px; height: 20px; }

.send-action-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2); color: white;
  display: flex; justify-content: center; align-items: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0;
}
.send-action-btn .icon-wrap { width: 18px; height: 18px; margin-right: 2px; }
.send-action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); transform: scale(1.1); }
.send-action-btn:active:not(:disabled) { transform: scale(0.9); }
.send-action-btn:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(1); }
.stop-tts-btn { background: rgba(239,68,68,0.2) !important; border-color: rgba(239,68,68,0.5) !important; box-shadow: 0 0 10px rgba(239,68,68,0.4); }
.stop-tts-btn:hover { background: #ef4444 !important; transform: scale(1.1); }

.slide-up-bottom-enter-active { transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
.slide-up-bottom-leave-active { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
.slide-up-bottom-enter-from, .slide-up-bottom-leave-to { opacity: 0; transform: translate(-50%,50px) scale(0.9); }
</style>
