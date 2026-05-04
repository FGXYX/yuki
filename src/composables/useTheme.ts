// src/composables/useTheme.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { ConfigStore } from '@/core/ConfigStore'; // 引入新管家

export function useTheme() {
  // ================== 1. 状态定义 ==================
  const currentThemeStyle = ref<Record<string, string>>({});
  
  // 用于存放注销监听器的“垃圾桶”
  let unlistenTheme: Function | null = null;
  let unlistenCustom: Function | null = null;

  // ================== 2. 核心方法 ==================
  // 🌟 全部升级为 async 异步读取
  const syncTheme = async () => {
    // 从硬盘读取，如果没有就默认 'dark'
    const activeThemeId = await ConfigStore.get<string>('yuki_theme', 'dark');
    
    if (activeThemeId === 'custom') { 
      const savedCustom = await ConfigStore.get<any>('yuki_theme_custom', {}); 
      currentThemeStyle.value = savedCustom; 
    } else {
      // 庞大的主题色卡字典
      const themeRegistryMap: Record<string, any> = {
        'dark': { '--bg': '#1a1b1e', '--sidebar-bg': '#141517', '--primary': '#4facfe', '--text': '#ececec', '--text-muted': '#888888', '--border': '#2c2d30', '--hover': '#1e1f22', '--active-bg': '#242528', '--input-bg': '#141517' },
        'light': { '--bg': '#f7f9fa', '--sidebar-bg': '#ffffff', '--primary': '#006fee', '--text': '#11181c', '--text-muted': '#687076', '--border': '#d7dbdf', '--hover': '#f1f3f5', '--active-bg': '#e6f1fe', '--input-bg': '#ffffff' },
        'sakura': { '--bg': '#fff5f7', '--sidebar-bg': '#ffe4e6', '--primary': '#fb7185', '--text': '#4c1d95', '--text-muted': '#be123c', '--border': '#fecdd3', '--hover': '#ffe4e6', '--active-bg': '#fff1f2', '--input-bg': '#ffffff' },
        'cyber': { '--bg': '#0d0e15', '--sidebar-bg': '#09090b', '--primary': '#fcd34d', '--text': '#e2e8f0', '--text-muted': '#64748b', '--border': '#1e293b', '--hover': '#1e1b4b', '--active-bg': '#1e293b', '--input-bg': '#0f172a' }
      };
      currentThemeStyle.value = themeRegistryMap[activeThemeId] || themeRegistryMap['dark'];
    }
  };

  // ================== 3. 生命周期 ==================
  onMounted(async () => {
    await syncTheme(); // 自动初始化主题
    
    // 🌟 神技：直接监听底层配置文件的变化，一旦设置中心改了主题，这里瞬间响应！
    unlistenTheme = await ConfigStore.listen<string>('yuki_theme', () => syncTheme());
    unlistenCustom = await ConfigStore.listen<any>('yuki_theme_custom', () => syncTheme());
  });

  onUnmounted(() => {
    // 离开时安全打扫战场
    if (unlistenTheme) unlistenTheme();
    if (unlistenCustom) unlistenCustom();
  });

  // ================== 4. 暴露接口 ==================
  return {
    currentThemeStyle,
    syncTheme
  };
}