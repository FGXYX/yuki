<script setup lang="ts">
defineProps<{
  sessions: { id: string; title: string; updatedAt: number }[]
  activeSessionId: string
  isOpen: boolean
  agentSkills: any[]
  mcpConfigs: any[]
}>()

const emit = defineEmits<{
  createSession: []
  switchSession: [id: string]
  deleteSession: [id: string]
  openSkill: []
  openMcp: []
}>()

const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>'
const UI_MESSAGE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M216,48H40A16,16,0,0,0,24,64V224a8.1,8.1,0,0,0,13.4,6l43-34H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Z"></path></svg>'

const formatSessionDate = (timestamp: number) => {
  const d = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': isOpen }">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="emit('createSession')">
        <span class="icon-wrap" v-html="UI_PLUS"></span>
        <span>新建对话</span>
      </button>
    </div>

    <div class="session-list">
      <div v-for="session in sessions" :key="session.id"
           class="session-item" :class="{ active: activeSessionId === session.id }"
           @click="emit('switchSession', session.id)">
        <div class="s-icon-wrap">
          <span class="icon-wrap" v-html="UI_MESSAGE"></span>
        </div>
        <div class="s-body">
          <span class="s-title" :title="session.title">{{ session.title }}</span>
          <span class="s-time">{{ formatSessionDate(session.updatedAt) }}</span>
        </div>
        <button class="s-del-btn" @click.stop="emit('deleteSession', session.id)" title="删除">×</button>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="footer-item-btn" @click="emit('openSkill')">
        <span class="mcp-icon">💡</span>
        <span>Skill</span>
        <span class="mcp-badge" v-if="agentSkills && agentSkills.filter((s: any) => s.enabled).length > 0">
          {{ agentSkills.filter((s: any) => s.enabled).length }}
        </span>
      </button>

      <button class="footer-item-btn" style="margin-top: 8px;" @click="emit('openMcp')">
        <span class="mcp-icon">🧩</span>
        <span>MCP管理</span>
        <span class="mcp-badge" v-if="mcpConfigs && mcpConfigs.filter((c: any) => c.enabled).length > 0">
          {{ mcpConfigs.filter((c: any) => c.enabled).length }}
        </span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width, 220px); min-width: var(--sidebar-width, 220px);
  background: var(--chat-bg, #141517); opacity: var(--sidebar-opacity, 1);
  backdrop-filter: var(--sidebar-blur, none);
  display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.06);
  color: var(--sidebar-text-color, #ececec);
  transition: margin-left 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s;
  overflow: hidden;
}
.sidebar:not(.is-open) { margin-left: calc(var(--sidebar-width, 220px) * -1); opacity: 0; }

.sidebar-header { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.new-chat-btn {
  width: 100%; display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: var(--sidebar-text-color, #ececec); padding: 10px 14px; border-radius: 10px;
  font-size: 13px; cursor: pointer; transition: 0.2s;
}
.new-chat-btn:hover { background: rgba(255,255,255,0.1); }
.new-chat-btn .icon-wrap { width: 16px; height: 16px; display: flex; }

.session-list { flex: 1; overflow-y: auto; padding: 8px; }
.session-list::-webkit-scrollbar { width: 4px; }
.session-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.session-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 10px; cursor: pointer; transition: 0.2s; margin-bottom: 2px;
  position: relative;
}
.session-item:hover { background: rgba(255,255,255,0.05); }
.session-item.active { background: rgba(79,172,254,0.12); }
.s-icon-wrap { flex-shrink: 0; }
.s-icon-wrap .icon-wrap { width: 18px; height: 18px; display: flex; color: var(--sidebar-text-color); opacity: 0.3; }
.s-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.s-title { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--sidebar-text-color); }
.s-time { font-size: 11px; color: var(--sidebar-text-color); opacity: 0.3; }
.s-del-btn {
  background: transparent; border: none; color: var(--sidebar-text-color); opacity: 0.2; font-size: 16px;
  cursor: pointer; padding: 0 4px; opacity: 0; transition: 0.2s;
  position: absolute; right: 8px;
}
.session-item:hover .s-del-btn { opacity: 1; }
.s-del-btn:hover { color: #ef4444; }

.sidebar-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
.footer-item-btn {
  width: 100%; display: flex; align-items: center; gap: 8px;
  background: transparent; border: none; color: var(--sidebar-text-color, #ececec);
  padding: 10px 12px; border-radius: 10px; font-size: 13px; cursor: pointer; transition: 0.2s;
}
.footer-item-btn:hover { background: rgba(255,255,255,0.05); }
.mcp-icon { font-size: 16px; }
.mcp-badge {
  margin-left: auto; background: rgba(79,172,254,0.2); color: #4facfe;
  font-size: 11px; padding: 0 6px; border-radius: 8px; line-height: 18px;
}
</style>
