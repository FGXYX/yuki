<script setup lang="ts">
const props = defineProps<{
  skills: any[]
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:skills': [skills: any[]]
  importSkill: []
}>()

const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>'

const addNew = () => {
  emit('update:skills', [...props.skills, { name: '新 Skill', content: '', enabled: false, isExpanded: true }])
}

const removeSkill = (index: number) => {
  const list = props.skills.filter((_, i) => i !== index)
  emit('update:skills', list)
}

const updateSkill = (index: number, key: string, value: any) => {
  const list = [...props.skills]
  list[index] = { ...list[index], [key]: value }
  emit('update:skills', list)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="theme-overlay" @click.self="emit('close')">
      <div class="theme-panel mcp-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon">💡</span>
            <h3>Agent Skill SOP</h3>
          </div>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>

        <div class="panel-body">
          <p class="panel-hint">
            在这里编写 Yuki 的"行为说明书"。开启后，对应规则将作为最高优先级指令注入她的潜意识。
          </p>

          <div class="setting-group mcp-card" v-for="(skill, index) in skills" :key="index"
               :class="{ 'is-disabled': !skill.enabled }">
            <div class="mcp-card-header">
              <input type="text" :value="skill.name"
                @input="updateSkill(index, 'name', ($event.target as HTMLInputElement).value)"
                class="theme-input mcp-name-input" placeholder="Skill 名称">
              <button @click="updateSkill(index, 'isExpanded', !skill.isExpanded)" class="expand-btn">
                <span :style="{ transform: skill.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">▼</span>
              </button>
              <div class="setting-item-toggle">
                <button class="toggle-btn" :class="{ on: skill.enabled }"
                  @click="updateSkill(index, 'enabled', !skill.enabled)">
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
            <div v-show="skill.isExpanded" class="mcp-expanded">
              <div class="setting-item">
                <label>SOP 规则 / 提示词</label>
                <textarea class="theme-input rule-textarea"
                  :value="skill.content"
                  @input="updateSkill(index, 'content', ($event.target as HTMLTextAreaElement).value)"
                  placeholder="例如：当你被要求查阅文件时，必须输出三段式的 Markdown 报告..."></textarea>
              </div>
              <button class="mcp-delete-btn" @click="removeSkill(index)">删除 Skill</button>
            </div>
          </div>

          <div class="action-row">
            <button class="new-chat-btn add-mcp-btn" @click="addNew">
              <span class="icon-wrap" v-html="UI_PLUS"></span>
              <span>手动建空插槽</span>
            </button>
            <button class="new-chat-btn add-mcp-btn" @click="emit('importSkill')">
              <span>📁 导入 .md 文件</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.theme-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 9999;
  display: flex; justify-content: center; align-items: center;
}
.theme-panel {
  width: 460px; max-height: 85vh; background: var(--chat-bg, #141517);
  border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.panel-title-group { display: flex; align-items: center; gap: 8px; }
.panel-icon { font-size: 20px; }
.panel-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--panel-text-color, #ececec); }
.panel-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.panel-body::-webkit-scrollbar { width: 5px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.close-btn { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
.close-btn:hover { color: #ef4444; }
.panel-hint { color: #888; font-size: 11px; margin-bottom: 10px; line-height: 1.4; }
.setting-group { margin-bottom: 12px; }
.setting-item { margin-bottom: 10px; }
.setting-item label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; }
.setting-item-toggle { display: flex; align-items: center; }

.mcp-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; }
.mcp-card.is-disabled { opacity: 0.5; }
.mcp-card-header { display: flex; align-items: center; gap: 8px; }
.mcp-name-input { flex: 1; }
.expand-btn { background: transparent; border: none; color: #888; cursor: pointer; padding: 4px; border-radius: 4px; }
.mcp-expanded { margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; }
.rule-textarea { min-height: 120px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.5; resize: vertical; }
.mcp-delete-btn {
  width: 100%; background: transparent; border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 12px; margin-top: 8px;
}
.mcp-delete-btn:hover { background: rgba(239,68,68,0.1); }
.theme-input {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: var(--panel-text-color, #ececec); padding: 7px 10px; border-radius: 8px; font-size: 12px; outline: none; box-sizing: border-box;
}
.toggle-btn {
  width: 36px; height: 20px; border-radius: 12px; border: none;
  background: rgba(255,255,255,0.15); cursor: pointer; position: relative; padding: 0;
}
.toggle-btn.on { background: #4facfe; }
.toggle-knob {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: 0.2s;
}
.toggle-btn.on .toggle-knob { left: 18px; }
.action-row { display: flex; gap: 10px; margin-top: 10px; }
.new-chat-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: var(--panel-text-color, #ececec); padding: 10px 14px; border-radius: 10px;
  font-size: 13px; cursor: pointer; transition: 0.2s;
}
.new-chat-btn:hover { background: rgba(255,255,255,0.1); }
.new-chat-btn .icon-wrap { width: 16px; height: 16px; display: flex; }
</style>
