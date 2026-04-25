<script setup lang="ts">
// ============================================================================
// 1. 模块引入 (Imports)
// ============================================================================
import { ref, computed, watch, onMounted } from 'vue';

// Tauri 系统与底层 API
import { emit, listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { join, appDataDir } from '@tauri-apps/api/path';
import { writeFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import { getCurrentWindow } from '@tauri-apps/api/window';
import JSZip from 'jszip';

// 核心加载器
import { Live2DManager } from '@/core/Live2DManager';

import { ConfigStore } from '@/core/ConfigStore';

import { open as openBrowser } from '@tauri-apps/plugin-shell';
// ============================================================================
// 2. 静态常量与图标 (Constants & Icons)
// ============================================================================
const UI_GEAR = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,152a24,24,0,1,0-24-24A24,24,0,0,0,128,152Zm71.5-18.7,21.7-10.8a8,8,0,0,0,3.6-10.7l-13.4-23.2a8,8,0,0,0-10-3.8l-21.3,9a88.1,88.1,0,0,0-16.1-10.7L161,60.8A8,8,0,0,0,153.2,54H102.8a8,8,0,0,0-7.8,6.8L92,83.1A88.1,88.1,0,0,0,75.9,93.8l-21.3-9a8,8,0,0,0-10,3.8L31.2,111.8a8,8,0,0,0,3.6,10.7l21.7,10.8a87.1,87.1,0,0,0,0,19.4l-21.7,10.8a8,8,0,0,0-3.6,10.7l13.4,23.2a8,8,0,0,0,10,3.8l21.3-9a88.1,88.1,0,0,0,16.1,10.7l3,22.3a8,8,0,0,0,7.8,6.8h50.4a8,8,0,0,0,7.8-6.8l3-22.3a88.1,88.1,0,0,0,16.1-10.7l21.3,9a8,8,0,0,0,10-3.8l13.4-23.2a8,8,0,0,0-3.6-10.7l-21.7-10.8A87.1,87.1,0,0,0,199.5,133.3Z"></path></svg>';
const UI_USER = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,120a40,40,0,1,0-40-40A40,40,0,0,0,128,120Zm0,16c-53,0-96,28.7-96,64a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8C224,164.7,181,136,128,136Z"></path></svg>';
const UI_PALETTE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,40A88,88,0,1,0,216,128c0-22-16-40-40-40H160a24,24,0,0,1,24-24C184,52.9,157.9,40,128,40ZM84,104a12,12,0,1,1-12-12A12,12,0,0,1,84,104Zm44-28a12,12,0,1,1-12-12A12,12,0,0,1,128,76Zm44,28a12,12,0,1,1-12-12A12,12,0,0,1,172,104Z"></path></svg>';
const UI_CPU = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M80,104a12,12,0,1,1-12-12A12,12,0,0,1,80,104Zm84-12a12,12,0,1,0,12,12A12,12,0,0,0,164,92ZM224,136v40a16,16,0,0,1-16,16H184V208a16,16,0,0,1-16,16H88a16,16,0,0,1-16-16V192H48a16,16,0,0,1-16-16V136ZM168,48a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8V80h80Z"></path></svg>';
const UI_MIC = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,176a48.1,48.1,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.1,48.1,0,0,0,128,176ZM200,128a72.1,72.1,0,0,1-144,0M128,200v40m-32,0h64"></path></svg>';
const UI_INFO = '<svg viewBox="0 0 256 256"><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></circle><polyline points="120 120 128 120 128 176 136 176" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><circle cx="126" cy="84" r="12"></circle></svg>';
const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>';
const UI_SAVE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M152,208V160a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v48Zm56-160V192a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H176l32,32Z"></path></svg>';
const UI_EDIT = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M92.7,216H48a8,8,0,0,1-8-8V163.3a7.9,7.9,0,0,1,2.3-5.6l120-120a8,8,0,0,1,11.4,0l44.6,44.6a8,8,0,0,1,0,11.4l-120,120A7.9,7.9,0,0,1,92.7,216Z"></path><line x1="136" y1="64" x2="192" y2="120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>';
const UI_TRASH = '<svg viewBox="0 0 256 256"><line x1="216" y1="56" x2="40" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="104" y1="104" x2="104" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><line x1="152" y1="104" x2="152" y2="168" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M200,56V208a8,8,0,0,1-8-8H64a8,8,0,0,1-8-8V56"></path><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56"></path></svg>';
const UI_PACKAGE = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M224,177.3V78.7a8.1,8.1,0,0,0-4.1-7l-88-49.5a7.8,7.8,0,0,0-7.8,0l-88,49.5a8.1,8.1,0,0,0-4.1,7v98.6a8.1,8.1,0,0,0,4.1,7l88,49.5a7.8,7.8,0,0,0,7.8,0l88-49.5A8.1,8.1,0,0,0,224,177.3Z"></path><polyline points="177 152.5 177 100.5 80 47" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><polyline points="222.9 74.6 128 128 33.1 74.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><line x1="128" y1="128" x2="128" y2="234.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>';
const UI_UPLOAD_CLOUD = '<svg viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M86.4,216a48.1,48.1,0,0,1-13.6-94.1A68,68,0,0,1,192,80a43.6,43.6,0,0,1,11,1.4,48,48,0,0,1,10.6,89"></path><polyline points="96 144 128 112 160 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline><line x1="128" y1="112" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line></svg>';

const MOCK_AVATAR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><rect width="200" height="300" fill="%231a1b26"/><circle cx="100" cy="90" r="35" fill="%234facfe"/><path d="M50,300 L50,240 C50,190 70,160 100,160 C130,160 150,190 150,240 L150,300" fill="%234facfe" opacity="0.8"/></svg>`;

// ============================================================================
// 3. 状态管理 (Reactive State)
// ============================================================================
// 全局状态
const activeSettingsTab = ref('general'); 

// --- 主题状态 ---
const themeRegistry = [
  { id: 'dark', name: '深空灰', preview: '#1a1b1e', color: '#4facfe', vars: { '--bg': '#1a1b1e', '--sidebar-bg': '#141517', '--primary': '#4facfe', '--text': '#ececec', '--text-muted': '#888888', '--border': '#2c2d30', '--hover': '#1e1f22', '--active-bg': '#242528', '--input-bg': '#141517' } },
  { id: 'light', name: '极简白', preview: '#f7f9fa', color: '#006fee', vars: { '--bg': '#f7f9fa', '--sidebar-bg': '#ffffff', '--primary': '#006fee', '--text': '#11181c', '--text-muted': '#687076', '--border': '#d7dbdf', '--hover': '#f1f3f5', '--active-bg': '#e6f1fe', '--input-bg': '#ffffff' } },
  { id: 'sakura', name: '樱花粉', preview: '#fff5f7', color: '#fb7185', vars: { '--bg': '#fff5f7', '--sidebar-bg': '#ffe4e6', '--primary': '#fb7185', '--text': '#4c1d95', '--text-muted': '#be123c', '--border': '#fecdd3', '--hover': '#ffe4e6', '--active-bg': '#fff1f2', '--input-bg': '#ffffff' } },
  { id: 'custom', name: '自定义', preview: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)', color: '#ffffff', vars: {} }
];
const activeThemeId = ref('dark');
const customThemeVars = ref<Record<string, string>>({ '--bg': '#2b2b2b', '--sidebar-bg': '#1e1e1e', '--primary': '#10b981', '--text': '#ffffff', '--text-muted': '#a1a1aa', '--border': '#3f3f46', '--hover': '#27272a', '--active-bg': '#3f3f46', '--input-bg': '#18181b' });
const varLabels: Record<string, string> = { '--bg': '主背景色', '--sidebar-bg': '侧边栏背景', '--primary': '主题高亮色', '--text': '主文字颜色', '--text-muted': '次要文字色', '--border': '边框线颜色', '--hover': '悬停状态底色', '--active-bg': '选中状态底色', '--input-bg': '输入框背景色' };

// --- 模型与导入状态 ---
const modelRegistry = ref<any[]>([]);
const activeModelId = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const hiddenCanvasRef = ref<HTMLCanvasElement | null>(null); // 用于后台离线截帧
const isDragOver = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadStatusText = ref('');

// --- 🧠 人格设定状态 ---
const personaConfig = ref({ temperature: 0.7, prompt: '你是 Yuki，一个聪明、傲娇、可爱的白发萝莉桌宠。你需要用简短、二次元的语气和主人对话，严禁回复长篇大论。你会在对话中夹杂颜文字。' });
const isPersonaSaved = ref(false);

// --- 🤖 AI 引擎状态 ---
const aiProviders = ref([ 
  { id: '1', name: '我的 DeepSeek', provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKey: '', modelName: 'deepseek-chat' }, 
  { id: '2', name: '本地 Ollama', provider: 'ollama', baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', modelName: 'qwen2:7b' } 
]);
const activeAiId = ref('1');
const currentEditAi = ref<any>(null); 
const isAiSaved = ref(false); 
const isTesting = ref(false); 
const testResult = ref<{ status: 'idle' | 'success' | 'error', message: string }>({ status: 'idle', message: '' });

// ============================================================================
// 4. 监听器与计算属性 (Watchers & Computed)
// ============================================================================
// 实时应用主题配色
const currentThemeStyle = computed(() => {
  if (activeThemeId.value === 'custom') return customThemeVars.value;
  return themeRegistry.find(t => t.id === activeThemeId.value)?.vars || themeRegistry[0].vars;
});

// AI 编辑器：服务商联动默认参数
watch(() => currentEditAi.value?.provider, (newProvider) => {
  if (!currentEditAi.value) return;
  if (newProvider === 'openai') { currentEditAi.value.baseUrl = 'https://api.openai.com/v1'; currentEditAi.value.modelName = 'gpt-3.5-turbo'; }
  if (newProvider === 'anthropic') { currentEditAi.value.baseUrl = 'https://api.anthropic.com'; currentEditAi.value.modelName = 'claude-3-haiku-20240307'; }
  if (newProvider === 'deepseek') { currentEditAi.value.baseUrl = 'https://api.deepseek.com/v1'; currentEditAi.value.modelName = 'deepseek-chat'; }
  if (newProvider === 'ollama') { currentEditAi.value.baseUrl = 'http://localhost:11434/v1'; currentEditAi.value.modelName = 'qwen2:7b'; }
});



// ============================================================================
// 5. 核心业务逻辑 (Business Logic)
// ============================================================================

// 🌟 1. 异步加载主题
const loadTheme = async () => {
  const savedThemeId = await ConfigStore.get<string>('yuki_theme', 'dark');
  if (themeRegistry.find(t => t.id === savedThemeId)) activeThemeId.value = savedThemeId;
  
  const savedCustom = await ConfigStore.get<any>('yuki_theme_custom', null);
  if (savedCustom) customThemeVars.value = savedCustom;
};

// 🌟 2. 异步切换主题并存入硬盘
const switchTheme = async (id: string) => { 
  activeThemeId.value = id; 
  await ConfigStore.set('yuki_theme', id); 
};

// 🌟 3. 异步保存自定义配色
const saveCustomTheme = async () => { 
  await ConfigStore.set('yuki_theme_custom', customThemeVars.value); 
};

// --- 📦 模型库与 ZIP 解压逻辑 ---
const loadModels = () => {
  const savedModels = localStorage.getItem('yuki_models');
  if (savedModels) {
    modelRegistry.value = JSON.parse(savedModels);
    modelRegistry.value.forEach(m => {
      if (m.id === 'default_1') m.preview = '/ele_a0/preview.png'; 
      else if (!m.preview) m.preview = MOCK_AVATAR_SVG;
    });
  } else {
    modelRegistry.value = []; // 首次打开为空数组
  }
  const savedId = localStorage.getItem('yuki_active_id');
  if (savedId) activeModelId.value = savedId;
};

// ==========================================
// 🌟 修复：定义打开外部链接的函数
// ==========================================
const openGithub = async () => {
  try {
    // 使用 Tauri 的 shell 插件打开浏览器
    await openBrowser('https://github.com/FGXYX');
  } catch (err) {
    console.error("无法打开浏览器:", err);
    // 保底方案：如果插件没装，尝试使用 window.open
    window.open('https://github.com/FGXYX', '_blank');
  }
};

const saveModelsConfig = async () => {
  localStorage.setItem('yuki_models', JSON.stringify(modelRegistry.value));
  localStorage.setItem('yuki_active_id', activeModelId.value);
  await emit('yuki-model-changed', activeModelId.value); // 通知主窗口换装
};

const selectModel = async (id: string) => {
  activeModelId.value = id;
  await saveModelsConfig();
};

const deleteModel = async (id: string, event: Event) => {
  event.stopPropagation();
  if (confirm('确定要从列表中彻底移除这个模型吗？')) {
    modelRegistry.value = modelRegistry.value.filter(m => m.id !== id);
    if (activeModelId.value === id) {
      if (modelRegistry.value.length > 0) await selectModel(modelRegistry.value[0].id);
      else { activeModelId.value = ''; await saveModelsConfig(); }
    } else {
      await saveModelsConfig();
    }
  }
};

const triggerFileInput = () => { if (!isUploading.value && fileInput.value) fileInput.value.click(); };

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processUploadSimulation(target.files[0]);
    target.value = ''; 
  }
};

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.toLowerCase().endsWith('.zip')) processUploadSimulation(file);
    else alert('请上传 .zip 格式的 Live2D 模型压缩包！');
  }
};

// 核心解压与离线截帧引擎
const processUploadSimulation = async (file: File) => {
  try {
    isUploading.value = true;
    uploadProgress.value = 5;
    uploadStatusText.value = `正在解析压缩包: [${file.name}]...`;

    const zip = await JSZip.loadAsync(file);
    const modelDirName = file.name.replace('.zip', '');
    const appDataDirPath = await appDataDir(); 
    
    const modelBaseDirRelative = `models/${modelDirName}`;

    uploadProgress.value = 20;
    uploadStatusText.value = '正在提取并写入本地磁盘...';

    if (!(await exists('models', { baseDir: BaseDirectory.AppData }))) await mkdir('models', { baseDir: BaseDirectory.AppData, recursive: true });
    if (!(await exists(modelBaseDirRelative, { baseDir: BaseDirectory.AppData }))) await mkdir(modelBaseDirRelative, { baseDir: BaseDirectory.AppData, recursive: true });

    const files = Object.keys(zip.files);
    let processed = 0;
    let model3JsonRelativePath = '';

    for (const relativePath of files) {
      const zipEntry = zip.files[relativePath];
      const fullLocalPathRelative = `${modelBaseDirRelative}/${relativePath}`;

      if (zipEntry.dir) {
        await mkdir(fullLocalPathRelative, { baseDir: BaseDirectory.AppData, recursive: true });
      } else {
        const pathParts = relativePath.split('/');
        pathParts.pop(); 
        if (pathParts.length > 0) {
           const parentDirRelative = `${modelBaseDirRelative}/${pathParts.join('/')}`;
           if (!(await exists(parentDirRelative, { baseDir: BaseDirectory.AppData }))) {
             await mkdir(parentDirRelative, { baseDir: BaseDirectory.AppData, recursive: true });
           }
        }
        const content = await zipEntry.async('uint8array');
        await writeFile(fullLocalPathRelative, content, { baseDir: BaseDirectory.AppData });

        if (relativePath.toLowerCase().endsWith('.model3.json')) model3JsonRelativePath = relativePath;
      }
      processed++;
      uploadProgress.value = 20 + Math.floor((processed / files.length) * 50); 
    }

    if (!model3JsonRelativePath) throw new Error('未找到 .model3.json 配置文件！');

    uploadProgress.value = 75;
    uploadStatusText.value = '注册引擎协议...';

    const absoluteJsonPath = await join(appDataDirPath, 'models', modelDirName, model3JsonRelativePath);
    let engineUrl = convertFileSrc(absoluteJsonPath);
    engineUrl = engineUrl.replace(/%5C/ig, '/').replace(/%2F/ig, '/').replace(/\\/g, '/');

    uploadProgress.value = 85;
    uploadStatusText.value = '启动离线渲染器，正在生成真实立绘封面...';
    
    let generatedPreviewBase64 = MOCK_AVATAR_SVG; 
    try {
      if (hiddenCanvasRef.value) {
        const tempManager = new Live2DManager(hiddenCanvasRef.value);
        await tempManager.loadModel(engineUrl, 0.26, 20, -10); 
        await new Promise(resolve => setTimeout(resolve, 800)); 
        generatedPreviewBase64 = hiddenCanvasRef.value.toDataURL('image/png');
        tempManager.destroyApp(); 
      }
    } catch (renderErr) { console.warn('离线渲染截帧失败，将使用默认剪影:', renderErr); }

    uploadProgress.value = 100;
    uploadStatusText.value = '入库成功！';

    const newModel = {
      id: 'custom_' + Date.now(),
      name: modelDirName,
      path: engineUrl, 
      defScale: 0.15, 
      defX: -15, 
      defY: -10,
      preview: generatedPreviewBase64 
    };

    modelRegistry.value.push(newModel);
    await saveModelsConfig(); 
    setTimeout(() => { isUploading.value = false; }, 1500);

  } catch (err: any) {
    console.error('模型解压失败:', err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    alert('模型导入失败: \n' + errorMsg);
    isUploading.value = false;
  }
};

// --- 🧠 人格设定逻辑 ---
const loadPersona = async () => { 
  const saved = await ConfigStore.get<any>('yuki_persona', null); 
  if (saved) personaConfig.value = saved; 
};
const savePersona = async () => { 
  await ConfigStore.set('yuki_persona', personaConfig.value); 
  isPersonaSaved.value = true; 
  setTimeout(() => isPersonaSaved.value = false, 2000); 
};

// --- 🤖 AI 引擎管理逻辑 ---
const loadAiProviders = async () => { 
  const savedList = await ConfigStore.get<any[]>('yuki_ai_list', []); 
  if (savedList && savedList.length > 0) aiProviders.value = savedList; 
  
  const savedActive = await ConfigStore.get<string>('yuki_active_ai', ''); 
  if (savedActive) activeAiId.value = savedActive; 
};
const saveAiProviders = async () => { 
  await ConfigStore.set('yuki_ai_list', aiProviders.value); 
  await ConfigStore.set('yuki_active_ai', activeAiId.value); 
  isAiSaved.value = true; 
  setTimeout(() => isAiSaved.value = false, 2000); 
};

const createNewAi = () => { currentEditAi.value = { id: 'ai_' + Date.now(), name: '新建 AI 引擎', provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: '', modelName: '' }; };
const editAi = (ai: any) => { currentEditAi.value = { ...ai }; testResult.value = { status: 'idle', message: '' }; };

const deleteAi = async (id: string) => { 
  if (confirm('确定要删除这个 AI 引擎配置吗？')) {
    if (aiProviders.value.length <= 1) { alert('至少要保留一个 AI 配置哦！'); return; }
    aiProviders.value = aiProviders.value.filter(a => a.id !== id); 
    if (activeAiId.value === id) activeAiId.value = aiProviders.value[0].id; 
    await saveAiProviders(); 
  }
};

const confirmSaveEditAi = async () => { 
  const index = aiProviders.value.findIndex(a => a.id === currentEditAi.value.id); 
  if (index >= 0) aiProviders.value[index] = { ...currentEditAi.value }; 
  else { aiProviders.value.push({ ...currentEditAi.value }); activeAiId.value = currentEditAi.value.id; } 
  await saveAiProviders(); 
  currentEditAi.value = null; 
};


const testAiConnection = async () => {
  if (!currentEditAi.value || !currentEditAi.value.baseUrl) { testResult.value = { status: 'error', message: '请先填写 Base URL' }; return; }
  isTesting.value = true; testResult.value = { status: 'idle', message: '' };
  try {
    let endpoint = currentEditAi.value.baseUrl;
    if (!endpoint.endsWith('/chat/completions')) endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
    const response = await fetch(endpoint, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentEditAi.value.apiKey}` }, 
      body: JSON.stringify({ model: currentEditAi.value.modelName, messages: [{ role: 'user', content: '测试连接，请回复：收到' }], max_tokens: 10 }) 
    });
    if (response.ok) testResult.value = { status: 'success', message: '连通测试成功！API 可用。' };
    else { 
      const errData = await response.json().catch(() => ({})); 
      testResult.value = { status: 'error', message: `失败: [${response.status}] ${errData.error?.message || response.statusText}` }; 
    }
  } catch (error: any) { testResult.value = { status: 'error', message: `网络请求异常: ${error.message}` }; } 
  finally { isTesting.value = false; }
};

