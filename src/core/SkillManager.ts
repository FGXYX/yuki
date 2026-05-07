// src/core/SkillManager.ts
// Yuki Agent Skill 管理系统 — 灵感来自 Hermes Agent 的 skill 工作流
// 提供结构化数据模型、文件加载、智能注入、导入导出

import { ConfigStore } from '@/core/ConfigStore'
import { readTextFile, readDir, writeTextFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'

// ─── 数据模型 ───────────────────────────────────────────────

export interface AgentSkill {
  name: string
  description: string
  content: string        // 核心规则 / 提示词正文
  category: string       // 分类，如 'chat', 'development', 'knowledge'
  tags: string[]         // 标签，用于搜索和匹配
  priority: number       // 优先级（1-100），越高越优先注入
  trigger: string        // 触发关键词（逗号分隔），AI 可根据此判断是否需要启用
  enabled: boolean
  isExpanded: boolean
  source: 'local' | 'file'  // local=ConfigStore, file=skills/*.md
  filePath?: string      // 如果 source=file，对应文件路径
  isCustomCat?: boolean  // UI 状态：是否处于自定义分类输入模式
}

/** 旧格式 → 新格式迁移用的默认值 */
const DEFAULT_META = {
  description: '',
  category: 'general',
  tags: [] as string[],
  priority: 50,
  trigger: '',
  source: 'local' as const,
}

const STORAGE_KEY = 'yuki_agent_skills_v2'

// ─── 迁移 ───────────────────────────────────────────────────

/**
 * 将旧格式 skill（{name, content, enabled, isExpanded}）迁移到新格式
 */
export function migrateLegacySkills(oldSkills: any[]): AgentSkill[] {
  if (!Array.isArray(oldSkills) || oldSkills.length === 0) return []
  // 检测是否已经是新格式
  if (oldSkills[0]?.description !== undefined) return oldSkills as AgentSkill[]

  return oldSkills.map((s: any) => ({
    name: s.name || '未命名 Skill',
    content: s.content || '',
    enabled: s.enabled !== false,
    isExpanded: s.isExpanded ?? false,
    ...DEFAULT_META,
    source: 'local',
  }))
}

// ─── YAML Frontmatter 解析 ──────────────────────────────

/**
 * 从 .md 文件内容中解析 YAML frontmatter
 * 输入示例：
 *   ---
 *   name: 代码审查
 *   description: 审查规范
 *   category: development
 *   tags: [code-review, quality]
 *   priority: 80
 *   trigger: 审查, review, code
 *   ---
 *   正文内容...
 *
 * 返回 { metadata, body }
 */
export function parseSkillFile(content: string): {
  metadata: Partial<AgentSkill>
  body: string
} {
  const metadata: Partial<AgentSkill> = {}
  let body = content

  // 检查 frontmatter 边界
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!fmMatch) return { metadata: {}, body: content }

  const fmLines = fmMatch[1].split('\n')
  body = fmMatch[2].trim()

  for (const line of fmLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const rawVal = line.slice(colonIdx + 1).trim()

    switch (key) {
      case 'name':
      case 'description':
      case 'category':
        metadata[key] = rawVal
        break
      case 'priority':
        metadata.priority = parseInt(rawVal, 10) || 50
        break
      case 'trigger':
        metadata.trigger = rawVal
        break
      case 'tags':
        // 支持 [a, b, c] 或 a, b, c
        const cleaned = rawVal.replace(/[[\]\s]/g, '')
        metadata.tags = cleaned ? cleaned.split(',').filter(Boolean) : []
        break
    }
  }

  return { metadata, body }
}

/**
 * 将 Skill 构建为带 frontmatter 的 .md 文件内容
 */
export function buildSkillFile(skill: AgentSkill): string {
  const tagsStr = skill.tags.length > 0
    ? `tags: [${skill.tags.join(', ')}]`
    : 'tags: []'

  return `---
name: ${skill.name}
description: ${skill.description}
category: ${skill.category}
${tagsStr}
priority: ${skill.priority}
trigger: ${skill.trigger}
---

${skill.content}
`
}

// ─── 文件系统操作 ──────────────────────────────────────────

/**
 * 从 {appData}/skills/ 目录加载所有 .md skill 文件
 * 返回：从文件加载的 skill 列表（不保存到 ConfigStore，只是读取）
 */
export async function loadSkillFiles(): Promise<AgentSkill[]> {
  try {
    const appDataPath = await appDataDir()
    const skillsDir = await join(appDataPath, 'skills')

    const hasDir = await exists(skillsDir)
    if (!hasDir) {
      await mkdir(skillsDir, { recursive: true })
      return []
    }

    const entries = await readDir(skillsDir)
    const mdFiles = entries.filter(e => e.name?.endsWith('.md'))

    const skills: AgentSkill[] = []
    for (const file of mdFiles) {
      try {
        const filePath = await join(skillsDir, file.name!)
        const content = await readTextFile(filePath)
        const { metadata, body } = parseSkillFile(content)
        const name = metadata.name || file.name!.replace(/\.md$/, '')

        skills.push({
          name,
          description: metadata.description || '',
          content: body,
          category: metadata.category || 'general',
          tags: metadata.tags || [],
          priority: metadata.priority || 50,
          trigger: metadata.trigger || '',
          enabled: false,
          isExpanded: false,
          source: 'file',
          filePath,
        })
      } catch (e) {
        console.warn('跳过加载 Skill 文件:', file.name, e)
      }
    }
    return skills
  } catch (e) {
    console.warn('加载 Skill 目录失败:', e)
    return []
  }
}

