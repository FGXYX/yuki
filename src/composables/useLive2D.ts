// src/composables/useLive2D.ts
import { ref, computed } from 'vue';
import { Live2DManager } from '@/core/Live2DManager';
import { ConfigStore } from '@/core/ConfigStore';
import { listen } from '@tauri-apps/api/event';

export function useLive2D() {
  // ================== 1. 状态与引用 ==================
  const live2dCanvas = ref<HTMLCanvasElement | null>(null);
  let manager: Live2DManager | null = null;
  
  const isModelManagerOpen = ref(false);
  const isModelHidden = ref(false);

  // 模型与换装数据
  const modelRegistry = ref([{ id: 'default_1', name: '默认常服', path: 'ele_a0/model.model3.json', defScale: 0.1, defX: 0, defY: 0 }]);
  const currentModelId = ref('default_1');
  const activeModel = computed(() => modelRegistry.value.find(m => m.id === currentModelId.value) || modelRegistry.value[0]);

  // ================== 2. 核心方法 ==================
  const getManager = () => manager;

  const loadRegistry = async () => {
    const saved = await ConfigStore.get<any[]>('yuki_models', []);
    if (saved.length > 0) {
      modelRegistry.value = saved;
    }
    const activeId = await ConfigStore.get<string>('yuki_active_id', 'default_1');
    currentModelId.value = activeId;
  };
  
  const saveRegistry = async () => {
    await ConfigStore.set('yuki_models', modelRegistry.value);
    await ConfigStore.set('yuki_active_id', currentModelId.value);
  };

  const onScaleChange = async () => { manager?.setScale(activeModel.value.defScale); await saveRegistry(); };
  const onPosChange = async () => { manager?.setPosition(activeModel.value.defX, activeModel.value.defY); await saveRegistry(); };

  /**
   * 初始化引擎与开机问候
   */
  const initEngine = async (triggerSpeechBubble: Function) => {
    if (!live2dCanvas.value) return;
    
    manager = new Live2DManager(live2dCanvas.value);
    
    const activeId = await ConfigStore.get<string>('yuki_active_id', '');
    const savedModels = await ConfigStore.get<any[]>('yuki_models', []);
    
    if (activeId && savedModels.length > 0) {
      const targetModel = savedModels.find((m: any) => m.id === activeId);
      
      if (targetModel && manager) {
        try {
          await manager.loadModel(targetModel.path, targetModel.defScale, targetModel.defX, targetModel.defY);
          setTimeout(() => { triggerSpeechBubble("主人，欢迎回来！有什么吩咐吗？"); }, 1000);
        } catch (error) {
          console.error("初始模型加载失败:", error);
          manager.clearModel();
          triggerSpeechBubble("哎呀... 启动时没能叫醒 Yuki，模型文件好像出错了。");
        }
      }
    } else {
      manager.clearModel();
    }
  };

  /**
   * 监听换装广播
   */
  const setupModelChangeListener = async (unlisteners: any[], triggerSpeechBubble?: Function) => {
    unlisteners.push(
      await listen('yuki-model-changed', async (event) => {
        const newModelId = event.payload as string;
        
        if (!newModelId || newModelId === '') {
          if (manager) manager.clearModel();
          return; 
        }

        const savedModels = await ConfigStore.get<any[]>('yuki_models', []);
        if (savedModels.length > 0) {
          const targetModel = savedModels.find((m: any) => m.id === newModelId);

          if (targetModel && manager) { 
            try {
              await manager.loadModel(
                targetModel.path, 
                targetModel.defScale || 0.1, 
                targetModel.defX || 0, 
                targetModel.defY || 0
              );
              // 同步更新当前选中的模型 ID
              currentModelId.value = newModelId;
            } catch (error) {
              console.error("换装失败:", error);
              if (triggerSpeechBubble) {
                triggerSpeechBubble("呜呜，这件衣服好像弄脏（损坏）了，换不上去了...");
              }
            }
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