// ==========================================
// 🎙️ GPT-SoVITS 多角色语音库管理
// ==========================================
import { useTTS } from '@/composables/useTTS';

const { isTtsEnabled, ttsList, activeTtsId, loadTtsConfig, saveTtsConfig } = useTTS();

const editingTtsId = ref('');
const isTtsTesting = ref(false);
const isSwitchingModel = ref(false);

const editingTts = computed(() => ttsList.value.find(t => t.id === editingTtsId.value));

const editTts = (id: string) => { editingTtsId.value = id; };

const setActiveTts = async (id: string) => {
  activeTtsId.value = id;
  await saveTtsConfig();
};

const addNewTts = async () => {
  const newId = 'tts_' + Date.now();
  ttsList.value.push({
    id: newId, 
    name: '新语音配置', 
    engineType: 'gpt-sovits', 
    apiUrl: 'http://127.0.0.1:9880',
    apiKey: '',
    voiceId: '',
    gptWeightPath: '', sovitsWeightPath: '', refAudioPath: '',
    promptText: '', promptLang: 'zh', textLang: 'zh'
  });
  editingTtsId.value = newId;
  await saveTtsConfig();
};

const deleteTts = async (id: string) => {
  if (ttsList.value.length <= 1) { alert('至少要保留一个语音配置哦！'); return; }
  if (confirm('确定要删除这个语音配置吗？')) {
    ttsList.value = ttsList.value.filter(t => t.id !== id);
    if (activeTtsId.value === id) activeTtsId.value = ttsList.value[0].id;
    if (editingTtsId.value === id) editingTtsId.value = ttsList.value[0].id;
    await saveTtsConfig();
  }
};