/**
 * 导出单个 skill 到 {appData}/skills/{name}.md
 */
export async function exportSkillToFile(skill: AgentSkill): Promise<string> {
  const appDataPath = await appDataDir()
  const skillsDir = await join(appDataPath, 'skills')

  const hasDir = await exists(skillsDir)
  if (!hasDir) await mkdir(skillsDir, { recursive: true })

  const safeName = skill.name.replace(/[<>:"/\\|?*]/g, '_')
  const filePath = await join(skillsDir, `${safeName}.md`)
  const content = buildSkillFile(skill)
  await writeTextFile(filePath, content)
  return filePath
}

// ─── 持久化存储（ConfigStore）─────────────────────────────

/**
 * 从 ConfigStore 加载本地 skills
 * 自动迁移旧格式
 */
export async function loadLocalSkills(): Promise<AgentSkill[]> {
  const raw = await ConfigStore.get<any[]>(STORAGE_KEY, [])
  if (raw.length === 0) {
    // 尝试迁移旧格式
    const oldRaw = await ConfigStore.get<any[]>('yuki_agent_skills', [])
    if (oldRaw.length > 0) {
      const migrated = migrateLegacySkills(oldRaw)
      await saveLocalSkills(migrated)
      return migrated
    }
  }
  return migrateLegacySkills(raw)
}

/**
 * 保存本地 skills 到 ConfigStore
 */
export async function saveLocalSkills(skills: AgentSkill[]): Promise<void> {
  await ConfigStore.set(STORAGE_KEY, skills)
}

// ─── 智能注入（关键词匹配）──────────────────────────────

/**
 * 根据用户输入和所有技能，返回应该注入的 skill 列表
 * 逻辑：
 * 1. 所有 enabled 的 skill 按 priority 排序
 * 2. 如果 skill 有 trigger 关键词，且用户输入匹配，则提升优先级
 * 3. 高优先级（>=70）且匹配触发词的优先注入
 * 4. 低优先级始终注入，但放在后面
 */
export function smartFilterSkills(
  allSkills: AgentSkill[],
  userInput: string,
): AgentSkill[] {
  const enabled = allSkills.filter(s => s.enabled)
  if (enabled.length === 0) return []

  const inputLower = userInput.toLowerCase()

  // 按优先级分组
  const highPriority: AgentSkill[] = []  // >= 70
  const normalPriority: AgentSkill[] = [] // 30-69
  const lowPriority: AgentSkill[] = []    // < 30

  for (const skill of enabled) {
    let matched = false
    if (skill.trigger) {
      const keywords = skill.trigger.split(',').map(k => k.trim().toLowerCase())
      matched = keywords.some(k => k && inputLower.includes(k))
    }

    const entry = { ...skill } // 避免修改原对象

    if (skill.priority >= 70 && matched) {
      highPriority.push(entry)
    } else if (skill.priority >= 30) {
      normalPriority.push(entry)
    } else {
      lowPriority.push(entry)
    }
  }

  // 每组内按 priority 降序
  const sortByPriority = (a: AgentSkill, b: AgentSkill) => b.priority - a.priority
  highPriority.sort(sortByPriority)
  normalPriority.sort(sortByPriority)
  lowPriority.sort(sortByPriority)

  return [...highPriority, ...normalPriority, ...lowPriority]
}

/**
 * 构建注入到 system prompt 的 Skill 文本
 */
export function buildSkillPrompt(skills: AgentSkill[]): string {
  if (skills.length === 0) return ''

  let prompt = '\n\n## Agent Skill SOP（行为规则书）\n'

  for (const skill of skills) {
    prompt += `\n### ${skill.name}`
    if (skill.description) prompt += ` — ${skill.description}`
    prompt += `\n${skill.content}\n`
  }

  return prompt
}

/**
 * 一次性加载所有 skill（local + file），合并去重
 * name 相同的优先使用 local 版本（用户可覆盖）
 */
export async function loadAllSkills(): Promise<{
  locals: AgentSkill[]
  files: AgentSkill[]
  merged: AgentSkill[]
}> {
  const locals = await loadLocalSkills()
  const files = await loadSkillFiles()

  // 合并：local 优先，file 补充不重复的
  const localNames = new Set(locals.map(s => s.name))
  const merged = [
    ...locals,
    ...files.filter(f => !localNames.has(f.name)),
  ]

  return { locals, files, merged }
}
