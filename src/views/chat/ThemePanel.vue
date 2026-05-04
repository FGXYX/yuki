<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{
  modelValue: any
  visible: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
  close: []
  reset: []
  uploadImage: [event: Event]
  clearImage: []
}>()


const fileInputRef = ref<HTMLInputElement | null>(null)

// 默认主题值
const defaultTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, lineHeight: 1.5,
  textColor: '#ececec', panelTextColor: '#ececec', sidebarTextColor: '#ececec',
  aiTextColor: '#ececec', userTextColor: '#ffffff',
  bubbleRadius: 16, aiBgColor: '#242528', userBgColor: '#4facfe',
  aiBubbleOpacity: 1.0, userBubbleOpacity: 1.0, bubbleShadow: true, msgGap: 4,
  sidebarWidth: 220, sidebarOpacity: 0.8, sidebarBlur: true,
  inputRadius: 20, inputOpacity: 0.8, inputBlur: true,
  bgColor: '#141517', bgImage: '', bgSize: 'cover', bgPosition: 'center', bgBlur: 0, bgOpacity: 0.15,
  headerBg: 'auto', headerBgColor: '#141517', headerOpacity: 0.8, headerBlur: true,
}

const localTheme = ref({ ...defaultTheme })

watch(() => props.modelValue, (val) => { if (val) localTheme.value = { ...defaultTheme, ...val } }, { immediate: true })