const switchTTSModels = async () => {
  const config = editingTts.value;
  if (!config || !config.apiUrl || (!config.gptWeightPath && !config.sovitsWeightPath)) { alert("请先填写 API 地址和至少一个模型路径！"); return; }
  isSwitchingModel.value = true;
  try {
    const baseUrl = config.apiUrl.replace(/\/$/, '');
    if (config.gptWeightPath) {
      const gptRes = await fetch(`${baseUrl}/set_gpt_weights?weights_path=${encodeURIComponent(config.gptWeightPath)}`);
      if (!gptRes.ok) throw new Error("GPT 模型切换失败");
    }
    if (config.sovitsWeightPath) {
      const sovitsRes = await fetch(`${baseUrl}/set_sovits_weights?weights_path=${encodeURIComponent(config.sovitsWeightPath)}`);
      if (!sovitsRes.ok) throw new Error("SoVITS 模型切换失败");
    }
    alert("🎉 模型热切换成功！现在可以使用新声线了。");
  } catch (err: any) {
    alert("切换模型失败: " + err.message);
  } finally {
    isSwitchingModel.value = false;
  }
};

const testTTS = async () => {
  const config = editingTts.value;
  if (!config || !config.apiUrl || !config.refAudioPath) { alert("请先填写 API 地址和参考音频路径哦！"); return; }
  isTtsTesting.value = true;
  try {
    const targetText = "主人你好呀！我是 Yuki，很高兴能拥有自己的声音！";
    const baseUrl = config.apiUrl.replace(/\/$/, '');
    const url = new URL(`${baseUrl}/tts`);
    url.searchParams.append('text', targetText);
    url.searchParams.append('text_lang', config.textLang);
    url.searchParams.append('prompt_text', config.promptText);
    url.searchParams.append('prompt_lang', config.promptLang);
    url.searchParams.append('ref_audio_path', config.refAudioPath);

    const audio = new Audio(url.toString());
    await audio.play();
    audio.onended = () => { isTtsTesting.value = false; };
    audio.onerror = () => { alert("连接或播放失败！"); isTtsTesting.value = false; };
  } catch (err: any) { alert("请求异常: " + err.message); isTtsTesting.value = false; }
};

