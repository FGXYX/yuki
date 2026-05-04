<script setup lang="ts">
import { watch, nextTick, ref } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{
  messages: { role: string; content: string; timestamp?: number | string }[]
  isThinking: boolean
  copiedId: string | null
}>()

const emit = defineEmits<{
  copy: [text: string, id: string]
  previewImage: [url: string]
}>()

const scrollRef = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
}

watch(() => props.messages.length, () => scrollToBottom(), { deep: true })
watch(() => props.isThinking, (v) => { if (v) scrollToBottom() })
</script>

<template>
  <div class="chat-scroll-area" ref="scrollRef">
    <!-- 空状态 -->
    <div v-if="messages.length === 0" class="empty-state">
      <p class="empty-name">Yuki</p>
      <p class="empty-tip">这是崭新的对话篇章，快来聊聊吧！</p>
    </div>

    <!-- 消息列表 -->
    <template v-for="(msg, msgIndex) in messages" :key="msgIndex">
      <MessageBubble
        :message="msg"
        :copied-id="copiedId"
        :msg-index="msgIndex"
        @copy="(text: string, id: string) => emit('copy', text, id)"
        @preview-image="(url: string) => emit('previewImage', url)"
      />
    </template>

    <!-- 思考中 -->
    <div v-if="isThinking" class="message-row assistant">
      <div class="bubble-container">
        <div class="message-bubble thinking-bubble">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-scroll-area {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  display: flex; flex-direction: column; gap: var(--msg-gap, 4px);
}
.chat-scroll-area::-webkit-scrollbar { width: 6px; }
.chat-scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

.empty-state { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; }
.empty-name { font-size: 28px; font-weight: bold; color: rgba(255,255,255,0.08); margin: 0; }
.empty-tip { font-size: 14px; color: rgba(255,255,255,0.25); margin: 0; }

.message-row { display: flex; flex-direction: column; }
.message-row.assistant { align-items: flex-start; }
.message-row.user { align-items: flex-end; }
.bubble-container { max-width: 80%; }

.thinking-bubble {
  background: var(--ai-bg, #242528); border-radius: var(--bubble-radius, 16px);
  padding: 16px 24px; display: flex; gap: 6px; align-items: center;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: #888; animation: dot-pulse 1.4s ease-in-out infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-pulse {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1.1); }
}
</style>
