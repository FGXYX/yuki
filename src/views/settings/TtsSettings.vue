<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTTS } from '@/composables/useTTS'

const emit = defineEmits<{
  saved: []
}>()

const { isTtsEnabled, ttsList, activeTtsId, loadTtsConfig, saveTtsConfig } = useTTS()

const editingTtsId = ref('')
const isTtsTesting = ref(false)
const isSwitchingModel = ref(false)
const editingTts = computed(() => ttsList.value.find(t => t.id === editingTtsId.value))

const editTts = (id: string) => { editingTtsId.value = id }
const setActiveTts = async (id: string) => { activeTtsId.value = id; await saveTtsConfig(); emit('saved') }

const addNewTts = async () => {
  const newId = 'tts_' + Date.now()
  ttsList.value.push({ id: newId, name: '新语音配置', engineType: 'gpt-sovits', apiUrl: 'http://127.0.0.1:9880', speed: 1.0, apiKey: '', voiceId: '', gptWeightPath: '', sovitsWeightPath: '', refAudioPath: '', promptText: '', promptLang: 'zh', textLang: 'zh' })
  editingTtsId.value = newId
  await saveTtsConfig()
  emit('saved')
}

const deleteTts = async (id: string) => {
  if (ttsList.value.length <= 1) { alert('至少要保留一个语音配置哦！'); return }
  if (!confirm('确定要删除这个语音配置吗？')) return
  ttsList.value = ttsList.value.filter(t => t.id !== id)
  if (activeTtsId.value === id) activeTtsId.value = ttsList.value[0].id
  if (editingTtsId.value === id) editingTtsId.value = ttsList.value[0].id
  await saveTtsConfig()
  emit('saved')
}

const switchTTSModels = async () => {
  const config = editingTts.value
  if (!config || !config.apiUrl || (!config.gptWeightPath && !config.sovitsWeightPath)) { alert("请先填写 API 地址和至少一个模型路径！"); return }
  isSwitchingModel.value = true
  try {
    const baseUrl = config.apiUrl.replace(/\/$/, '')
    if (config.gptWeightPath) { const r = await fetch(`${baseUrl}/set_gpt_weights?weights_path=${encodeURIComponent(config.gptWeightPath)}`); if (!r.ok) throw new Error("GPT 模型切换失败") }
    if (config.sovitsWeightPath) { const r = await fetch(`${baseUrl}/set_sovits_weights?weights_path=${encodeURIComponent(config.sovitsWeightPath)}`); if (!r.ok) throw new Error("SoVITS 模型切换失败") }
    alert("🎉 模型热切换成功！")
  } catch (err: any) { alert("切换模型失败: " + err.message) }
  finally { isSwitchingModel.value = false }
}

const testTTS = async () => {
  const config = editingTts.value
  if (!config || !config.apiUrl || !config.refAudioPath) { alert("请先填写 API 地址和参考音频路径哦！"); return }
  isTtsTesting.value = true
  try {
    const targetText = "主人你好呀！我是 Yuki，很高兴能拥有自己的声音！"
    const baseUrl = config.apiUrl.replace(/\/$/, '')
    const url = new URL(`${baseUrl}/tts`)
    url.searchParams.append('text', targetText); url.searchParams.append('text_lang', config.textLang)
    url.searchParams.append('prompt_text', config.promptText); url.searchParams.append('prompt_lang', config.promptLang)
    url.searchParams.append('ref_audio_path', config.refAudioPath)
    const audio = new Audio(url.toString()); await audio.play()
    audio.onended = () => { isTtsTesting.value = false }
    audio.onerror = () => { alert("连接或播放失败！"); isTtsTesting.value = false }
  } catch (err: any) { alert("请求异常: " + err.message); isTtsTesting.value = false }
}

defineExpose({ loadTtsConfig, editingTtsId })
</script>

