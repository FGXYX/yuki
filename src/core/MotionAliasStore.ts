import { load, Store } from '@tauri-apps/plugin-store';

/** 动作重命名存储系统 (基于 JSON) - Tauri 2.0 适配版 **/
export class MotionAliasStore {
  // 🌟 核心修复 1：使用 Promise 存储实例，等待底层分发合法的 rid
  private storePromise: Promise<Store>;
  private modelId: string; 

  constructor(modelUrl: string) {
    const pathParts = modelUrl.split(/[/\\]/); 
    this.modelId = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'default_model';
    console.log(`[Store] 正在为模型 [${this.modelId}] 加载动作清单...`);

    // 🌟 核心修复 2：使用 load() 异步加载 Store，这会在 Rust 后端正确注册资源！
    this.storePromise = load('.yuki_data.json', { autoSave: true, defaults: {} });
  }

  // 获取该模型的所有重命名数据
  public async getAliases(): Promise<Record<string, string>> {
    // 🌟 确保 Store 已经拿到了合法的 rid
    const store = await this.storePromise;
    const allAliases = await store.get<Record<string, Record<string, string>>>('motion_aliases') || {};
    return allAliases[this.modelId] || {};
  }

  // 保存整个动作重命名清单
  public async saveAliases(aliases: Record<string, string>) {
    const store = await this.storePromise;
    const allAliases = await store.get<Record<string, Record<string, string>>>('motion_aliases') || {};
    
    allAliases[this.modelId] = aliases;
    await store.set('motion_aliases', allAliases);
    await store.save(); // 强制存盘
    
    console.log(`[Store] 模型 [${this.modelId}] 的动作清单保存成功！`);
  }

  // 获取单个动作的直观名字 (兜底逻辑)
  public async getDisplayName(originalName: string): Promise<string> {
    const aliases = await this.getAliases();
    return aliases[originalName] || originalName; 
  }
}