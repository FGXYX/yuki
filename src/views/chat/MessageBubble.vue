<script setup lang="ts">
import { computed } from 'vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const props = defineProps<{
  message: { role: string; content: string; timestamp?: number | string }
  copiedId: string | null
  msgIndex: number
}>()

const emit = defineEmits<{
  copy: [text: string, id: string]
  previewImage: [url: string]
}>()

const UI_COPY = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M216,168h-8V48a8,8,0,0,0-8-8H88V32a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8V160A8,8,0,0,1,216,168Z"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M168,224H40a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8H168a8,8,0,0,1,8,8V216A8,8,0,0,1,168,224Z"></path></svg>'
const UI_CHECK = '<svg viewBox="0 0 256 256"><polyline points="216 72.005 104 184 48 128.005" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline></svg>'

// 消息解析器：同时支持文本、代码块、图片和视频
const parsedParts = computed(() => {
  const text = props.message.content
  if (!text) return []
  const parts: { type: string; content?: string; language?: string; raw?: string; url?: string }[] = []
  const regex = /(```([a-zA-Z0-9+#\-_]*)\s*\n([\s\S]*?)```)|(!\[.*?\]\((.*?)\))|(\[video\]\((.*?)\))/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    if (match[1]) {
      const lang = match[2].trim()
      const rawCode = match[3].trim()
      let highlightedCode = rawCode
      try {
        if (lang && hljs.getLanguage(lang)) highlightedCode = hljs.highlight(rawCode, { language: lang }).value
        else highlightedCode = hljs.highlightAuto(rawCode).value
      } catch (e) {}
      parts.push({ type: 'code', language: lang || 'plaintext', content: highlightedCode, raw: rawCode })
    } else if (match[4]) {
      parts.push({ type: 'image', url: match[5] })
    } else if (match[6]) {
      parts.push({ type: 'video', url: match[7] })
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }
  return parts
})

const formatTime = (timeVal?: number | string) => {
  if (!timeVal) return '刚才'
  let d = new Date(timeVal)
  if (isNaN(d.getTime()) && typeof timeVal === 'string') {
    d = new Date(timeVal.replace(/-/g, '/'))
  }
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffTime = today.getTime() - targetDay.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return timeStr
  if (diffDays === 1) return `昨天 ${timeStr}`
  if (d.getFullYear() === now.getFullYear()) {
    const m = (d.getMonth() + 1).toString().padStart(2, '0')
    const day = d.getDate().toString().padStart(2, '0')
    return `${m}-${day} ${timeStr}`
  }
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${timeStr}`
}

const copyText = (text: string, id: string) => emit('copy', text, id)
</script>

<template>
  <div :class="['message-row', message.role]">
    <div class="bubble-container">
      <div class="message-bubble">
        <template v-for="(part, partIndex) in parsedParts" :key="partIndex">
          <span v-if="part.type === 'text'" class="text-part">{{ part.content }}</span>

          <div v-else-if="part.type === 'code'" class="code-block-wrapper">
            <div class="code-header">
              <span class="code-lang">{{ part.language }}</span>
              <button class="code-copy-btn" @click="copyText(part.raw || '', `${msgIndex}_${partIndex}`)">
                <span class="icon-wrap" v-html="copiedId === `${msgIndex}_${partIndex}` ? UI_CHECK : UI_COPY"></span>
                {{ copiedId === `${msgIndex}_${partIndex}` ? '已复制' : '复制代码' }}
              </button>
            </div>
            <div class="code-content">
              <pre><code class="hljs" v-html="part.content" style="background: transparent; padding: 0;"></code></pre>
            </div>
          </div>

          <div v-else-if="part.type === 'image'" class="media-wrapper">
            <img :src="part.url" alt="图片" class="chat-media-img" draggable="false" @click="emit('previewImage', part.url!)" />
          </div>

          <div v-else-if="part.type === 'video'" class="media-wrapper">
            <video :src="part.url" controls class="chat-media-video"></video>
          </div>
        </template>
      </div>

      <div class="bubble-meta">
        <span class="msg-time">{{ formatTime(message.timestamp) }}</span>
        <button v-if="message.role === 'assistant'" class="copy-btn" @click="copyText(message.content, `full_${msgIndex}`)"
          :class="{ 'is-copied': copiedId === `full_${msgIndex}` }">
          <span class="icon-wrap" v-html="copiedId === `full_${msgIndex}` ? UI_CHECK : UI_COPY"></span>
          {{ copiedId === `full_${msgIndex}` ? '已复制' : '复制' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-row { display: flex; flex-direction: column; }
.message-row.assistant { align-items: flex-start; }
.message-row.user { align-items: flex-end; }

.bubble-container { max-width: 80%; }
.message-bubble {
  padding: 12px 16px; border-radius: var(--bubble-radius, 16px);
  line-height: var(--line-height, 1.5); font-size: var(--font-size, 15px);
  word-break: break-word; overflow-wrap: break-word;
}
.assistant .message-bubble {
  background: var(--ai-bg, #242528); color: var(--ai-text-color, #ececec);
  border-bottom-left-radius: 4px;
}
.user .message-bubble {
  background: var(--user-bg, #4facfe); color: var(--user-text-color, #ffffff);
  border-bottom-right-radius: 4px;
}

.text-part { white-space: pre-wrap; }

.code-block-wrapper { margin: 8px 0; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
.code-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px; background: rgba(0,0,0,0.3);
  font-size: 12px;
}
.code-lang { color: #888; text-transform: uppercase; }
.code-copy-btn {
  background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #aaa;
  font-size: 11px; padding: 2px 8px; border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; gap: 4px; transition: 0.2s;
}
.code-copy-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.code-copy-btn .icon-wrap { width: 14px; height: 14px; display: flex; }
.code-content { max-height: 400px; overflow: auto; }
.code-content pre { margin: 0; padding: 12px; background: #1a1a2e; }

.media-wrapper { margin: 4px 0; }
.chat-media-img { max-width: 100%; max-height: 300px; border-radius: 8px; cursor: pointer; display: block; }
.chat-media-video { max-width: 100%; max-height: 300px; border-radius: 8px; display: block; }

.bubble-meta {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 4px 8px; font-size: 11px; opacity: 0.5;
  transition: opacity 0.2s;
}
.message-row:hover .bubble-meta { opacity: 1; }
.msg-time { color: #888; }
.copy-btn {
  background: transparent; border: none; color: #888; cursor: pointer;
  display: flex; align-items: center; gap: 3px; padding: 0; font-size: 11px; transition: 0.15s;
}
.copy-btn:hover { color: #fff; }
.copy-btn .icon-wrap { width: 12px; height: 12px; display: flex; }
.copy-btn.is-copied { color: #4facfe; }
</style>
