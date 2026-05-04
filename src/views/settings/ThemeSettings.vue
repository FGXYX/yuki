<script setup lang="ts">
import { ref } from 'vue'
import { ConfigStore } from '@/core/ConfigStore'

const emit = defineEmits<{
  themeChanged: [themeId: string]
}>()

const themeRegistry = [
  { id: 'dark', name: '深空灰', preview: '#1a1b1e', color: '#4facfe', vars: { '--bg': '#1a1b1e', '--sidebar-bg': '#141517', '--primary': '#4facfe', '--text': '#ececec', '--text-muted': '#888888', '--border': '#2c2d30', '--hover': '#1e1f22', '--active-bg': '#242528', '--input-bg': '#141517' } },
  { id: 'light', name: '极简白', preview: '#f7f9fa', color: '#006fee', vars: { '--bg': '#f7f9fa', '--sidebar-bg': '#ffffff', '--primary': '#006fee', '--text': '#11181c', '--text-muted': '#687076', '--border': '#d7dbdf', '--hover': '#f1f3f5', '--active-bg': '#e6f1fe', '--input-bg': '#ffffff' } },
  { id: 'sakura', name: '樱花粉', preview: '#fff5f7', color: '#fb7185', vars: { '--bg': '#fff5f7', '--sidebar-bg': '#ffe4e6', '--primary': '#fb7185', '--text': '#4c1d95', '--text-muted': '#be123c', '--border': '#fecdd3', '--hover': '#ffe4e6', '--active-bg': '#fff1f2', '--input-bg': '#ffffff' } },
  { id: 'custom', name: '自定义', preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)', color: '#ffffff', vars: {} }
]
const activeThemeId = ref('dark')
const customThemeVars = ref<Record<string, string>>({ '--bg': '#2b2b2b', '--sidebar-bg': '#1e1e1e', '--primary': '#10b981', '--text': '#ffffff', '--text-muted': '#a1a1aa', '--border': '#3f3f46', '--hover': '#27272a', '--active-bg': '#3f3f46', '--input-bg': '#18181b' })
const varLabels: Record<string, string> = { '--bg': '主背景色', '--sidebar-bg': '侧边栏背景', '--primary': '主题高亮色', '--text': '主文字颜色', '--text-muted': '次要文字色', '--border': '边框线颜色', '--hover': '悬停状态底色', '--active-bg': '选中状态底色', '--input-bg': '输入框背景色' }

const loadTheme = async () => {
  const savedThemeId = await ConfigStore.get<string>('yuki_theme', 'dark')
  if (themeRegistry.find(t => t.id === savedThemeId)) activeThemeId.value = savedThemeId
  const savedCustom = await ConfigStore.get<any>('yuki_theme_custom', null)
  if (savedCustom) customThemeVars.value = savedCustom
}
const switchTheme = async (id: string) => { activeThemeId.value = id; await ConfigStore.set('yuki_theme', id); emit('themeChanged', id) }
const saveCustomTheme = async () => { await ConfigStore.set('yuki_theme_custom', customThemeVars.value) }

defineExpose({ loadTheme })
</script>

<template>
  <div class="settings-page">
    <h2>个性化外观</h2>
    <p class="desc">挑选或自定义最适合你的界面色彩方案。</p>
    <div class="theme-grid">
      <div v-for="theme in themeRegistry" :key="theme.id"
        :class="['theme-card', { 'is-active': activeThemeId === theme.id }]"
        @click="switchTheme(theme.id)">
        <div class="theme-preview" :style="{ background: theme.preview, border: `2px solid ${theme.color}` }"></div>
        <span class="theme-name">{{ theme.name }}</span>
      </div>
    </div>
    <Transition name="slide-fade">
      <div v-if="activeThemeId === 'custom'" class="custom-color-editor">
        <h3>DIY 高级调色板</h3>
        <div class="color-pickers-grid">
          <div class="picker-item" v-for="(val, key) in customThemeVars" :key="key">
            <div class="picker-info">
              <span class="picker-label">{{ varLabels[key] }}</span>
              <span class="picker-code">{{ val }}</span>
            </div>
            <input type="color" v-model="customThemeVars[key]" @input="saveCustomTheme" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