// ============================================================================
// 🎭 情绪-动作联动管理 (Emotion-Motion Link)
// ============================================================================
import { useLive2D } from '@/composables/useLive2D';


const { activeModel } = useLive2D();


// 🌟 这里就是缺失的变量！本地显示用的状态（跨窗口同步）
const localDisplayMotions = ref<any>({});
const localDisplayAliases = ref<any>({});
const isFetchingMotions = ref(false);
// 👇 加上这一行：用于记录当前展开的是哪个情绪面板（默认展开 happy）
const expandedEmotion = ref<string | null>('happy');

// 情绪联动的本地状态表
const emotionBindings = ref<Record<string, string[]>>({
  happy: [], sad: [], angry: [], shy: [], normal: []
});

// 从数据库加载专属当前模型的配置
const loadEmotionBindings = async () => {
  if (!activeModel.value?.id) return;
  const key = `yuki_model_setting_${activeModel.value.id}`;
  const saved = await ConfigStore.get<any>(key, {});
  
  if (saved.emotionMotions) {
    emotionBindings.value = { happy: [], sad: [], angry: [], shy: [], normal: [], ...saved.emotionMotions };
  } else {
    emotionBindings.value = { happy: [], sad: [], angry: [], shy: [], normal: [] };
  }
};

// 保存到数据库
const saveEmotionBindings = async () => {
  if (!activeModel.value?.id) return;
  const key = `yuki_model_setting_${activeModel.value.id}`;
  const existing = await ConfigStore.get<any>(key, {});
  await ConfigStore.set(key, { ...existing, emotionMotions: emotionBindings.value });
};

// 勾选/取消勾选具体动作
const toggleMotion = (emo: string, motionName: string) => {
  const list = emotionBindings.value[emo] || [];
  if (list.includes(motionName)) {
    emotionBindings.value[emo] = list.filter(m => m !== motionName);
  } else {
    emotionBindings.value[emo].push(motionName);
  }
  saveEmotionBindings();
};

// 🌟 跨窗口请求动作列表的方法
const fetchMotionsFromMain = async () => {
  isFetchingMotions.value = true;
  const unlisten = await listen('reply-current-motions', (event: any) => {
    localDisplayMotions.value = event.payload.motions || {};
    localDisplayAliases.value = event.payload.aliases || {};
    isFetchingMotions.value = false;
    unlisten(); // 收到后光速下班
  });
  
  await emit('request-current-motions');
  
  // 兜底：如果2秒还没收到，解除加载状态
  setTimeout(() => {
    if (isFetchingMotions.value) {
       isFetchingMotions.value = false;
    }
  }, 2000);
};

// 监听侧边栏切换，自动拉取最新配置和动作列表
watch(activeSettingsTab, (newTab) => {
  if (newTab === 'emotionLink') {
    loadEmotionBindings();
    fetchMotionsFromMain();
  }
}, { immediate: true });

// ============================================================================
// 6. 生命周期钩子 (Lifecycle Hooks)
// ============================================================================
onMounted(async () => { 
  loadTheme();
  loadAiProviders();
  loadPersona();
  loadModels();
  
  await loadTtsConfig(); 
  
  if (!editingTtsId.value && ttsList.value.length > 0) {
    editingTtsId.value = activeTtsId.value || ttsList.value[0].id;
  }
  
  setTimeout(() => {
    getCurrentWindow().show();
  }, 150); 
});
</script>