const save = () => emit('update:modelValue', { ...localTheme.value })
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="theme-overlay" @click.self="emit('close')">
      <div class="theme-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon">🎨</span>
            <h3>外观定制</h3>
          </div>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>

        <div class="panel-body">
          <!-- 字体与排版 -->
          <div class="setting-group">
            <div class="group-title"> 字体与排版</div>
            <div class="setting-row">
              <label>字体风格</label>
              <select v-model="localTheme.fontFamily" @change="save" class="theme-select">
                <option value="system-ui, -apple-system, sans-serif">默认 (系统现代无衬线)</option>
                <option value="'Microsoft YaHei', sans-serif">微软雅黑 (经典)</option>
                <option value="'SimSun', serif">宋体 (复古优雅)</option>
                <option value="'JetBrains Mono', Consolas, monospace">极客等宽 (代码风)</option>
                <option value="'Comic Sans MS', cursive">轻松活泼 (手写风)</option>
              </select>
            </div>
            <div class="color-row"><label>全局 UI 文字</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.textColor" @change="save">
                <span class="color-hex">{{ localTheme.textColor }}</span>
              </div>
            </div>
            <div class="color-row"><label>设置面板文字</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.panelTextColor" @change="save">
                <span class="color-hex">{{ localTheme.panelTextColor }}</span>
              </div>
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>字体大小</label><span class="setting-val">{{ localTheme.fontSize }} px</span></div>
              <input type="range" v-model.number="localTheme.fontSize" min="12" max="22" @change="save">
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>文字行高</label><span class="setting-val">{{ localTheme.lineHeight }}</span></div>
              <input type="range" v-model.number="localTheme.lineHeight" min="1.1" max="2.2" step="0.1" @change="save">
            </div>
          </div>

          <!-- 消息气泡 -->
          <div class="setting-group">
            <div class="group-title"> 消息气泡</div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>气泡圆角</label><span class="setting-val">{{ localTheme.bubbleRadius }} px</span></div>
              <input type="range" v-model.number="localTheme.bubbleRadius" min="0" max="30" @change="save">
            </div>
            <div class="color-row"><label>AI 气泡底色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.aiBgColor" @change="save">
                <span class="color-hex">{{ localTheme.aiBgColor }}</span>
              </div>
            </div>
            <div class="color-row"><label>AI 文字颜色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.aiTextColor" @change="save">
                <span class="color-hex">{{ localTheme.aiTextColor }}</span>
              </div>
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>AI 气泡透明度</label><span class="setting-val">{{ Math.round(localTheme.aiBubbleOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="localTheme.aiBubbleOpacity" min="0.1" max="1" step="0.05" @change="save">
            </div>
            <div class="color-row"><label>我的气泡颜色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.userBgColor" @change="save">
                <span class="color-hex">{{ localTheme.userBgColor }}</span>
              </div>
            </div>
            <div class="color-row"><label>我的文字颜色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.userTextColor" @change="save">
                <span class="color-hex">{{ localTheme.userTextColor }}</span>
              </div>
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>我的气泡透明度</label><span class="setting-val">{{ Math.round(localTheme.userBubbleOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="localTheme.userBubbleOpacity" min="0.1" max="1" step="0.05" @change="save">
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>消息间距</label><span class="setting-val">{{ localTheme.msgGap }} px</span></div>
              <input type="range" v-model.number="localTheme.msgGap" min="0" max="20" @change="save">
            </div>
            <div class="setting-row">
              <label>气泡投影</label>
              <button class="toggle-btn" :class="{ on: localTheme.bubbleShadow }"
                @click="localTheme.bubbleShadow = !localTheme.bubbleShadow; save()">
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- 侧边栏 -->
          <div class="setting-group">
            <div class="group-title"> 侧边栏布局</div>
            <div class="color-row"><label>侧边栏文字颜色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.sidebarTextColor" @change="save">
                <span class="color-hex">{{ localTheme.sidebarTextColor }}</span>
              </div>
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>侧边栏宽度</label><span class="setting-val">{{ localTheme.sidebarWidth }} px</span></div>
              <input type="range" v-model.number="localTheme.sidebarWidth" min="160" max="320" @change="save">
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>侧边栏透明度</label><span class="setting-val">{{ Math.round(localTheme.sidebarOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="localTheme.sidebarOpacity" min="0.1" max="1" step="0.05" @change="save">
            </div>
            <div class="setting-row">
              <label>毛玻璃模糊</label>
              <button class="toggle-btn" :class="{ on: localTheme.sidebarBlur }"
                @click="localTheme.sidebarBlur = !localTheme.sidebarBlur; save()">
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- 输入区 -->
          <div class="setting-group">
            <div class="group-title"> 底部输入区</div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>输入框圆角</label><span class="setting-val">{{ localTheme.inputRadius }} px</span></div>
              <input type="range" v-model.number="localTheme.inputRadius" min="4" max="28" @change="save">
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>对话框透明度</label><span class="setting-val">{{ Math.round(localTheme.inputOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="localTheme.inputOpacity" min="0.1" max="1" step="0.05" @change="save">
            </div>
            <div class="setting-row">
              <label>毛玻璃模糊</label>
              <button class="toggle-btn" :class="{ on: localTheme.inputBlur }"
                @click="localTheme.inputBlur = !localTheme.inputBlur; save()">
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- 顶栏 -->
          <div class="setting-group">
            <div class="group-title"> 顶部导航栏</div>
            <div class="setting-row">
              <label>背景模式</label>
              <select v-model="localTheme.headerBg" @change="save" class="theme-select">
                <option value="auto">跟随背景色 (自动)</option>
                <option value="custom">自定义颜色</option>
              </select>
            </div>
            <div class="color-row" v-if="localTheme.headerBg === 'custom'"><label>顶栏颜色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.headerBgColor" @change="save">
                <span class="color-hex">{{ localTheme.headerBgColor }}</span>
              </div>
            </div>
            <div class="setting-row-stack">
              <div class="setting-label-row"><label>顶栏透明度</label><span class="setting-val">{{ Math.round(localTheme.headerOpacity * 100) }}%</span></div>
              <input type="range" v-model.number="localTheme.headerOpacity" min="0.1" max="1" step="0.05" @change="save">
            </div>
            <div class="setting-row">
              <label>毛玻璃模糊</label>
              <button class="toggle-btn" :class="{ on: localTheme.headerBlur }"
                @click="localTheme.headerBlur = !localTheme.headerBlur; save()">
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>

          <!-- 背景 -->
          <div class="setting-group">
            <div class="group-title"> 背景空间</div>
            <div class="color-row"><label>底色</label>
              <div class="color-picker-wrap">
                <input type="color" v-model="localTheme.bgColor" @change="save">
                <span class="color-hex">{{ localTheme.bgColor }}</span>
              </div>
            </div>
            <div class="setting-row" style="flex-wrap: wrap; gap: 8px;">
              <label>背景图片</label>
              <div class="bg-input-wrapper">
                <input type="file" ref="fileInputRef" accept="image/*" class="hidden-input" @change="emit('uploadImage', $event)">
                <button class="upload-btn" @click="fileInputRef?.click()">📂 本地</button>
                <div v-if="localTheme.bgImage && localTheme.bgImage.startsWith('data:image')" class="local-img-badge">
                  <span class="badge-text"> 已应用本地图片</span>
                  <button class="badge-close" @click="emit('clearImage')">×</button>
                </div>
                <input v-else type="text" class="theme-input url-input" placeholder="或输入 http 链接..." v-model="localTheme.bgImage" @change="save">
              </div>
            </div>
            <template v-if="localTheme.bgImage">
              <div class="setting-row">
                <label>拉伸模式</label>
                <select v-model="localTheme.bgSize" @change="save" class="theme-select">
                  <option value="cover">等比填充</option>
                  <option value="contain">等比适应</option>
                  <option value="100% 100%">强行铺满</option>
                </select>
              </div>
              <div class="setting-row">
                <label>对齐基准</label>
                <select v-model="localTheme.bgPosition" @change="save" class="theme-select">
                  <option value="center">居中</option>
                  <option value="top">靠上</option>
                  <option value="bottom">靠下</option>
                </select>
              </div>
              <div class="setting-row-stack">
                <div class="setting-label-row"><label>高斯模糊度</label><span class="setting-val">{{ localTheme.bgBlur }} px</span></div>
                <input type="range" v-model.number="localTheme.bgBlur" min="0" max="30" @change="save">
              </div>
              <div class="setting-row-stack">
                <div class="setting-label-row"><label>图片显影度</label><span class="setting-val">{{ Math.round(localTheme.bgOpacity * 100) }}%</span></div>
                <input type="range" v-model.number="localTheme.bgOpacity" min="0.05" max="1" step="0.05" @change="save">
              </div>
            </template>
          </div>

          <button class="reset-btn" @click="emit('reset')">↺ 恢复默认外观</button>
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
  width: 440px; max-height: 85vh; background: var(--chat-bg, #141517);
  border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.panel-title-group { display: flex; align-items: center; gap: 8px; }
.panel-icon { font-size: 18px; }
.panel-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--panel-text-color, #ececec); }
.close-btn { background: none; border: none; color: #888; font-size: 22px; cursor: pointer; padding: 0 4px; line-height: 1; }
.close-btn:hover { color: #ef4444; }
.panel-body {
  flex: 1; overflow-y: auto; padding: 16px;
}
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

/* 设置卡片组 — 让每组设置像一张卡片一样独立 */
.setting-group {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 14px;
  margin-bottom: 12px;
}
.group-title {
  font-size: 12px; font-weight: 600; margin-bottom: 12px;
  color: var(--panel-text-color); opacity: 0.4;
  text-transform: uppercase; letter-spacing: 0.5px;
}
/* 通用设置行 —— 左右布局 */
.setting-row {
  display: flex; justify-content: space-between; align-items: center;
  min-height: 32px; margin-bottom: 6px;
}
.setting-row:last-child { margin-bottom: 0; }
.setting-row label {
  font-size: 12px; color: var(--panel-text-color); opacity: 0.7;
  flex-shrink: 0; margin-right: 12px;
}

/* 带滑块的行：滑块在 label 下方横跨整行 */
.setting-row-stack {
  margin-bottom: 10px;
}
.setting-row-stack:last-child { margin-bottom: 0; }
.setting-row-stack .setting-label-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 4px;
}
.setting-row-stack label { font-size: 12px; color: var(--panel-text-color); opacity: 0.7; }
.setting-row-stack .setting-val { font-size: 11px; color: var(--panel-text-color); opacity: 0.35; }

/* Select 和 Input */
.theme-select, .theme-input {
  width: 160px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--panel-text-color, #ececec); padding: 6px 10px;
  border-radius: 8px; font-size: 12px; outline: none;
  transition: border-color 0.2s;
}
.theme-select:focus, .theme-input:focus { border-color: rgba(255,255,255,0.2); }
.theme-input.full { width: 100%; }

/* 颜色选择行：label + 颜色块+hex值 */
.color-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 6px; padding: 4px 0;
}
.color-row label { font-size: 12px; color: var(--panel-text-color); opacity: 0.7; }
.color-picker-wrap {
  display: flex; align-items: center; gap: 8px;
}
.color-picker-wrap input[type="color"] {
  width: 32px; height: 28px; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px; cursor: pointer; background: transparent; padding: 2px;
}
.color-hex {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  color: var(--panel-text-color); opacity: 0.4; min-width: 56px;
}

/* Range 滑块 */
input[type="range"] {
  width: 100%; height: 4px; -webkit-appearance: none; appearance: none;
  background: rgba(255,255,255,0.12); border-radius: 2px; outline: none;
  margin: 4px 0;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--user-bg, #4facfe); border: 2px solid rgba(255,255,255,0.2);
  cursor: pointer; transition: 0.15s;
}
input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }

/* Toggle 开关 */
.toggle-btn {
  width: 36px; height: 20px; border-radius: 12px; border: none;
  background: rgba(255,255,255,0.15); cursor: pointer; position: relative;
  transition: 0.2s; padding: 0; flex-shrink: 0;
}
.toggle-btn.on { background: var(--user-bg, #4facfe); }
.toggle-knob {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-btn.on .toggle-knob { left: 18px; }

/* 背景图上传 */
.bg-input-wrapper { display: flex; gap: 8px; align-items: center; }
.hidden-input { display: none; }
.upload-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: var(--panel-text-color); opacity: 0.6; padding: 6px 10px;
  border-radius: 8px; cursor: pointer; font-size: 12px; white-space: nowrap; transition: 0.2s;
}
.upload-btn:hover { opacity: 1; }
.url-input { flex: 1; min-width: 0; }
.local-img-badge {
  display: flex; align-items: center; gap: 6px; flex: 1;
  background: rgba(79,172,254,0.12); padding: 6px 10px; border-radius: 8px;
}
.badge-text { font-size: 11px; color: #4facfe; }
.badge-close { background: none; border: none; color: #888; cursor: pointer; font-size: 14px; padding: 0; margin-left: auto; }
.reset-btn {
  width: 100%; margin-top: 4px; background: transparent;
  border: 1px solid rgba(239,68,68,0.25); color: #ef4444; opacity: 0.7;
  padding: 8px; border-radius: 10px; cursor: pointer; font-size: 12px; transition: 0.2s;
}
.reset-btn:hover { opacity: 1; background: rgba(239,68,68,0.06); }
.toggle-btn.on { background: #4facfe; }
.toggle-knob {
  position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
  border-radius: 50%; background: #fff; transition: 0.2s;
}
.toggle-btn.on .toggle-knob { left: 20px; }
.bg-input-wrapper { display: flex; gap: 8px; align-items: center; }
.hidden-input { display: none; }
.upload-btn {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
  color: #aaa; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; white-space: nowrap;
}
.upload-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.url-input { flex: 1; min-width: 0; }
.local-img-badge {
  display: flex; align-items: center; gap: 6px; flex: 1;
  background: rgba(79,172,254,0.12); padding: 6px 10px; border-radius: 8px;
}
.badge-text { font-size: 12px; color: #4facfe; }
.badge-close { background: none; border: none; color: #888; cursor: pointer; font-size: 14px; padding: 0; margin-left: auto; }
.reset-btn {
  width: 100%; margin-top: 8px; background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: #888; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 13px; transition: 0.2s;
}
.reset-btn:hover { border-color: #ef4444; color: #ef4444; }
</style>
