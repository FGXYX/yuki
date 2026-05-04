<script setup lang="ts">
import { ref } from 'vue'
import { emit, listen } from '@tauri-apps/api/event'
import { ConfigStore } from '@/core/ConfigStore'

const localDisplayMotions = ref<any>({})
const localDisplayAliases = ref<any>({})
const isFetchingMotions = ref(false)
const expandedEmotion = ref<string | null>('happy')
const emotionBindings = ref<Record<string, string[]>>({ happy: [], sad: [], angry: [], shy: [], normal: [] })

// 直接从 ConfigStore 读取当前模型 ID，避免 useLive2D 新实例导致数据不同步
const getActiveModelId = async (): Promise<string | null> => {
  return await ConfigStore.get<string>('yuki_active_id', '') || null
}

const loadEmotionBindings = async () => {
  const modelId = await getActiveModelId()
  if (!modelId) return
  const key = `yuki_model_setting_${modelId}`
  const saved = await ConfigStore.get<any>(key, {})
  emotionBindings.value = { happy: [], sad: [], angry: [], shy: [], normal: [], ...saved.emotionMotions }
}

const saveEmotionBindings = async () => {
  const modelId = await getActiveModelId()
  if (!modelId) return
  const key = `yuki_model_setting_${modelId}`
  const existing = await ConfigStore.get<any>(key, {})
  await ConfigStore.set(key, { ...existing, emotionMotions: emotionBindings.value })
}

const toggleMotion = (emo: string, motionName: string) => {
  const list = emotionBindings.value[emo] || []
  if (list.includes(motionName)) emotionBindings.value[emo] = list.filter(m => m !== motionName)
  else emotionBindings.value[emo].push(motionName)
  saveEmotionBindings()
}

const fetchMotionsFromMain = async () => {
  isFetchingMotions.value = true
  const unlisten = await listen('reply-current-motions', (event: any) => {
    localDisplayMotions.value = event.payload.motions || {}
    localDisplayAliases.value = event.payload.aliases || {}
    isFetchingMotions.value = false
    unlisten()
  })
  await emit('request-current-motions')
  setTimeout(() => { if (isFetchingMotions.value) isFetchingMotions.value = false }, 2000)
}

defineExpose({ loadEmotionBindings, fetchMotionsFromMain })
</script>

<template>
  <div class="settings-page">
    <h2>情绪动作联动</h2>
    <p class="desc">设置 AI 在不同情绪下触发的 Live2D 动作。</p>

    <div v-if="isFetchingMotions" class="loading-state">正在从主窗口拉取动作列表...</div>

    <div v-else-if="Object.keys(localDisplayMotions).length === 0" class="empty-state">
      当前模型暂无可用动作数据，请确认模型已正确加载。
    </div>

    <div v-else class="emotion-link-container">
      <div class="emotion-tabs">
        <button v-for="emo in ['happy', 'sad', 'angry', 'shy', 'normal']" :key="emo"
          :class="['emo-tab', { active: expandedEmotion === emo }]"
          @click="expandedEmotion = expandedEmotion === emo ? null : emo">
          {{ { happy: '😊 开心', sad: '😢 悲伤', angry: '😠 生气', shy: '🥰 害羞', normal: '😐 日常' }[emo] }}
          <span class="badge">{{ (emotionBindings[emo] || []).length }}</span>
        </button>
      </div>

      <Transition name="slide-fade">
        <div v-if="expandedEmotion" class="motion-grid">
          <div v-for="(motionList, groupName) in localDisplayMotions" :key="groupName" class="motion-group">
            <h4 class="group-name">{{ groupName }}</h4>
            <div class="motion-items">
              <label v-for="(name, index) in motionList" :key="index"
                :class="['motion-check-item', { checked: (emotionBindings[expandedEmotion] || []).includes(name) }]">
                <input type="checkbox" :checked="(emotionBindings[expandedEmotion] || []).includes(name)"
                  @change="toggleMotion(expandedEmotion!, name)" />
                <span>{{ localDisplayAliases[name] || name }}</span>
              </label>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.emotion-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.emo-tab {
  padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03); color: #ccc; cursor: pointer;
  font-size: 13px; display: flex; align-items: center; gap: 6px; transition: 0.2s;
}
.emo-tab:hover { background: rgba(255,255,255,0.06); }
.emo-tab.active { background: rgba(79,172,254,0.15); border-color: #4facfe; color: #4facfe; }
.emo-tab .badge {
  background: rgba(255,255,255,0.1); padding: 0 6px; border-radius: 8px; font-size: 11px; line-height: 18px;
}
.emo-tab.active .badge { background: rgba(79,172,254,0.3); }

.motion-grid { display: flex; flex-direction: column; gap: 12px; }
.motion-group { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; }
.group-name { margin: 0 0 8px; font-size: 13px; color: #888; }
.motion-items { display: flex; flex-wrap: wrap; gap: 6px; }
.motion-check-item {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px; font-size: 12px; cursor: pointer; transition: 0.15s; color: #aaa;
}
.motion-check-item:hover { background: rgba(255,255,255,0.08); }
.motion-check-item.checked { background: rgba(79,172,254,0.12); border-color: #4facfe; color: #4facfe; }
.motion-check-item input { display: none; }
.empty-state, .loading-state { padding: 40px; text-align: center; color: #888; font-size: 14px; }
</style>