<template>
  <div class="os-settings-container" :style="currentThemeStyle">
    
    <div class="settings-sidebar">
      <div class="sidebar-title">设置中心</div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'general' }]" @click="activeSettingsTab = 'general'">
        <span class="sb-icon" v-html="UI_GEAR"></span> 常规设置
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'models' }]" @click="activeSettingsTab = 'models'">
        <span class="sb-icon" v-html="UI_PACKAGE"></span> 模型管理
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'persona' }]" @click="activeSettingsTab = 'persona'">
        <span class="sb-icon" v-html="UI_USER"></span> 人格设定
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'theme' }]" @click="activeSettingsTab = 'theme'">
        <span class="sb-icon" v-html="UI_PALETTE"></span> 个性化外观
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'ai' }]" @click="activeSettingsTab = 'ai'">
        <span class="sb-icon" v-html="UI_CPU"></span> AI 引擎管理
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'audio' }]" @click="activeSettingsTab = 'audio'">
        <span class="sb-icon" v-html="UI_MIC"></span> 语音与合成
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'emotionLink' }]" @click="activeSettingsTab = 'emotionLink'">
        <span class="sb-icon"></span> 情绪动作联动
      </div>
      <div :class="['sidebar-item', { active: activeSettingsTab === 'about' }]" @click="activeSettingsTab = 'about'">
        <span class="sb-icon" v-html="UI_INFO"></span> 关于 Yuki
      </div>
    </div>

    <canvas ref="hiddenCanvasRef" style="position: absolute; width: 400px; height: 600px; opacity: 0; pointer-events: none; z-index: -999;"></canvas>
    
    <div class="settings-content">
      <div class="settings-page-inner">
        
        <div v-if="activeSettingsTab === 'general'" class="settings-page">
          <h2>常规设置</h2>
          <p class="desc">配置桌宠基础功能与系统行为。</p>
          <div class="config-item">
            <span>施工中</span>
            
          </div>
        </div>

        <div v-if="activeSettingsTab === 'persona'" class="settings-page">
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

        <div v-if="activeSettingsTab === 'theme'" class="settings-page">
          <h2>个性化外观</h2>
          <p class="desc">挑选或自定义最适合你的界面色彩方案。</p>
          <div class="theme-grid">
            <div v-for="theme in themeRegistry" :key="theme.id" :class="['theme-card', { 'is-active': activeThemeId === theme.id }]" @click="switchTheme(theme.id)">
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

        <div v-if="activeSettingsTab === 'models'" class="settings-page">
          <div class="page-header-flex">
            <div>
              <h2>Live2D 模型库</h2>
              <p class="desc">管理你的桌宠外观。支持拖拽导入 ZIP 压缩包，系统将自动提取模型数据并生成预览图。</p>
            </div>
          </div>

          <div class="upload-dropzone" :class="{ 'is-dragover': isDragOver, 'is-uploading': isUploading }" @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false" @drop.prevent="handleDrop" @click="triggerFileInput">
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
            <div v-for="mod in modelRegistry" :key="mod.id" class="model-lib-card" :class="{ 'is-active': activeModelId === mod.id }" @click="selectModel(mod.id)">
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

        <div v-if="activeSettingsTab === 'ai'" class="settings-page">
          <div v-if="!currentEditAi" class="ai-list-view">
            <div class="page-header-flex">
              <div>
                <h2>AI 引擎管理</h2>
                <p class="desc">添加和管理各个大语言模型服务商（支持 OpenAI、DeepSeek 等）。</p>
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
                  <button class="icon-action-btn" title="编辑配置" @click.stop="editAi(ai)" v-html="UI_EDIT"></button>
                  <button v-if="aiProviders.length > 1" class="icon-action-btn delete" title="删除引擎" @click.stop="deleteAi(ai.id)" v-html="UI_TRASH"></button>
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
        
        <div class="settings-page" v-if="activeSettingsTab === 'audio'">
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
            <div v-for="tts in ttsList" :key="tts.id" :class="['engine-item', { 'is-active': activeTtsId === tts.id, 'is-editing': editingTtsId === tts.id }]" @click="editTts(tts.id)">
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

          <div v-if="editingTts" class="edit-form-card" :style="{ opacity: isTtsEnabled ? 1 : 0.4, pointerEvents: isTtsEnabled ? 'auto' : 'none', transition: 'all 0.3s' }">
            
            <div class="page-header-flex" style="gap: 16px;">
              <div class="input-field" style="flex: 1;">
                <label>配置名称标识</label>
                <input type="text" v-model="editingTts.name" placeholder="例如: 傲娇模式 / 微软晓晓" @blur="saveTtsConfig">
              </div>
              <div class="input-field" style="flex: 1;">
                <label>引擎核心类型</label>
                <select v-model="editingTts.engineType" @change="saveTtsConfig" class="theme-select">
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
                <button class="test-btn" style="background: rgba(79, 172, 254, 0.1); color: var(--primary); border-color: var(--primary);" @click="switchTTSModels" :disabled="isSwitchingModel">
                  <span class="flex-center-btn"><span class="icon-wrap" v-html="isSwitchingModel ? '🔄' : '🔌'"></span>应用 / 切换模型权重</span>
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
                <textarea class="large-textarea" style="height: 60px;" v-model="editingTts.promptText" placeholder="参考音频里说的话..." @blur="saveTtsConfig"></textarea>
              </div>
              <div class="page-header-flex" style="gap: 16px; margin-bottom: 0;">
                <div class="input-field" style="flex: 1;"><label>参考音频语种</label><select v-model="editingTts.promptLang" @change="saveTtsConfig"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option></select></div>
                <div class="input-field" style="flex: 1;"><label>合成语种</label><select v-model="editingTts.textLang" @change="saveTtsConfig"><option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option><option value="all_zh">中英混合</option><option value="all_ja">日英混合</option></select></div>
              </div>

              <div class="divider-line" style="margin: 24px 0;"></div>

              <div class="page-header-flex" style="margin-bottom: 8px;">
                <h3 style="font-size: 14px; color: var(--primary); margin: 0;">🎭 特殊情绪差分 (Zero-Shot 情感映射)</h3>
              </div>
              <p style="font-size: 12px; color: #888; margin-top: 0; margin-bottom: 16px; line-height: 1.5;">
                * 当 AI 回复开头包含 [happy] 等情绪标签时，将自动切换至下方音频。<br>
                * 若留空，则默认使用上方的基础参考音频。
              </p>

              <div class="emotion-grid">
                <div class="emotion-card happy">
                  <label class="emo-title">[happy] 开心 / 兴奋</label>
                  <input type="text" v-model="editingTts.happyAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig" class="emo-input">
                  <input type="text" v-model="editingTts.happyPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig" class="emo-input">
                </div>
                <div class="emotion-card sad">
                  <label class="emo-title">[sad] 悲伤 / 低落</label>
                  <input type="text" v-model="editingTts.sadAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig" class="emo-input">
                  <input type="text" v-model="editingTts.sadPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig" class="emo-input">
                </div>
                <div class="emotion-card angry">
                  <label class="emo-title">[angry] 生气 / 傲娇</label>
                  <input type="text" v-model="editingTts.angryAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig" class="emo-input">
                  <input type="text" v-model="editingTts.angryPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig" class="emo-input">
                </div>
                <div class="emotion-card shy">
                  <label class="emo-title">[shy] 害羞 / 气声</label>
                  <input type="text" v-model="editingTts.shyAudioPath" placeholder="音频绝对路径..." @blur="saveTtsConfig" class="emo-input">
                  <input type="text" v-model="editingTts.shyPromptText" placeholder="音频对应的文字..." @blur="saveTtsConfig" class="emo-input">
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
              <p style="font-size: 12px; color: #888; margin-top: -6px;">* 提示：标准协议通常使用 POST 请求 /audio/speech 节点。</p>
            </template>

            <div class="test-section" style="margin-top: 24px;">
              <button class="test-btn" @click="testTTS" :disabled="isTtsTesting">
                <span class="flex-center-btn">
                  <span class="icon-wrap" v-html="isTtsTesting ? '🔊' : '▶'"></span>
                  {{ isTtsTesting ? '正在请求并播放...' : '单独测试此声音' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeSettingsTab === 'emotionLink'" class="settings-page">
          <div class="page-header-flex">
            <div>
              <h2>🎭 情绪动作联动 (模型专属)</h2>
              <p class="desc">为当前模型 <strong style="color: var(--primary);">[{{ activeModel?.name }}]</strong> 配置情绪触发动作。勾选多个将在触发时随机播放。</p>
            </div>
            <button class="primary-btn outline flex-center-btn" @click="fetchMotionsFromMain" :disabled="isFetchingMotions">
              <span class="icon-wrap" style="margin-right: 6px;">{{ isFetchingMotions ? '⏳' : '🔄' }}</span> 
              {{ isFetchingMotions ? '获取中...' : '同步动作列表' }}
            </button>
          </div>

          <div v-if="Object.keys(localDisplayMotions).length === 0" style="text-align: center; padding: 40px; color: var(--text-muted); background: var(--active-bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 20px;">
            <div style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;">📦</div>
            <p>动作列表为空。请点击右上角的 <b>“同步动作列表”</b> 从主窗口拉取数据。</p>
          </div>

          <div class="emotion-link-container" v-else>
            <div v-for="(motions, emo) in emotionBindings" :key="emo" :class="['emo-group-card', { 'is-expanded': expandedEmotion === emo }]">
              
              <div class="emo-group-header" @click="expandedEmotion = expandedEmotion === emo ? null : emo">
                <div class="header-left">
                  <span class="expand-arrow">{{ expandedEmotion === emo ? '▼' : '▶' }}</span>
                  <span :class="['emo-tag', emo]">[{{ emo.toUpperCase() }}]</span>
                </div>
                <span class="count-badge">已选 {{ motions?.length || 0 }} 个动作</span>
              </div>

              <Transition name="slide-fade">
                <div class="motion-expand-area" v-show="expandedEmotion === emo">
                  <template v-for="(groupMotions, groupName) in localDisplayMotions" :key="groupName">
                    <div class="motion-group-title">📁 {{ groupName }} 动作组</div>
                    <div class="motion-selection-grid">
                      <div v-for="(motionName, index) in groupMotions" :key="index" 
                           :class="['motion-checkbox-item', { checked: motions?.includes(motionName) }]"
                           @click="toggleMotion(emo, motionName)">
                        <div class="checkbox-custom"></div>
                        <span class="motion-name-text" :title="motionName">{{ localDisplayAliases[motionName] || motionName }}</span>
                      </div>
                    </div>
                  </template>
                </div>
              </Transition>
              
            </div>
          </div>
        </div>

        <div v-if="activeSettingsTab === 'about'" class="settings-page about-page">
          <div class="about-header">
            <div class="about-logo">❄️</div>
            <h2 class="about-title">Yuki</h2>
            <span class="about-version">Version 1.0.1 (Beta)</span>
          </div>

          <p class="about-desc">
            基于 Tauri 2.0 与大语言模型构建的次世代跨平台 AI 桌面精灵。<br>
            深度集成了 MCP 协议与 Agent 工作流，为您提供全能的数字生命体验。
          </p>

          <div class="about-features-grid">
            <div class="feature-card">
              <div class="feature-icon">🚀</div>
              <h4>Tauri + Rust</h4>
              <p>底层采用 Rust 构建，进程级隔离通信，极致轻量，极低内存占用。</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🔌</div>
              <h4>MCP 协议架构</h4>
              <p>支持万物互联的模型上下文协议，无缝接入本地系统与云端外部 API。</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🧠</div>
              <h4>Agent Skills (SOP)</h4>
              <p>动态工作流指令注入，让大模型从“聊天机器”进化为高阶“数字员工”。</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🎭</div>
              <h4>多模态情感交互</h4>
              <p>深度融合 Live2D 拟真模型与 GPT-SoVITS 零样本情感语音合成机制。</p>
            </div>
          </div>

          <div class="divider-line"></div>

          <div class="about-footer">
            <p>Developed with ❤️ by Master</p>
            <div class="about-links">
              
              <button class="primary-btn outline flex-center-btn" @click="openGithub">
                <span class="icon-wrap">⭐</span> GitHub 仓库
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================================
   0. 全局布局结构 (Global Layout & Sidebar)
   ============================================================================ */
.os-settings-container { 
  display: flex; 
  width: 100vw; 
  height: 100vh; 
  background-color: var(--bg); 
  color: var(--text); 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
  user-select: auto; 
  transition: background-color 0.3s ease, color 0.3s ease; 
}

/* 侧边栏导航 */
.settings-sidebar { 
  width: 220px; 
  background-color: var(--sidebar-bg); 
  border-right: 1px solid var(--border); 
  display: flex; flex-direction: column; 
  padding: 30px 0; 
  transition: background-color 0.3s ease, border-color 0.3s ease; 
  flex-shrink: 0;
}
.sidebar-title { padding: 0 24px 20px; font-size: 18px; font-weight: 600; color: var(--text); letter-spacing: 1px; }
.sidebar-item { 
  padding: 14px 24px; cursor: pointer; color: var(--text-muted); font-size: 14px; 
  transition: background 0.2s, color 0.2s; display: flex; align-items: center; gap: 12px; 
}
.sb-icon svg { width: 20px; height: 20px; display: block; } 
.sidebar-item:hover { background-color: var(--hover); color: var(--text); }
.sidebar-item.active { 
  background-color: var(--active-bg); color: var(--primary); 
  border-left: 3px solid var(--primary); font-weight: 500;
}

/* 主内容区 */
.settings-content { 
  flex: 1; overflow-y: auto; background-color: var(--bg); 
  transition: background-color 0.3s ease; 
  display: flex; justify-content: center; padding: 40px;
}
.settings-page-inner { width: 100%; max-width: 760px; }
.settings-page h2 { margin-top: 0; font-size: 22px; color: var(--text); margin-bottom: 8px; }
.settings-page h3 { font-size: 16px; margin: 0 0 16px 0; color: var(--text); }
.settings-page .desc { color: var(--text-muted); font-size: 13px; margin-bottom: 24px; }
.divider-line { height: 1px; background-color: var(--border); margin: 40px 0; }
.page-header-flex { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: nowrap; gap: 20px; margin-bottom: 20px;}

/* ============================================================================
   1. 基础表单与组件 (Forms, Inputs & Switches)
   ============================================================================ */
/* 通用配置项卡片 */
.config-item { 
  display: flex; justify-content: space-between; align-items: center; 
  background: var(--active-bg); padding: 16px 20px; 
  border-radius: 12px; border: 1px solid var(--border); margin-bottom: 16px; 
  transition: background-color 0.3s ease, border-color 0.3s ease; 
}

/* 输入框 */
.input-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.input-field label { font-size: 13px; color: var(--text-muted); font-weight: 500; }
.input-field input:not([type="radio"]), 
.input-field select, 
.input-field textarea { 
  background: var(--input-bg); border: 1px solid var(--border); color: var(--text); 
  padding: 12px 16px; border-radius: 8px; font-size: 14px; outline: none; 
  transition: border-color 0.2s, background-color 0.3s ease, color 0.3s ease; 
  font-family: inherit; 
}
.input-field input:focus, 
.input-field select:focus, 
.input-field textarea:focus { 
  border-color: var(--primary); 
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent); 
}
.large-textarea { height: 120px; resize: none; line-height: 1.6; } 

/* 标签与滑块 */
.flex-label { display: flex; justify-content: space-between; align-items: center; }
.val-badge { 
  background: var(--active-bg); color: var(--primary); padding: 2px 8px; 
  border-radius: 12px; font-size: 12px; border: 1px solid var(--border); font-weight: bold;
}
.range-marks { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-top: 4px; }
input[type=range].theme-slider { 
  -webkit-appearance: none; appearance: none; width: 100%; 
  background: var(--active-bg); height: 6px; border-radius: 3px; 
  outline: none; border: 1px solid var(--border); padding: 0;
}
input[type=range].theme-slider::-webkit-slider-thumb { 
  -webkit-appearance: none; appearance: none; width: 18px; height: 18px; 
  border-radius: 50%; background: var(--primary); cursor: pointer; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

/* 苹果风 Switch 开关 */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { 
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; 
  background-color: var(--border); transition: .4s; border-radius: 24px; 
}
.slider:before { 
  position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; 
  background-color: white; transition: .4s; border-radius: 50%; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
input:checked + .slider { background-color: var(--primary); }
input:checked + .slider:before { transform: translateX(20px); }

/* ============================================================================
   2. 按钮组件 (Buttons)
   ============================================================================ */
/* 主按钮 */
.primary-btn { 
  background: var(--primary); color: #fff; border: none; 
  padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; 
  cursor: pointer; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); 
  white-space: nowrap; 
  display: inline-flex; align-items: center; justify-content: center; line-height: 1; 
}
.flex-center-btn { gap: 6px; }
.btn-icon svg { width: 16px; height: 16px; display: block; }
.btn-icon:empty { display: none; } /* 图标为空时自动折叠防止挤压 */
.primary-btn:hover { opacity: 0.9; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.primary-btn:active { transform: scale(0.96); }
.primary-btn.outline { background: transparent; border: 1px solid var(--primary); color: var(--primary); }
.primary-btn.outline:hover { background: var(--active-bg); }

/* 返回按钮 */
.header-with-back { display: flex; align-items: center; gap: 12px; }
.header-with-back h2 { margin: 0 !important; }
.back-btn {
  background: transparent; border: none; color: var(--text-muted); 
  padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; 
  cursor: pointer; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.back-btn:hover { background: var(--hover); color: var(--text); transform: translateX(-4px); }
.back-btn:active { transform: scale(0.95) translateX(-4px); }

/* 图标操作按钮 (编辑/删除) */
.icon-action-btn { 
  background: rgba(128, 128, 128, 0.15); border: 1px solid rgba(128, 128, 128, 0.2); 
  color: var(--text); cursor: pointer; padding: 8px; border-radius: 8px; 
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); 
  display: flex; align-items: center; justify-content: center; 
}
.icon-action-btn svg { width: 30px; height: 30px; } 
.icon-action-btn:hover { background: var(--border); transform: scale(1.1); }
.icon-action-btn.delete { color: #ef4444; background: color-mix(in srgb, #ef4444 10%, transparent); border-color: color-mix(in srgb, #ef4444 20%, transparent); }
.icon-action-btn.delete:hover { background: color-mix(in srgb, #ef4444 20%, transparent); color: #dc2626; transform: scale(1.1); }

/* ============================================================================
   3. AI 引擎管理 (AI Providers)
   ============================================================================ */
.provider-list { display: flex; flex-direction: column; gap: 12px; }
.provider-card { 
  display: flex; justify-content: space-between; align-items: center; 
  background: var(--active-bg); padding: 16px 20px; border-radius: 12px; 
  border: 1px solid var(--border); cursor: pointer; transition: all 0.2s ease; 
}
.provider-card:hover { border-color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.provider-card.active { border-left: 4px solid var(--primary); background: var(--hover); }

.provider-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.p-header { display: flex; align-items: center; gap: 12px; }
.p-name { font-size: 16px; font-weight: 600; color: var(--text); }
.p-meta { font-size: 13px; color: var(--text-muted); }
.active-badge { 
  font-size: 11px; background: color-mix(in srgb, #10b981 15%, transparent); 
  color: #10b981; padding: 2px 8px; border-radius: 10px; border: 1px solid #10b981; font-weight: bold;
}
.provider-actions { display: flex; gap: 10px; }

/* AI 编辑表单 */
.edit-form-card { 
  background: var(--sidebar-bg); padding: 24px; 
  border-radius: 12px; border: 1px solid var(--border); margin-top: 20px; 
}

/* 测试连接区 */
.test-section { 
  display: flex; flex-direction: column; gap: 12px; margin-top: 10px; 
  padding-top: 16px; border-top: 1px dashed var(--border); 
}
.test-btn { 
  background: var(--active-bg); color: var(--text); border: 1px solid var(--border); 
  padding: 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; 
  font-size: 13px; font-weight: 500;
}
.test-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.test-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.test-result { padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; word-break: break-all; }
.test-result.success { background: color-mix(in srgb, #10b981 15%, transparent); border: 1px solid #10b981; color: #10b981; }
.test-result.error { background: color-mix(in srgb, #ef4444 15%, transparent); border: 1px solid #ef4444; color: #ef4444; }

/* ============================================================================
   4. 主题配色系统 (Themes & Color Pickers)
   ============================================================================ */
.theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 16px; margin-bottom: 30px; }
.theme-card { 
  display: flex; flex-direction: column; align-items: center; gap: 10px; 
  padding: 16px; background: var(--sidebar-bg); border: 2px solid transparent; 
  border-radius: 12px; cursor: pointer; transition: all 0.2s ease; 
}
.theme-card:hover { transform: translateY(-2px); background: var(--hover); }
.theme-card.is-active { border-color: var(--primary); background: var(--active-bg); }
.theme-preview { width: 36px; height: 36px; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.theme-name { font-size: 13px; font-weight: 500; color: var(--text); }

/* 自定义取色器 */
.custom-color-editor { background: var(--sidebar-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--border); margin-top: 20px; }
.custom-color-editor h3 { margin: 0 0 20px 0; font-size: 15px; color: var(--text); }
.color-pickers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.picker-item { display: flex; align-items: center; justify-content: space-between; background: var(--bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); }
.picker-info { display: flex; flex-direction: column; gap: 4px; }
.picker-label { font-size: 12px; color: var(--text); }
.picker-code { font-size: 10px; color: var(--text-muted); font-family: monospace; }
input[type="color"] { -webkit-appearance: none; appearance: none; border: none; width: 24px; height: 24px; border-radius: 6px; padding: 0; cursor: pointer; background: transparent; }
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: 2px solid rgba(255,255,255,0.2); border-radius: 6px; }

/* ============================================================================
   5. 模型拖拽上传与进度区 (Upload Dropzone)
   ============================================================================ */
.upload-dropzone { 
  width: 100%; height: 240px; border: 2px dashed var(--border); border-radius: 20px; 
  display: flex; flex-direction: column; justify-content: center; align-items: center; 
  cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
  background: color-mix(in srgb, var(--active-bg) 40%, transparent); 
  position: relative; overflow: hidden; 
}
.upload-dropzone:hover, .upload-dropzone.is-dragover { 
  border-color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); transform: scale(1.01); 
}
.upload-dropzone.is-uploading { cursor: default; border-style: solid; border-color: var(--border); transform: scale(1); }
.hidden-input { display: none; }

.upload-idle { display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.upload-icon svg { width: 56px; height: 56px; color: var(--primary); margin-bottom: 16px; transition: transform 0.3s; }
.upload-dropzone:hover .upload-icon svg { transform: translateY(-5px); }
.upload-idle h3 { margin: 0 0 8px 0; font-size: 16px; color: var(--text); }
.upload-idle p { margin: 0; font-size: 13px; color: var(--text-muted); }

/* 解析进度条 */
.upload-progress-container { display: flex; flex-direction: column; align-items: center; width: 70%; }
.progress-spinner { 
  width: 36px; height: 36px; border: 3px solid var(--border); 
  border-top-color: var(--primary); border-radius: 50%; 
  animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite; margin-bottom: 20px; 
}
@keyframes spin { 100% { transform: rotate(360deg); } }
.progress-text { font-size: 14px !important; color: var(--primary) !important; margin: 0 0 16px 0 !important; font-weight: bold; }
.progress-bar-bg { width: 100%; height: 8px; background: var(--input-bg); border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: var(--primary); transition: width 0.4s ease-out; border-radius: 4px;}
.progress-percent { margin: 12px 0 0 0; font-size: 13px; color: var(--text-muted); font-variant-numeric: tabular-nums; }

/* ============================================================================
   6. 静态模型库网格 (Model Library Grid)
   ============================================================================ */
.model-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
.model-lib-card { 
  background: var(--active-bg); border: 1px solid var(--border); border-radius: 16px; 
  overflow: hidden; cursor: pointer; transition: all 0.3s ease; 
  position: relative; display: flex; flex-direction: column; 
}
.model-lib-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.15); }
.model-lib-card.is-active { border-color: var(--primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent); }

/* 右上角删除按钮 */
.model-delete-btn {
  position: absolute; top: 8px; right: 8px; width: 24px; height: 24px;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
  color: white; border: none; border-radius: 50%;
  display: flex; justify-content: center; align-items: center;
  font-size: 14px; font-weight: bold; cursor: pointer;
  opacity: 0; transition: all 0.2s; z-index: 10;
}
.model-lib-card:hover .model-delete-btn { opacity: 1; }
.model-delete-btn:hover { background: #ef4444; transform: scale(1.1); }

.model-preview-box { 
  width: 100%; aspect-ratio: 1 / 1; 
  /* 🌟 修改：使用 active-bg 替代硬编码的混色，适配亮色主题 */
  background: var(--active-bg); 
  display: flex; justify-content: center; align-items: flex-end; 
  border-bottom: 1px solid var(--border); overflow: hidden; 
}
.model-preview-box img { 
  width: 100%; height: 100%; object-fit: cover; 
  object-position: center bottom; 
  transition: transform 0.5s ease; 
}
.model-lib-card:hover .model-preview-box img { transform: scale(1.05); }

.no-preview-placeholder { color: var(--text-muted); font-size: 12px; }
.model-lib-info { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.model-lib-info .mod-name { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ============================================================================
   7. 全局动画过渡 (Transitions)
   ============================================================================ */
.slide-fade-enter-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-fade-leave-active { transition: all 0.2s ease-in; }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(10px) scale(0.95); opacity: 0; }

/* ============================================================================
   8. 语音合成 (全面替换硬编码颜色为变量)
   ============================================================================ */
.engine-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.engine-item { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 12px 16px; 
  background: var(--active-bg); 
  border: 1px solid var(--border); border-radius: 12px; 
  cursor: pointer; transition: all 0.2s; 
}
.engine-item:hover { background: var(--hover); }
.engine-item.is-editing { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.engine-info { display: flex; align-items: center; }
.engine-name { font-size: 14px; font-weight: bold; color: var(--text); }
.engine-actions { display: flex; gap: 8px; }
.add-engine-btn { 
  padding: 12px; background: transparent; border: 1px dashed var(--border); 
  border-radius: 12px; color: var(--text-muted); cursor: pointer; transition: 0.2s; font-size: 14px; 
}
.add-engine-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--hover); }
.action-text-btn { background: transparent; border: none; color: var(--text-muted); font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: 0.2s; }
.action-text-btn:hover { background: var(--border); color: var(--text); }
.action-text-btn.danger:hover { background: color-mix(in srgb, #ef4444 15%, transparent); color: #ef4444; }

/* ============================================================================
   🌟 新增：情绪差分网格表单样式
   ============================================================================ */
.emotion-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

.emotion-card {
  background: var(--active-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.emotion-card:hover { 
  border-color: var(--primary); 
  background: var(--hover); 
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.emo-title { font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }

/* 情绪高亮颜色（这些可以保留硬编码，因为情绪颜色本身就自带语义） */
.emotion-card.happy .emo-title { color: #50fa7b; text-shadow: 0 0 8px rgba(80, 250, 123, 0.2); }
.emotion-card.sad .emo-title { color: #8be9fd; text-shadow: 0 0 8px rgba(139, 233, 253, 0.2); }
.emotion-card.angry .emo-title { color: #ff5555; text-shadow: 0 0 8px rgba(255, 85, 85, 0.2); }
.emotion-card.shy .emo-title { color: #ffb86c; text-shadow: 0 0 8px rgba(255, 184, 108, 0.2); }

/* 情绪卡片内的输入框紧凑样式 */
.emo-input { 
  background: var(--input-bg); 
  border: 1px solid var(--border); 
  color: var(--text); 
  padding: 8px 12px; 
  border-radius: 6px; 
  outline: none; font-family: inherit; font-size: 12px;
  transition: border-color 0.3s, background 0.3s;
}
.emo-input::placeholder { color: var(--text-muted); }
.emo-input:focus { border-color: var(--primary); background: var(--bg); }

/* ============================================================================
   🌟 情绪面板：手风琴折叠优化样式
   ============================================================================ */
.emo-group-card { background: var(--active-bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; transition: all 0.3s ease; }
.emo-group-card.is-expanded { background: var(--hover); border-color: var(--border); }

/* 头部点击区 */
.emo-group-header { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 14px 16px; cursor: pointer; border-radius: 12px; transition: background 0.2s; 
}
.emo-group-header:hover { background: var(--hover); }
.is-expanded .emo-group-header { border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: 1px dashed var(--border); margin-bottom: 12px; }

.header-left { display: flex; align-items: center; gap: 8px; }
.expand-arrow { font-size: 12px; color: var(--text-muted); width: 16px; text-align: center; transition: transform 0.3s; }
.is-expanded .expand-arrow { color: var(--primary); }

/* 展开的滚动区域 */
.motion-expand-area { max-height: 280px; overflow-y: auto; padding: 0 16px 16px 16px; display: flex; flex-direction: column; gap: 16px; }
.motion-expand-area::-webkit-scrollbar { width: 6px; }
.motion-expand-area::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; }
.motion-expand-area::-webkit-scrollbar-track { background: var(--active-bg); border-radius: 6px;}

.motion-group-title { font-size: 12px; color: var(--text-muted); font-weight: bold; margin-bottom: -6px; }

/* ============================================================================
   🌟 情绪联动：二维网格与复选框高亮样式
   ============================================================================ */
.motion-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; padding-top: 8px; padding-bottom: 12px; }

.motion-checkbox-item { 
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; 
  background: var(--input-bg); 
  border: 1px solid var(--border); 
  border-radius: 8px; cursor: pointer; transition: all 0.2s ease; overflow: hidden; 
}
.motion-checkbox-item:hover { background: var(--hover); transform: translateY(-1px); }

.motion-checkbox-item.checked { 
  background: color-mix(in srgb, var(--primary) 10%, transparent); 
  border-color: var(--primary); 
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--primary) 10%, transparent);
}

.checkbox-custom { 
  width: 14px; height: 14px; 
  border: 2px solid var(--border); 
  border-radius: 4px; position: relative; transition: 0.2s; flex-shrink: 0; 
}
.checked .checkbox-custom { background: var(--primary); border-color: var(--primary); }
.checked .checkbox-custom::after { 
  content: ''; position: absolute; left: 3.5px; top: 0px; width: 3px; height: 7px; 
  border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); 
}

.motion-name-text { font-size: 12px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.checked .motion-name-text { color: var(--text); font-weight: bold; }

/* ============================================================================
   🌟 关于页面专属高级样式
   ============================================================================ */
.about-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  margin-bottom: 24px;
}

.about-logo {
  font-size: 64px;
  line-height: 1;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--primary) 40%, transparent));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.about-title {
  font-size: 32px !important;
  font-weight: 800 !important;
  margin: 0 0 10px 0 !important;
  letter-spacing: 1px;
  background: linear-gradient(135deg, var(--primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.about-version {
  font-size: 12px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.about-desc {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.8;
  margin-bottom: 36px;
}

.about-features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.feature-card {
  background: var(--active-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  background: var(--hover);
}

.feature-icon {
  font-size: 26px;
  margin-bottom: 4px;
}

.feature-card h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.feature-card p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

.about-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.about-footer p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.about-links {
  display: flex;
  gap: 16px;
}
</style>