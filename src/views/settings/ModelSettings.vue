<script setup lang="ts">
import { ref } from 'vue'
import { emit } from '@tauri-apps/api/event'
import { convertFileSrc } from '@tauri-apps/api/core'
import { join, appDataDir } from '@tauri-apps/api/path'
import { writeFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { Live2DManager } from '@/core/Live2DManager'
import { ConfigStore } from '@/core/ConfigStore'
import JSZip from 'jszip'

const MOCK_AVATAR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="%231a1b26"/><circle cx="100" cy="90" r="35" fill="%234facfe"/><path d="M50,300 L50,240 C50,190 70,160 100,160 C130,160 150,190 150,240 L150,300" fill="%234facfe" opacity="0.8"/></svg>`

const modelRegistry = ref<any[]>([])
const activeModelId = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const hiddenCanvasRef = ref<HTMLCanvasElement | null>(null)
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadStatusText = ref('')

const loadModels = async () => {
  const savedModels = await ConfigStore.get<any[]>('yuki_models', [])
  if (savedModels.length > 0) {
    modelRegistry.value = savedModels
    modelRegistry.value.forEach(m => { if (m.id === 'default_1') m.preview = '/ele_a0/preview.png'; else if (!m.preview) m.preview = MOCK_AVATAR_SVG })
  } else { modelRegistry.value = [] }
  const savedId = await ConfigStore.get<string>('yuki_active_id', '')
  if (savedId) activeModelId.value = savedId
}
const saveModelsConfig = async () => {
  await ConfigStore.set('yuki_models', modelRegistry.value)
  await ConfigStore.set('yuki_active_id', activeModelId.value)
  await emit('yuki-model-changed', activeModelId.value)
}
const selectModel = async (id: string) => { activeModelId.value = id; await saveModelsConfig() }
const deleteModel = async (id: string, event: Event) => {
  event.stopPropagation()
  if (!confirm('确定要从列表中彻底移除这个模型吗？')) return
  modelRegistry.value = modelRegistry.value.filter(m => m.id !== id)
  if (activeModelId.value === id) {
    if (modelRegistry.value.length > 0) await selectModel(modelRegistry.value[0].id)
    else { activeModelId.value = ''; await saveModelsConfig() }
  } else { await saveModelsConfig() }
}
const triggerFileInput = () => { if (!isUploading.value && fileInput.value) fileInput.value.click() }
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) { processUploadSimulation(target.files[0]); target.value = '' }
}
const handleDrop = (e: DragEvent) => {
  isDragOver.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    if (file.name.toLowerCase().endsWith('.zip')) processUploadSimulation(file)
    else alert('请上传 .zip 格式的 Live2D 模型压缩包！')
  }
}
const processUploadSimulation = async (file: File) => {
  try {
    isUploading.value = true; uploadProgress.value = 5; uploadStatusText.value = `正在解析压缩包: [${file.name}]...`
    const zip = await JSZip.loadAsync(file)
    const modelDirName = file.name.replace('.zip', '')
    const appDataDirPath = await appDataDir()
    const modelBaseDirRelative = `models/${modelDirName}`
    uploadProgress.value = 20; uploadStatusText.value = '正在提取并写入本地磁盘...'
    if (!(await exists('models', { baseDir: BaseDirectory.AppData }))) await mkdir('models', { baseDir: BaseDirectory.AppData, recursive: true })
    if (!(await exists(modelBaseDirRelative, { baseDir: BaseDirectory.AppData }))) await mkdir(modelBaseDirRelative, { baseDir: BaseDirectory.AppData, recursive: true })
    const files = Object.keys(zip.files)
    let processed = 0; let model3JsonRelativePath = ''
    for (const relativePath of files) {
      const zipEntry = zip.files[relativePath]; const fullLocalPathRelative = `${modelBaseDirRelative}/${relativePath}`
      if (zipEntry.dir) { await mkdir(fullLocalPathRelative, { baseDir: BaseDirectory.AppData, recursive: true }) }
      else {
        const pathParts = relativePath.split('/'); pathParts.pop()
        if (pathParts.length > 0) { const parentDirRelative = `${modelBaseDirRelative}/${pathParts.join('/')}`; if (!(await exists(parentDirRelative, { baseDir: BaseDirectory.AppData }))) { await mkdir(parentDirRelative, { baseDir: BaseDirectory.AppData, recursive: true }) } }
        const content = await zipEntry.async('uint8array')
        await writeFile(fullLocalPathRelative, content, { baseDir: BaseDirectory.AppData })
        if (relativePath.toLowerCase().endsWith('.model3.json')) model3JsonRelativePath = relativePath
      }
      processed++; uploadProgress.value = 20 + Math.floor((processed / files.length) * 50)
    }
    if (!model3JsonRelativePath) throw new Error('未找到 .model3.json 配置文件！')
    uploadProgress.value = 75; uploadStatusText.value = '注册引擎协议...'
    const absoluteJsonPath = await join(appDataDirPath, 'models', modelDirName, model3JsonRelativePath)
    let engineUrl = convertFileSrc(absoluteJsonPath).replace(/%5C/ig, '/').replace(/%2F/ig, '/').replace(/\\\\/g, '/')
    uploadProgress.value = 85; uploadStatusText.value = '启动离线渲染器，正在生成真实立绘封面...'
    let generatedPreviewBase64 = MOCK_AVATAR_SVG
    try {
      if (hiddenCanvasRef.value) {
        const tempManager = new Live2DManager(hiddenCanvasRef.value)
        await tempManager.loadModel(engineUrl, 0.26, 20, -10)
        await new Promise(resolve => setTimeout(resolve, 800))
        generatedPreviewBase64 = hiddenCanvasRef.value.toDataURL('image/png')
        tempManager.destroyApp()
      }
    } catch (renderErr) { console.warn('离线渲染截帧失败，将使用默认剪影:', renderErr) }
    uploadProgress.value = 100; uploadStatusText.value = '入库成功！'
    modelRegistry.value.push({ id: 'custom_' + Date.now(), name: modelDirName, path: engineUrl, defScale: 0.15, defX: -15, defY: -10, preview: generatedPreviewBase64 })
    await saveModelsConfig()
    setTimeout(() => { isUploading.value = false }, 1500)
  } catch (err: any) {
    console.error('模型解压失败:', err)
    alert('模型导入失败: \n' + (err instanceof Error ? err.message : String(err)))
    isUploading.value = false
  }
}

const UI_UPLOAD_CLOUD = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M86.4,216a48.1,48.1,0,0,1-13.6-94.1A68,68,0,0,1,192,80a43.6,43.6,0,0,1,11,1.4,48,48,0,0,1,10.6,89"></path><polyline points="96 144 128 112 160 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><line x1="128" y1="112" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>'

defineExpose({ loadModels })
</script>

<template>
  <div class="settings-page">
    <div class="page-header-flex">
      <div>
        <h2>Live2D 模型库</h2>
        <p class="desc">管理你的桌宠外观。支持拖拽导入 ZIP 压缩包。</p>
      </div>
    </div>
    <canvas ref="hiddenCanvasRef" style="position: absolute; width: 400px; height: 600px; opacity: 0; pointer-events: none; z-index: -999;"></canvas>

    <div class="upload-dropzone" :class="{ 'is-dragover': isDragOver, 'is-uploading': isUploading }"
      @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop" @click="triggerFileInput">
      <input type="file" ref="fileInput" accept=".zip" class="hidden-input" @change="handleFileSelect" />
      <div v-if="!isUploading" class="upload-idle">
        <span class="upload-icon" v-html="UI_UPLOAD_CLOUD"></span>
        <h3>点击或将 ZIP 压缩包拖拽至此处</h3>
        <p>支持包含 model3.json 的标准 Live2D 压缩包格式</p>
      </div>
      <div v-else class="upload-progress-container">
        <div class="progress-spinner"></div>
        <h3 class="progress-text">{{ uploadStatusText }}</h3>
        <div class="progress-bar-bg"><div class="progress-bar-fill" :style="{ width: uploadProgress + '%' }"></div></div>
        <p class="progress-percent">{{ uploadProgress }}%</p>
      </div>
    </div>

    <div class="divider-line"></div>
    <h3>我的模型库</h3>
    <div class="model-library-grid">
      <div v-for="mod in modelRegistry" :key="mod.id"
        :class="['model-lib-card', { 'is-active': activeModelId === mod.id }]"
        @click="selectModel(mod.id)">
        <button class="model-delete-btn" title="删除模型" @click="deleteModel(mod.id, $event)">×</button>
        <div class="model-preview-box">
          <img v-if="mod.preview" :src="mod.preview" alt="preview" draggable="false" />
          <div v-else class="no-preview-placeholder">暂无全身预览</div>
        </div>
        <div class="model-lib-info">
          <span class="mod-name" :title="mod.name">{{ mod.name }}</span>
          <span v-if="activeModelId === mod.id" class="active-badge">当前应用</span>
        </div>
      </div>
    </div>
  </div>
</template>
