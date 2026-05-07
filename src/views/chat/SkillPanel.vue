<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AgentSkill } from '@/core/SkillManager'

// 预置分类色板
const CATEGORY_COLORS: Record<string, string> = {
  general: '#8b5cf6',
  chat: '#4facfe',
  development: '#34d399',
  knowledge: '#fbbf24',
  creative: '#fb7185',
  tool: '#c084fc',
  custom: '#6a6a8a',
}

const props = defineProps<{
  skills: AgentSkill[]
  visible: boolean
  fileSkills: AgentSkill[]
}>()

const emit = defineEmits<{
  close: []
  'update:skills': [skills: AgentSkill[]]
  importSkill: []
  exportSkill: [skill: AgentSkill]
  deleteFileSkill: [idx: number]
}>()

// ── 分类分组 ──
const categoryGroups = computed(() => {
  const groups: Record<string, AgentSkill[]> = {}
  for (const s of props.skills) {
    const cat = s.category || 'general'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(s)
  }
  return groups
})

const fileGroups = computed(() => {
  const groups: Record<string, AgentSkill[]> = {}
  for (const s of props.fileSkills) {
    const cat = s.category || 'general'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(s)
  }
  return groups
})

// ── 新增 ──
const addNew = () => {
  emit('update:skills', [
    ...props.skills,
    {
      name: '新 Skill',
      description: '',
      content: '',
      category: 'general',
      tags: [],
      priority: 50,
      trigger: '',
      enabled: false,
      isExpanded: true,
      isCustomCat: false,
      source: 'local',
    },
  ])
}

const removeSkill = (skill: AgentSkill) => {
  emit('update:skills', props.skills.filter(s => s !== skill))
}

const updateSkill = (skill: AgentSkill, updates: Record<string, any>) => {
  const idx = props.skills.indexOf(skill)
  if (idx === -1) return
  const list = [...props.skills]
  list[idx] = { ...list[idx], ...updates }
  emit('update:skills', list)
}

// ── 分类标签管理 ──
const updateTags = (skill: AgentSkill, raw: string) => {
  const tags = raw.split(',').map(t => t.trim()).filter(Boolean)
  updateSkill(skill, { tags })
}

const UI_PLUS = '<svg viewBox="0 0 256 256"><line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="128" y1="40" x2="128" y2="216" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>'

