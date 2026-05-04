<script setup lang="ts">
import { ref, watch } from 'vue'
import { ConfigStore } from '@/core/ConfigStore'

const emit = defineEmits<{
  saved: []
}>()

const aiProviders = ref([
  { id: '1', name: '我的 DeepSeek', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKey: '', modelName: 'deepseek-chat' },
  { id: '2', name: '本地 Ollama', provider: 'ollama', baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', modelName: 'qwen2:7b' }
])
const activeAiId = ref('1')
const currentEditAi = ref<any>(null)
const isAiSaved = ref(false)
const isTesting = ref(false)
const testResult = ref<{ status: 'idle' | 'success' | 'error', message: string }>({ status: 'idle', message: '' })

watch(() => currentEditAi.value?.provider, (newProvider) => {
  if (!currentEditAi.value) return
  if (newProvider === 'openai') { currentEditAi.value.baseUrl = 'https://api.openai.com/v1'; currentEditAi.value.modelName = 'gpt-3.5-turbo' }
  if (newProvider === 'anthropic') { currentEditAi.value.baseUrl = 'https://api.anthropic.com'; currentEditAi.value.modelName = 'claude-3-haiku-20240307' }
  if (newProvider === 'deepseek') { currentEditAi.value.baseUrl = 'https://api.deepseek.com/v1'; currentEditAi.value.modelName = 'deepseek-chat' }
  if (newProvider === 'ollama') { currentEditAi.value.baseUrl = 'http://localhost:11434/v1'; currentEditAi.value.modelName = 'qwen2:7b' }
})

const loadAiProviders = async () => {
  const savedList = await ConfigStore.get<any[]>('yuki_ai_list', [])
  if (savedList && savedList.length > 0) aiProviders.value = savedList
  const savedActive = await ConfigStore.get<string>('yuki_active_ai', '')
  if (savedActive) activeAiId.value = savedActive
}
const saveAiProviders = async () => {
  await ConfigStore.set('yuki_ai_list', aiProviders.value)
  await ConfigStore.set('yuki_active_ai', activeAiId.value)
  isAiSaved.value = true; setTimeout(() => isAiSaved.value = false, 2000)
  emit('saved')
}
const createNewAi = () => { currentEditAi.value = { id: 'ai_' + Date.now(), name: '新建 AI 引擎', provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: '', modelName: '' } }
const editAi = (ai: any) => { currentEditAi.value = { ...ai }; testResult.value = { status: 'idle', message: '' } }
const deleteAi = async (id: string) => {
  if (!confirm('确定要删除这个 AI 引擎配置吗？')) return
  if (aiProviders.value.length <= 1) { alert('至少要保留一个 AI 配置哦！'); return }
  aiProviders.value = aiProviders.value.filter(a => a.id !== id)
  if (activeAiId.value === id) activeAiId.value = aiProviders.value[0].id
  await saveAiProviders()
}
const confirmSaveEditAi = async () => {
  const index = aiProviders.value.findIndex(a => a.id === currentEditAi.value.id)
  if (index >= 0) aiProviders.value[index] = { ...currentEditAi.value }
  else { aiProviders.value.push({ ...currentEditAi.value }); activeAiId.value = currentEditAi.value.id }
  await saveAiProviders()
  currentEditAi.value = null
}
const testAiConnection = async () => {
  if (!currentEditAi.value || !currentEditAi.value.baseUrl) { testResult.value = { status: 'error', message: '请先填写 Base URL' }; return }
  isTesting.value = true; testResult.value = { status: 'idle', message: '' }
  try {
    let endpoint = currentEditAi.value.baseUrl
    if (!endpoint.endsWith('/chat/completions')) endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentEditAi.value.apiKey}` },
      body: JSON.stringify({ model: currentEditAi.value.modelName, messages: [{ role: 'user', content: '测试连接，请回复：收到' }], max_tokens: 10 })
    })
    if (response.ok) testResult.value = { status: 'success', message: '连通测试成功！API 可用。' }
    else { const errData = await response.json().catch(() => ({})); testResult.value = { status: 'error', message: `失败: [${response.status}] ${errData.error?.message || response.statusText}` } }
  } catch (error: any) { testResult.value = { status: 'error', message: `网络请求异常: ${error.message}` } }
  finally { isTesting.value = false }
}

const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>'
const UI_EDIT = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M92.7,216H48a8,8,0,0,1-8-8V163.3a7.9,7.9,0,0,1,2.3-5.6l120-120a8,8,0,0,1,11.4,0l44.6,44.6a8,8,0,0,1,0,11.4l-120,120A7.9,7.9,0,0,1,92.7,216Z"></path><line x1="136" y1="64" x2="192" y2="120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>'
const UI_TRASH = '<svg viewBox="0 0 256 256"><line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M200,56V208a8,8,0,0,1-8-8H64a8,8,0,0,1-8-8V56"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56"></path></svg>'
const UI_SAVE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M152,208V160a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v48Zm56-160V192a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H176l32,32Z"></path></svg>'

defineExpose({ loadAiProviders })
</script>

<template>
  <div class="settings-page">
    <div v-if="!currentEditAi" class="ai-list-view">
      <div class="page-header-flex">
        <div>
          <h2>AI 引擎管理</h2>
          <p class="desc">添加和管理各个大语言模型服务商。</p>
        </div>
        <button class="primary-btn outline flex-center-btn" @click="createNewAi">
          <span class="btn-icon" v-html="UI_PLUS"></span>新增
        </button>
      </div>
      <div class="provider-list">
        <div v-for="ai in aiProviders" :key="ai.id" :class="['provider-card', { active: activeAiId === ai.id }]">
          <div class="provider-info" @click="activeAiId = ai.id; saveAiProviders()">
            <div class="p-header">
              <span class="p-name">{{ ai.name }}</span>
              <span v-if="activeAiId === ai.id" class="active-badge">当前使用</span>
            </div>
            <div class="p-meta">{{ ai.provider.toUpperCase() }} | {{ ai.modelName }}</div>
          </div>
          <div class="provider-actions">
            <button class="action-pill-btn edit" @click.stop="editAi(ai)">
              <span class="btn-icon" v-html="UI_EDIT"></span> 编辑
            </button>
            <button v-if="aiProviders.length > 1" class="action-pill-btn delete" @click.stop="deleteAi(ai.id)">
              <span class="btn-icon" v-html="UI_TRASH"></span> 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="ai-edit-view">
      <div class="page-header-flex">
        <div class="header-with-back">
          <button class="back-btn" @click="currentEditAi = null"> 返回 </button>
          <h2>{{ currentEditAi.id.startsWith('ai_') ? '新增引擎' : '编辑引擎' }}</h2>
        </div>
        <button class="primary-btn flex-center-btn" @click="confirmSaveEditAi">
          <span class="btn-icon" v-html="UI_SAVE"></span> 保存
        </button>
      </div>
      <div class="edit-form-card">
        <div class="input-field">
          <label>配置备注名称</label>
          <input type="text" v-model="currentEditAi.name" placeholder="例如: 我的 DeepSeek" />
        </div>
        <div class="input-field">
          <label>服务提供商 (Provider)</label>
          <select v-model="currentEditAi.provider">
            <option value="openai">OpenAI (GPT系列)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="deepseek">DeepSeek (深度求索)</option>
            <option value="custom">自定义中转 API</option>
            <option value="ollama">Ollama (本地模型)</option>
          </select>
        </div>
        <div class="input-field">
          <label>请求代理地址 (Base URL)</label>
          <input type="text" v-model="currentEditAi.baseUrl" placeholder="https://api.openai.com/v1" />
        </div>
        <div class="input-field">
          <label>鉴权密钥 (API Key)</label>
          <input type="password" v-model="currentEditAi.apiKey" placeholder="sk-..." />
        </div>
        <div class="input-field">
          <label>模型代码 (Model)</label>
          <input type="text" v-model="currentEditAi.modelName" placeholder="例如: gpt-3.5-turbo" />
        </div>
        <div class="test-section">
          <button class="test-btn" :disabled="isTesting" @click="testAiConnection">
            {{ isTesting ? '请求中...' : '测试连通性' }}
          </button>
          <div v-if="testResult.status !== 'idle'" :class="['test-result', testResult.status]">{{ testResult.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
