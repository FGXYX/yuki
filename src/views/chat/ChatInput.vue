<script setup lang="ts">
defineProps<{
  modelValue: string
  isThinking: boolean
  isPlayingTts: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  stopTts: []
  attachMedia: []
}>()

const UI_SEND = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M210.3,35.9L23.9,88.4a8,8,0,0,0-1.2,15l85.6,40.5a7.8,7.8,0,0,0,4.2,1.1l77.5-77.5a8,8,0,1,1,11.4,11.4l-77.5,77.5a7.8,7.8,0,0,0,1.1,4.2l40.5,85.6a8,8,0,0,0,15-1.2L232.1,57.1A8,8,0,0,0,210.3,35.9Z"></path></svg>'
const UI_ATTACH = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M209.7,92.3l-84.9,84.9a48,48,0,0,1-67.9-67.9l84.9-84.9a32,32,0,0,1,45.2,45.3L102.1,154.6a16,16,0,0,1-22.6-22.6L160,51.4"></path></svg>'

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emit('send')
  }
}
</script>

<template>
  <footer class="chat-input-area">
    <div class="input-wrapper">
      <textarea
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :placeholder="'发消息给 Yuki...'"
        @keydown="onKeydown"
      ></textarea>

      <div class="input-actions">
        <button class="send-btn attach-btn" @click="emit('attachMedia')" title="发送图片或视频">
          <span class="icon-wrap" v-html="UI_ATTACH"></span>
        </button>

        <button v-if="isPlayingTts" class="send-btn stop-tts-btn" @click="emit('stopTts')" title="打断说话">
          🛑
        </button>
        <button v-else class="send-btn" :class="{ 'is-active': modelValue.trim() && !isThinking }"
          @click="emit('send')" :disabled="!modelValue.trim() || isThinking">
          <span class="icon-wrap" v-html="UI_SEND"></span>
        </button>
      </div>
    </div>
    <p class="input-hint">Enter 发送 · Shift+Enter 换行</p>
  </footer>
</template>

<style scoped>
.chat-input-area {
  padding: 12px 20px 16px;
}
.input-wrapper {
  display: flex; align-items: flex-end; gap: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: var(--input-radius, 20px);
  padding: 8px 8px 8px 16px;
  backdrop-filter: var(--input-blur, none);
  opacity: var(--input-opacity, 1);
}
textarea {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text-color, #ececec); font-size: 14px;
  font-family: var(--font-family); line-height: 1.5; resize: none;
  min-height: 24px; max-height: 120px;
}
textarea::placeholder { color: var(--text-color); opacity: 0.3; }
.input-actions { display: flex; gap: 6px; align-items: center; }
.send-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-color); opacity: 0.7; cursor: pointer;
  display: flex; justify-content: center; align-items: center;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0;
}
.send-btn .icon-wrap { width: 18px; height: 18px; display: flex; }
.send-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); opacity: 1; }
.send-btn.is-active { background: var(--user-bg, #4facfe); border-color: transparent; color: #fff; opacity: 1; }
.send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.send-btn.attach-btn { width: 32px; height: 32px; font-size: 13px; }
.send-btn.attach-btn:hover { background: rgba(255,255,255,0.12); }
.stop-tts-btn { background: rgba(239,68,68,0.25) !important; border-color: rgba(239,68,68,0.5) !important; }
.input-hint { text-align: center; font-size: 11px; color: var(--text-color); opacity: 0.2; margin: 6px 0 0; }
</style>