const catColor = (cat: string) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.custom
const priorityColor = (p: number) => p >= 70 ? '#34d399' : p >= 40 ? '#fbbf24' : '#6a6a8a'
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="theme-overlay" @click.self="emit('close')">
      <div class="theme-panel">
        <div class="panel-header">
          <div class="panel-title-group">
            <span class="panel-icon" v-html="UI_PLUS"></span>
            <h3>Agent Skill SOP</h3>
          </div>
          <button class="close-btn" @click="emit('close')">x</button>
        </div>

        <div class="panel-body">
          <p class="panel-hint">
            在这里编写 Yuki 的"行为说明书"。开启后，对应规则将作为指令注入她的潜意识。
            <br/><strong>智能注入：</strong>设置了<code>触发词</code>的高优先级 Skill 只在对话关键词匹配时才注入，节省 Token。
          </p>

          <!-- ── 本地 Skills ── -->
          <div v-if="Object.keys(categoryGroups).length === 0" class="empty-state">
            <span class="empty-icon">+</span>
            <p>还没有 Skill，点下方按钮新建</p>
          </div>

          <div v-for="(skills, cat) in categoryGroups" :key="cat" class="category-section">
            <div class="category-header" :style="'--cat-color: ' + catColor(cat)">
              <span class="category-dot" :style="{ background: catColor(cat) }"></span>
              <span class="category-name">{{ cat }}</span>
              <span class="category-count">{{ skills.length }}</span>
            </div>
            <div class="category-cards">

            <div v-for="(skill, localIdx) in skills" :key="skill.name + '-' + localIdx"
                 class="skill-card" :class="{ 'is-disabled': !skill.enabled }">

              <!-- 卡片顶栏 -->
              <div class="skill-header">
                <div class="skill-main-info">
                  <input type="text" :value="skill.name"
                    @input="updateSkill(skill, { name: ($event.target as HTMLInputElement).value })"
                    class="skill-name-input" placeholder="Skill 名称">
                  <span class="priority-badge" :style="{ background: priorityColor(skill.priority) }">
                    P{{ skill.priority }}
                  </span>
                </div>
                <div class="skill-actions">
                  <button @click="emit('exportSkill', skill)" class="icon-btn" title="导出为 .md 文件">↓</button>
                  <button @click="updateSkill(skill, { isExpanded: !skill.isExpanded })" class="icon-btn">
                    <span :style="{ transform: skill.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', display:'inline-block' }">▼</span>
                  </button>
                  <button class="toggle-btn" :class="{ on: skill.enabled }"
                    @click="updateSkill(skill, { enabled: !skill.enabled })">
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              </div>

              <!-- 展开详情 -->
              <div v-show="skill.isExpanded" class="skill-body">
                <!-- 描述 -->
                <div class="field">
                  <label>描述</label>
                  <input type="text" :value="skill.description"
                    @input="updateSkill(skill, { description: ($event.target as HTMLInputElement).value })"
                    class="theme-input" placeholder="简要描述这个 Skill 的作用">
                </div>

                <!-- 分类 + 优先级 -->
                <div class="field-row">
                  <div class="field half">
                    <label>分类</label>
                    <div class="cat-selector">
                      <button
                        v-for="opt in [
                          { value: 'general', label: '通用', color: '#8b5cf6' },
                          { value: 'chat', label: '对话', color: '#4facfe' },
                          { value: 'development', label: '开发', color: '#34d399' },
                          { value: 'knowledge', label: '知识', color: '#fbbf24' },
                          { value: 'creative', label: '创意', color: '#fb7185' },
                          { value: 'tool', label: '工具', color: '#c084fc' },
                        ]"
                        :key="opt.value"
                        :class="['cat-option', { active: skill.category === opt.value }]"
                        :style="{ '--cat-clr': opt.color }"
                        @click="updateSkill(skill, { category: opt.value, isCustomCat: false })"
                      >
                        <span class="cat-dot"></span>
                        <span class="cat-label">{{ opt.label }}</span>
                      </button>
                      <!-- 自定义分类按钮 + 输入框 -->
                      <div class="cat-custom-wrap" :class="{ active: !['general','chat','development','knowledge','creative','tool'].includes(skill.category) }">
                        <button
                          :class="['cat-option', { active: !['general','chat','development','knowledge','creative','tool'].includes(skill.category) }]"
                          :style="{ '--cat-clr': '#6a6a8a' }"
                          @click="updateSkill(skill, { isCustomCat: true })"
                        >
                          <span class="cat-dot" style="background:#6a6a8a"></span>
                          <span class="cat-label" v-if="!skill.isCustomCat">自定义</span>
                        </button>
                        <input
                          v-if="skill.isCustomCat"
                          type="text"
                          :value="skill.category"
                          @input="updateSkill(skill, { category: ($event.target as HTMLInputElement).value })"
                          class="cat-custom-input"
                          placeholder="输入分类名"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="field half">
                    <label>优先级 (1-100)</label>
                    <input type="number" :value="skill.priority" min="1" max="100"
                      @input="updateSkill(skill, { priority: parseInt(($event.target as HTMLInputElement).value) || 50 })"
                      class="theme-input">
                  </div>
                </div>

                <!-- 触发关键词 -->
                <div class="field">
                  <label>触发词 <span class="field-hint">逗号分隔，匹配时优先注入</span></label>
                  <input type="text" :value="skill.trigger"
                    @input="updateSkill(skill, { trigger: ($event.target as HTMLInputElement).value })"
                    class="theme-input" placeholder="例如: 代码, review, bug">
                </div>

                <!-- 标签 -->
                <div class="field">
                  <label>标签</label>
                  <input type="text" :value="(skill.tags || []).join(', ')"
                    @input="updateTags(skill, ($event.target as HTMLInputElement).value)"
                    class="theme-input" placeholder="逗号分隔，如: code-review, quality">
                </div>

                <!-- SOP 正文 -->
                <div class="field">
                  <label>SOP 规则 / 提示词</label>
                  <textarea class="theme-input rule-textarea"
                    :value="skill.content"
                    @input="updateSkill(skill, { content: ($event.target as HTMLTextAreaElement).value })"
                    placeholder="例如：当你被要求查阅文件时，必须输出三段式的 Markdown 报告..."></textarea>
                </div>

                <button class="delete-btn" @click="removeSkill(skill)">删除此 Skill</button>
              </div>
            </div>
          </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-row">
            <button class="new-chat-btn" @click="addNew">
              <span class="icon-wrap" v-html="UI_PLUS"></span>
              <span>新建 Skill</span>
            </button>
            <button class="new-chat-btn" @click="emit('importSkill')">
              <span>📁</span>
              <span>导入 .md 文件</span>
            </button>
          </div>

          <!-- ── 文件源 Skills ── -->
          <div v-if="fileSkills.length > 0" class="file-section">
            <div class="file-section-header">
              <span class="file-icon">📂</span>
              <span>文件源 Skills ({{ fileSkills.length }})</span>
              <span class="file-hint">来自 {appData}/skills/ 目录</span>
            </div>
            <div v-for="(fs, fi) in fileSkills" :key="'file-' + fi" class="skill-card is-file">
              <div class="skill-header">
                <span class="skill-name-text">{{ fs.name }}</span>
                <span class="priority-badge" :style="{ background: priorityColor(fs.priority) }">P{{ fs.priority }}</span>
                <div class="skill-actions">
                  <button class="icon-btn" title="导入到本地编辑">→</button>
                  <button class="icon-btn danger" title="删除此文件" @click="emit('deleteFileSkill', fi)">x</button>
                </div>
              </div>
              <div class="file-meta">
                <span class="file-cat-tag" :style="{ borderColor: catColor(fs.category) }">{{ fs.category }}</span>
                <span v-if="fs.tags.length > 0" class="file-tags">{{ fs.tags.join(', ') }}</span>
              </div>
              <p class="file-preview">{{ fs.content.slice(0, 120) }}{{ fs.content.length > 120 ? '...' : '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── 面板容器 ── */
.theme-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 9999;
  display: flex; justify-content: center; align-items: flex-start; padding-top: 5vh;
}
.theme-panel {
  width: 520px; max-height: 88vh; background: var(--chat-bg, #141517);
  border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.panel-title-group { display: flex; align-items: center; gap: 8px; }
.panel-icon { width: 18px; height: 18px; color: #4facfe; display: flex; }
.panel-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--panel-text-color, #ececec); }
.panel-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.panel-body::-webkit-scrollbar { width: 5px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.close-btn { background: none; border: none; color: #888; font-size: 22px; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #ef4444; }
.panel-hint { color: #888; font-size: 11px; margin-bottom: 14px; line-height: 1.5; }
.panel-hint code { background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-size: 10px; }

/* ── 空状态 ── */
.empty-state { text-align: center; padding: 30px 0; color: #555; }
.empty-state p { font-size: 12px; margin-top: 6px; }

/* ── 分类区块 ── */
.category-section {
  margin-bottom: 16px;
  background: rgba(255,255,255,0.02);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.category-section:last-child { margin-bottom: 0; }

.category-header {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: relative;
}
.category-header::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--cat-color, #666);
}
.category-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.category-name {
  font-size: 11px; font-weight: 700; color: #ccc;
  text-transform: capitalize; letter-spacing: 0.3px;
}
.category-count {
  font-size: 10px; color: #666;
  background: rgba(255,255,255,0.06);
  padding: 1px 7px; border-radius: 8px;
  margin-left: auto;
}

/* 分类下卡片列表用内边距包裹 */
.category-cards {
  padding: 6px 8px 8px;
}

/* ── Skill 卡片 ── */
.skill-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; padding: 9px 12px; margin-bottom: 4px;
}
.skill-card:last-child { margin-bottom: 0; }
.skill-card.is-disabled { opacity: 0.5; }
.skill-card.is-file { border-left: 3px solid rgba(79, 172, 254, 0.3); }

.skill-header { display: flex; align-items: center; gap: 8px; }
.skill-main-info { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
.skill-name-input { flex: 1; background: transparent; border: none; color: #ececec; font-size: 13px; font-weight: 500; outline: none; min-width: 0; }
.skill-name-input:focus { border-bottom: 1px solid rgba(255,255,255,0.15); }
.skill-name-text { flex: 1; font-size: 13px; font-weight: 500; color: #ececec; }

.priority-badge { font-size: 9px; padding: 1px 5px; border-radius: 4px; color: #000; font-weight: 700; flex-shrink: 0; }
.skill-actions { display: flex; align-items: center; gap: 4px; }

.icon-btn { background: transparent; border: none; color: #666; cursor: pointer; padding: 3px 5px; border-radius: 4px; font-size: 12px; line-height: 1; }
.icon-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }
.icon-btn.danger:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

.toggle-btn {
  width: 34px; height: 18px; border-radius: 12px; border: none;
  background: rgba(255,255,255,0.15); cursor: pointer; position: relative; padding: 0; flex-shrink: 0;
}
.toggle-btn.on { background: #4facfe; }
.toggle-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: 0.2s; }
.toggle-btn.on .toggle-knob { left: 18px; }

/* ── 展开详情 ── */
.skill-body { margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; }
.field { margin-bottom: 8px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 11px; color: #888; margin-bottom: 3px; }
.field-hint { font-weight: normal; color: #555; font-size: 10px; }
.field-row { display: flex; gap: 8px; }
.field.half { flex: 1; }

/* ── 分类选择器（替代原生 select） ── */
.cat-selector {
  display: flex; flex-wrap: wrap; gap: 3px;
}
.cat-option {
  display: flex; align-items: center; gap: 3px;
  padding: 3px 6px; border-radius: 5px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  color: #888; font-size: 10px; cursor: pointer;
  transition: all 0.15s; font-family: inherit;
}
.cat-option:hover {
  background: rgba(255,255,255,0.06);
  color: #ccc;
}
.cat-option.active {
  background: color-mix(in srgb, var(--cat-clr) 20%, transparent);
  border-color: var(--cat-clr);
  color: #eee;
  font-weight: 600;
}
.cat-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--cat-clr, #888);
  flex-shrink: 0;
}
.cat-label { white-space: nowrap; }

/* ── 自定义分类输入 ── */
.cat-custom-wrap {
  display: inline-flex; align-items: center; gap: 2px;
}
.cat-custom-wrap.active .cat-option {
  background: rgba(106,106,138,0.15);
  border-color: #6a6a8a;
  color: #ccc;
}
.cat-custom-input {
  width: 70px; padding: 3px 6px; border-radius: 5px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: #eee; font-size: 10px; outline: none;
  font-family: inherit;
}
.cat-custom-input:focus { border-color: #6a6a8a; }

.theme-input {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: var(--panel-text-color, #ececec); padding: 6px 9px; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box;
}
.theme-input:focus { border-color: #4facfe; }
select.theme-input { cursor: pointer; }
.rule-textarea { min-height: 100px; font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5; resize: vertical; }

.delete-btn {
  width: 100%; background: transparent; border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444; padding: 7px; border-radius: 8px; cursor: pointer; font-size: 11px; margin-top: 6px;
}
.delete-btn:hover { background: rgba(239,68,68,0.1); }

.action-row { display: flex; gap: 8px; margin-top: 10px; }
.new-chat-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: var(--panel-text-color, #ececec); padding: 9px 14px; border-radius: 10px;
  font-size: 12px; cursor: pointer; transition: 0.2s;
}
.new-chat-btn:hover { background: rgba(255,255,255,0.1); }
.new-chat-btn .icon-wrap { width: 14px; height: 14px; display: flex; }

/* ── 文件源 Skills ── */
.file-section { margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; }
.file-section-header { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #aaa; margin-bottom: 8px; }
.file-icon { font-size: 14px; }
.file-hint { font-size: 10px; color: #555; margin-left: auto; }
.file-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.file-cat-tag { font-size: 10px; padding: 1px 6px; border: 1px solid; border-radius: 4px; color: #aaa; }
.file-tags { font-size: 10px; color: #666; }
.file-preview { font-size: 11px; color: #777; margin-top: 4px; line-height: 1.4; }
</style>
