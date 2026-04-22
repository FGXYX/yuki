// src/composables/useLive2D.ts
import { ref, computed } from 'vue';
import { Live2DManager } from '@/core/Live2DManager';
import { listen } from '@tauri-apps/api/event';

export function useLive2D() {
  // ================== 1. 状态与引用 ==================
  const live2dCanvas = ref<HTMLCanvasElement | null>(null);
  let manager: Live2DManager | null = null;
  
  const isModelManagerOpen = ref(false); // 换装微调面板的开关

  const isModelHidden = ref(false);      // 虚化穿透时的隐藏状态

  // 模型与换装数据
  const modelRegistry = ref([{ id: 'default_1', name: '默认常服', path: 'ele_a0/model.model3.json', defScale: 0.1, defX: 0, defY: 0 }]);
  const currentModelId = ref('default_1');
  const activeModel = computed(() => modelRegistry.value.find(m => m.id === currentModelId.value) || modelRegistry.value[0]);

  // ================== 2. 核心方法 ==================
  
  // 提供给外部获取 manager 实例的入口（比如动作面板需要用到）
  const getManager = () => manager;

  const loadRegistry = () => { /* 预留的 localStorage 逻辑，目前在 setupModelChangeListener 中动态获取 */ };
  
  const saveRegistry = () => { 
    localStorage.setItem('yuki_models', JSON.stringify(modelRegistry.value)); 
    localStorage.setItem('yuki_active_id', currentModelId.value); 
  };

  const onScaleChange = () => { manager?.setScale(activeModel.value.defScale); saveRegistry(); };
  const onPosChange = () => { manager?.setPosition(activeModel.value.defX, activeModel.value.defY); saveRegistry(); };

  // 🌟 初始化引擎与开机问候
  const initEngine = async (triggerSpeechBubble: Function) => {
    if (!live2dCanvas.value) return;
    
    manager = new Live2DManager(live2dCanvas.value);
    
    const activeId = localStorage.getItem('yuki_active_id');
    const savedModelsStr = localStorage.getItem('yuki_models');
    
    if (activeId && savedModelsStr) {
      const savedModels = JSON.parse(savedModelsStr);
      const targetModel = savedModels.find((m: any) => m.id === activeId);
      if (targetModel && manager) {
        await manager.loadModel(targetModel.path, targetModel.defScale, targetModel.defX, targetModel.defY);
        setTimeout(() => { triggerSpeechBubble("主人，欢迎回来！有什么吩咐吗？"); }, 1000);
      }
    } else {
      manager.clearModel();
    }
  };

  // 🌟 监听来自设置中心的“换装”广播
  const setupModelChangeListener = async (unlisteners: any[]) => {
    unlisteners.push(
      await listen('yuki-model-changed', async (event) => {
        const newModelId = event.payload as string;
        
        if (!newModelId || newModelId === '') {
          if (manager) manager.clearModel();
          return; 
        }

        const savedModelsStr = localStorage.getItem('yuki_models');
        if (savedModelsStr) {
          const savedModels = JSON.parse(savedModelsStr);
          const targetModel = savedModels.find((m: any) => m.id === newModelId);

          if (targetModel && manager) { 
            await manager.loadModel(
              targetModel.path, 
              targetModel.defScale || 0.1, 
              targetModel.defX || 0, 
              targetModel.defY || 0
            );
          }
        }
      })
    );
  };

  // ================== 3. 暴露接口 ==================
  return {
    live2dCanvas, isModelManagerOpen, isModelHidden, activeModel,
    getManager, loadRegistry, onScaleChange, onPosChange, initEngine, setupModelChangeListener
  };
}