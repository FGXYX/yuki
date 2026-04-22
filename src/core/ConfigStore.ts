// src/core/ConfigStore.ts
import { load, Store } from '@tauri-apps/plugin-store';

// 🌟 1. 明确声明它是 Store 类型，消灭 ts(2347) 泛型调用报错
let storeInstance: Store | null = null;

/**
 * 🌟 异步懒加载工厂：确保 Store 已经被成功读取并实例化
 */
async function getStore(): Promise<Store> {
  if (!storeInstance) {
    // 🌟 2. 补上 defaults: {}，满足 Tauri 2.0 的严格属性要求，消灭 ts(2345) 报错
    storeInstance = await load('.yuki_config.json', { autoSave: false, defaults: {} });
  }
  return storeInstance;
}

export const ConfigStore = {
  /**
   * 异步读取配置
   * @param key 键名
   * @param defaultVal 如果找不到时的默认值
   */
  async get<T>(key: string, defaultVal: T): Promise<T> {
    const store = await getStore();
    const val = await store.get<T>(key);
    return val !== null && val !== undefined ? val : defaultVal;
  },

  /**
   * 异步写入配置并保存到物理硬盘
   */
  async set(key: string, val: any) {
    const store = await getStore();
    await store.set(key, val);
    await store.save(); // 必须调用 save 才会真正写入磁盘
  },

  /**
   * 🌟 神技：监听某个键值的变化 (跨窗口实时同步)
   */
  async listen<T>(key: string, callback: (value: T | null | undefined) => void) {
    const store = await getStore();
    return await store.onKeyChange<T>(key, callback);
  }
};