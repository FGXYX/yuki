<script setup lang="ts">
import { ref } from 'vue'
import { ConfigStore } from '@/core/ConfigStore'

const emit = defineEmits<{
  saved: []
}>()

const personaConfig = ref({ temperature: 0.7, prompt: '你是 Yuki，一个聪明、傲娇、可爱的白发萝莉桌宠。你需要用简短、二次元的语气和主人对话，严禁回复长篇大论。你会在对话中夹杂颜文字。' })
const isPersonaSaved = ref(false)

const loadPersona = async () => {
  const saved = await ConfigStore.get<any>('yuki_persona', null)
  if (saved) personaConfig.value = saved
}
const savePersona = async () => {
  await ConfigStore.set('yuki_persona', personaConfig.value)
  isPersonaSaved.value = true
  setTimeout(() => isPersonaSaved.value = false, 2000)
  emit('saved')
}

defineExpose({ loadPersona })

const UI_SAVE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M152,208V160a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v48Zm56-160V192a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H176l32,32Z"></path></svg>'
</script>

<template>
  <div class="settings-page">
    <div class="page-header-flex">
      <div>
        <h2>人格设定</h2>
        <p class="desc">定义 Yuki 的灵魂：性格、记忆和语言风格。全局生效。</p>
      </div>
      <button class="primary-btn flex-center-btn" @click="savePersona">
        <span class="btn-icon" v-html="UI_SAVE"></span> {{ isPersonaSaved ? '已保存' : '保存' }}
      </button>
    </div>
    <div class="persona-container">
      <div class="input-field">
        <div class="flex-label">
          <label>创造力温度 (Temperature)</label>
          <span class="val-badge">{{ personaConfig.temperature }}</span>
        </div>
        <input type="range" class="theme-slider" v-model.number="personaConfig.temperature" min="0" max="2" step="0.1" />
        <div class="range-marks"><span>绝对严谨</span><span>发散跳跃</span></div>
      </div>
      <div class="input-field flex-grow">
        <label>系统全局提示词 (System Prompt)</label>
        <textarea v-model="personaConfig.prompt" placeholder="在此输入桌宠的详细人设..." class="large-textarea"></textarea>
      </div>
    </div>
  </div>
</template>
