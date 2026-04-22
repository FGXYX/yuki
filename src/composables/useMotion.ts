// src/composables/useMotion.ts
import { ref } from 'vue';
import { MotionAliasStore } from '@/core/MotionAliasStore';

export function useMotion() {
  // ================== 1. 状态定义 ==================
  const isActionListOpen = ref(false);
  const currentMotions = ref<Record<string, string[]>>({});
  const isEditingActions = ref(false);
  const savedAliases = ref<Record<string, string>>({});
  const editingAliases = ref<Record<string, string>>({});
  
  let motionAliasStore: MotionAliasStore | null = null;

  // ================== 2. 核心方法 ==================
  
  // 打开动作面板并读取硬盘数据
  const openActionPanel = async (manager: any, triggerSpeechBubble: Function, closeMenuFn: Function) => {
    if (!manager) {
      triggerSpeechBubble('模型还没准备好哦~', 3000);
      return;
    }

    try {
      currentMotions.value = manager.getMotionList();
      
      let targetModelUrl = 'default_model';
      const activeId = localStorage.getItem('yuki_active_id');
      const modelsStr = localStorage.getItem('yuki_models');
      
      if (activeId && modelsStr) {
        const models = JSON.parse(modelsStr);
        const currentModel = models.find((m: any) => m.id === activeId);
        if (currentModel && currentModel.path) {
          targetModelUrl = currentModel.path;
        }
      }

      motionAliasStore = new MotionAliasStore(targetModelUrl);
      const rawData = await motionAliasStore.getAliases();
      
      savedAliases.value = JSON.parse(JSON.stringify(rawData || {}));
      editingAliases.value = JSON.parse(JSON.stringify(rawData || {})); 
      
      isActionListOpen.value = true;
      isEditingActions.value = false; 
      
      closeMenuFn(); // 执行外部传进来的关菜单回调

    } catch (err: any) {
      console.error("❌ 动作面板崩溃:", err);
      triggerSpeechBubble(`呜...读取动作列表失败了: ${err.message}`, 6000);
    }
  };

  // 切换编辑/展示模式
  const toggleActionEditMode = () => {
    if (isEditingActions.value) {
      isEditingActions.value = false;
      editingAliases.value = { ...savedAliases.value }; // 取消时覆盖回原样
    } else {
      isEditingActions.value = true;
    }
  };

  // 保存动作重命名到硬盘
  const saveMotionAliases = async (triggerSpeechBubble: Function) => {
    if (motionAliasStore) {
      const plainData = JSON.parse(JSON.stringify(editingAliases.value));
      await motionAliasStore.saveAliases(plainData);
      
      savedAliases.value = { ...plainData };
      isEditingActions.value = false;
      triggerSpeechBubble('好耶！所有的动作都被贴上专属标签啦！', 4000);
    }
  };

  // 播放指定的动作
  const playAction = (manager: any, group: string, index: number) => {
    if (manager) {
      manager.playSpecificMotion(group, index);
    }
  };

  // ================== 3. 对外暴露接口 ==================
  return {
    isActionListOpen, currentMotions, isEditingActions, savedAliases, editingAliases,
    openActionPanel, toggleActionEditMode, saveMotionAliases, playAction
  };
}