<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{
  visible: boolean
  motions: Record<string, string[]>
  isEditing: boolean
  editingAliases: Record<string, string>
  getManager: () => any
}>()

const emit = defineEmits<{
  close: []
  toggleEdit: []
  save: []
  play: [group: string, index: number]
  'update:editingAliases': [value: Record<string, string>]
}>()

const localAliases = ref<Record<string, string>>({})
watch(() => props.editingAliases, (val) => { localAliases.value = { ...val } }, { immediate: true })
</script>

<template>
  <Transition name="scale-fade">
    <div v-if="visible" class="window-modal action-list-modal">
      <div class="window-header">
        <span> 动作指令集</span>
        <div class="header-actions-edit">
          <button v-if="!isEditing" class="icon-action-header" @click="emit('toggleEdit')" title="编辑">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button v-if="!isEditing" class="icon-action-header close" @click="emit('close')" title="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <button v-if="isEditing" class="icon-action-header save" @click="emit('save')" title="保存">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          </button>
          <button v-if="isEditing" class="icon-action-header close" @click="emit('toggleEdit')" title="取消">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div class="action-groups-container">
        <div v-for="(motionList, groupName) in motions" :key="groupName" class="action-group">
          <h4 class="group-title">{{ groupName }}</h4>
          <div class="action-grid">
            <div v-for="(name, index) in motionList" :key="index" class="action-item-wrapper">
              <button v-if="!isEditing" class="action-item-btn" @click="emit('play', groupName, index)" :title="name">
                {{ localAliases[name] || name }}
              </button>
              <input v-if="isEditing" type="text" :value="localAliases[name] || name"
                @input="localAliases[name] = ($event.target as HTMLInputElement).value; emit('update:editingAliases', { ...localAliases })"
                :placeholder="name" class="action-item-input"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.window-modal {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(30,30,30,0.65);
  backdrop-filter: blur(25px) saturate(150%);
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4); color: white;
  z-index: 2000; display: flex; flex-direction: column;
  padding: 20px; box-sizing: border-box;
}
.action-list-modal { width: 340px; }
.window-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 15px; font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px; margin-bottom: 16px;
}
.header-actions-edit { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.icon-action-header {
  background: transparent; border: none; color: #aaa; cursor: pointer;
  padding: 4px; border-radius: 6px; display: flex;
  justify-content: center; align-items: center;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
.icon-action-header svg { width: 18px; height: 18px; }
.icon-action-header:hover { color: #fff; background: rgba(255,255,255,0.1); transform: scale(1.1); }
.icon-action-header.save:hover { color: #10b981; }
.icon-action-header.close:hover { color: #ef4444; }

.action-groups-container {
  overflow-y: auto; max-height: 170px;
  padding-right: 6px; display: flex; flex-direction: column; gap: 12px;
}
.action-groups-container::-webkit-scrollbar { width: 4px; }
.action-groups-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

.action-group {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03);
  border-radius: 8px; padding: 10px;
}
.group-title {
  margin: 0 0 10px 0; font-size: 13px; color: #4facfe;
  font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 6px;
}
.action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.action-item-wrapper { min-height: 26px; }
.action-item-btn {
  width: 100%; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff; padding: 6px 4px; border-radius: 6px; font-size: 11px; cursor: pointer;
  transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.action-item-btn:hover { background: #4facfe; border-color: transparent; transform: translateY(-1px); }
.action-item-input {
  width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
  color: #4facfe; padding: 5px 4px; border-radius: 6px; font-size: 11px; outline: none; font-family: inherit;
}
.action-item-input:focus { border-color: #4facfe; background: rgba(0,0,0,0.5); }
.action-item-input::placeholder { color: #666; font-size: 10px; }

.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: translate(-50%,-45%) scale(0.95); }
</style>
