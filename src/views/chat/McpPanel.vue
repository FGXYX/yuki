<script setup lang="ts">
const props = defineProps<{
  configs: any[]
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:configs': [configs: any[]]
}>()

const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>'

const addNew = () => {
  const list = [...props.configs]
  list.push({ name: '新插件 (如 Filesystem)', command: 'node', args: [], enabled: false, isExpanded: true })
  emit('update:configs', list)
}

const removeMcp = (index: number) => {
  if (!confirm('确定要删除这个插件吗？')) return
  const list = props.configs.filter((_: any, i: number) => i !== index)
  emit('update:configs', list)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="theme-overlay" @click.self="emit('close')">
      <div class="theme-panel mcp-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon">🧩</span>
            <h3>本地 MCP 技能节点</h3>
          </div>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>

        <div class="panel-body">
          <div class="setting-group mcp-card" v-for="(config, index) in configs" :key="index"
               :class="{ 'is-disabled': !config.enabled }">
            <div class="mcp-card-header">
              <input type="text" :value="config.name" @input="(e) => { const list=[...configs]; list[index]={...list[index], name:(e.target as HTMLInputElement).value}; emit('update:configs', list) }"
                     class="theme-input mcp-name-input" placeholder="插件名称">
              <button @click="configs[index].isExpanded = !configs[index].isExpanded" class="expand-btn">
                <span :style="{ transform: configs[index].isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">▼</span>
              </button>
              <div class="setting-item-toggle">
                <button class="toggle-btn" :class="{ on: config.enabled }"
                  @click="configs[index].enabled = !configs[index].enabled; emit('update:configs', [...configs])">
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
            <div v-show="config.isExpanded" class="mcp-expanded">
              <div class="setting-item">
                <label>执行器 (如 node, python, npx.cmd)</label>
                <input type="text" :value="config.command"
                  @input="(e) => { const list=[...configs]; list[index]={...list[index], command:(e.target as HTMLInputElement).value}; emit('update:configs', list) }"
                  class="theme-input">
              </div>
              <div class="setting-item">
                <label>运行参数 (用英文逗号分隔)</label>
                <input type="text" :value="config.args.join(', ')"
                  @change="(e) => { const list=[...configs]; list[index]={...list[index], args:(e.target as HTMLInputElement).value.split(',').map((s: string) => s.trim()).filter(Boolean)}; emit('update:configs', list) }"
                  class="theme-input" placeholder="例如: D:/scripts/plugin.js">
              </div>
              <button class="mcp-delete-btn" @click="removeMcp(index)">删除插件</button>
            </div>
          </div>

          <button class="new-chat-btn add-mcp-btn" @click="addNew">
            <span class="icon-wrap" v-html="UI_PLUS"></span>
            <span>添加本地 MCP 插件</span>
          </button>
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
.setting-group { margin-bottom: 12px; }
.setting-item { margin-bottom: 10px; }
.setting-item label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; }
.setting-item-toggle { display: flex; align-items: center; }

.mcp-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; }
.mcp-card.is-disabled { opacity: 0.5; }
.mcp-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 0; }
.mcp-name-input { flex: 1; }
.expand-btn { background: transparent; border: none; color: #888; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; }
.mcp-expanded { margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; }
.mcp-delete-btn {
  width: 100%; background: transparent; border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 12px; margin-top: 8px;
  transition: 0.2s;
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
.new-chat-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: var(--panel-text-color, #ececec); padding: 10px 14px; border-radius: 10px;
  font-size: 13px; cursor: pointer; transition: 0.2s;
}
.new-chat-btn:hover { background: rgba(255,255,255,0.1); }
.new-chat-btn .icon-wrap { width: 16px; height: 16px; display: flex; }
</style>