<template>
  <div class="settings-page">
    <div class="page-header-flex">
      <div>
        <h2>语音与合成</h2>
        <p class="desc">管理多个 TTS 语音配置，随时自由切换不同声线。</p>
      </div>
      <label class="switch" title="开启/关闭全局语音播报">
        <input type="checkbox" v-model="isTtsEnabled" @change="saveTtsConfig">
        <span class="slider"></span>
      </label>
    </div>

    <div class="engine-list" :style="{ opacity: isTtsEnabled ? 1 : 0.5, pointerEvents: isTtsEnabled ? 'auto' : 'none' }">
      <div v-for="tts in ttsList" :key="tts.id"
        :class="['engine-item', { 'is-active': activeTtsId === tts.id, 'is-editing': editingTtsId === tts.id }]"
        @click="editTts(tts.id)">
        <div class="engine-info">
          <span class="engine-name">{{ tts.name }}</span>
          <span v-if="activeTtsId === tts.id" class="status-badge" style="margin-left:8px;">✔ 当前启用</span>
        </div>
        <div class="engine-actions">
          <button class="action-text-btn" v-if="activeTtsId !== tts.id" @click.stop="setActiveTts(tts.id)">设为启用</button>
          <button class="action-text-btn danger" v-if="ttsList.length > 1" @click.stop="deleteTts(tts.id)">删除</button>
        </div>
      </div>
      <button class="add-engine-btn" @click="addNewTts">+ 新增语音配置</button>
    </div>

    <div class="divider-line" style="margin: 20px 0;"></div>

    <div v-if="editingTts" class="edit-form-card" :style="{ opacity: isTtsEnabled ? 1 : 0.4, pointerEvents: isTtsEnabled ? 'auto' : 'none' }">
      <div class="page-header-flex" style="gap: 16px;">
        <div class="input-field" style="flex: 1;">
          <label>配置名称标识</label>
          <input type="text" v-model="editingTts.name" placeholder="例如: 傲娇模式 / 微软晓晓" @blur="saveTtsConfig">
        </div>
        <div class="input-field" style="flex: 1;">
          <label>引擎核心类型</label>
          <select v-model="editingTts.engineType" @change="saveTtsConfig">
            <option value="gpt-sovits">GPT-SoVITS (本地专属)</option>
            <option value="openai">标准 OpenAI 协议 (CosyVoice/云端)</option>
          </select>
        </div>
      </div>

      <template v-if="editingTts.engineType === 'gpt-sovits'">
        <div class="input-field">
          <label>API 接口地址</label>
          <input type="text" v-model="editingTts.apiUrl" placeholder="默认: http://127.0.0.1:9880" @blur="saveTtsConfig">
        </div>
        <h3 style="margin-top: 24px; font-size: 14px; color: var(--primary);">🤖 模型权重热切换 (选填)</h3>
        <div class="input-field">
          <label>GPT 模型绝对路径 (.ckpt)</label>
          <input type="text" v-model="editingTts.gptWeightPath" placeholder="例如: D:\vits\s1bert.ckpt" @blur="saveTtsConfig">
        </div>
        <div class="input-field">
          <label>SoVITS 模型绝对路径 (.pth)</label>
          <input type="text" v-model="editingTts.sovitsWeightPath" placeholder="例如: D:\vits\s2G488k.pth" @blur="saveTtsConfig">
        </div>
        <div class="test-section" style="border-top: none; padding-top: 0; margin-bottom: 24px;">
          <button class="test-btn" style="background: rgba(79,172,254,0.1); color: var(--primary); border-color: var(--primary);" @click="switchTTSModels" :disabled="isSwitchingModel">
            <span class="flex-center-btn"><span>{{ isSwitchingModel ? '🔄' : '🔌' }}</span>应用 / 切换模型权重</span>
          </button>
        </div>
        <div class="divider-line" style="margin: 20px 0;"></div>
        <h3 style="font-size: 14px; color: var(--primary);">🎤 默认基础参考音频 (Normal)</h3>
        <div class="input-field">
          <label>参考音频绝对路径 (Ref Audio Path)</label>
          <input type="text" v-model="editingTts.refAudioPath" placeholder="例如: D:\Voice\yuki_normal.wav" @blur="saveTtsConfig">
        </div>
        <div class="input-field">
          <label>参考音频对应的文字 (Prompt Text)</label>
          <textarea style="height: 60px; min-height: 60px;" v-model="editingTts.promptText" placeholder="参考音频里说的话..." @blur="saveTtsConfig"></textarea>
        </div>
        <div class="page-header-flex" style="gap: 16px; margin-bottom: 0;">
          <div class="input-field" style="flex: 1;"><label>参考音频语种</label><select v-model="editingTts.promptLang" @change="saveTtsConfig"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option></select></div>
          <div class="input-field" style="flex: 1;"><label>合成语种</label><select v-model="editingTts.textLang" @change="saveTtsConfig"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="all_zh">中英混合</option><option value="all_ja">日英混合</option><option value="auto">中日英三者混合 (自动识别)</option></select></div>
        </div>
        <div class="input-field" style="margin-top: 16px;">
          <div class="flex-label"><label>语速调节 (Speed Factor)</label><span class="val-badge">{{ editingTts.speed || 1.0 }}x</span></div>
          <input type="range" class="theme-slider" v-model.number="editingTts.speed" min="0.5" max="2.0" step="0.1" @change="saveTtsConfig" />
          <div class="range-marks"><span>慢 (0.5x)</span><span>标准 (1.0x)</span><span>快 (2.0x)</span></div>
        </div>
        <div class="divider-line" style="margin: 24px 0;"></div>
        <div class="page-header-flex" style="margin-bottom: 8px;">
          <h3 style="font-size: 14px; color: var(--primary); margin: 0;">🎭 特殊情绪差分</h3>
        </div>
        <p style="font-size: 12px; color: #888; margin: 0 0 16px; line-height: 1.5;">
          * 当 AI 回复开头包含 [happy] 等情绪标签时，将自动切换至下方音频。<br>
          * 若留空，则默认使用上方的基础参考音频。
        </p>
        <div class="emotion-grid">
          <div class="emotion-card happy">
            <label class="emo-title">[happy] 开心 / 兴奋</label>
            <input type="text" v-model="editingTts.happyAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig">
            <input type="text" v-model="editingTts.happyPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig">
          </div>
          <div class="emotion-card sad">
            <label class="emo-title">[sad] 悲伤 / 低落</label>
            <input type="text" v-model="editingTts.sadAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig">
            <input type="text" v-model="editingTts.sadPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig">
          </div>
          <div class="emotion-card angry">
            <label class="emo-title">[angry] 生气 / 傲娇</label>
            <input type="text" v-model="editingTts.angryAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig">
            <input type="text" v-model="editingTts.angryPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig">
          </div>
          <div class="emotion-card shy">
            <label class="emo-title">[shy] 害羞 / 气声</label>
            <input type="text" v-model="editingTts.shyAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig">
            <input type="text" v-model="editingTts.shyPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig">
          </div>
        </div>
      </template>

      <template v-if="editingTts.engineType === 'openai'">
        <div class="input-field">
          <label>接口地址 (Base URL)</label>
          <input type="text" v-model="editingTts.apiUrl" placeholder="例如: https://api.openai.com/v1" @blur="saveTtsConfig">
        </div>
        <div class="input-field">
          <label>访问密钥 (API Key - 选填)</label>
          <input type="password" v-model="editingTts.apiKey" placeholder="sk-..." @blur="saveTtsConfig">
        </div>
        <div class="input-field">
          <label>指定音色标识 (Voice ID)</label>
          <input type="text" v-model="editingTts.voiceId" placeholder="例如: alloy / zh-CN-XiaoxiaoNeural" @blur="saveTtsConfig">
        </div>
      </template>

      <div class="test-section" style="margin-top: 24px;">
        <button class="test-btn" @click="testTTS" :disabled="isTtsTesting">
          {{ isTtsTesting ? '正在请求并播放...' : '▶ 单独测试此声音' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emotion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.emotion-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; }
.emo-title { display: block; font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.emotion-card input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #ececec; padding: 6px 8px; border-radius: 6px; font-size: 11px; outline: none; margin-bottom: 6px; box-sizing: border-box; }
.emotion-card input:last-child { margin-bottom: 0; }
</style>
