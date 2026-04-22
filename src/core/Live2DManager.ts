import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

const appWindow = getCurrentWindow();
(window as any).PIXI = PIXI;

export class Live2DManager {
  private app: PIXI.Application;
  private currentModel: Live2DModel | null = null;
  private windowX = 0;
  private windowY = 0;

  constructor(canvasElement: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvasElement,
      autoStart: true,
      backgroundAlpha: 0,
      resizeTo: window,
      resolution: window.devicePixelRatio || 1,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    appWindow.outerPosition().then(pos => {
      this.windowX = pos.x;
      this.windowY = pos.y;
    });
    appWindow.onMoved(({ payload: pos }) => {
      this.windowX = pos.x;
      this.windowY = pos.y;
    });
  }

  // 🌟 修改点：支持传入 scale, x, y
  public async loadModel(modelUrl: string, scale: number, x: number, y: number) {
    try {
      // 🌟 性能优化：切换模型前，深度销毁旧模型并释放显存
      if (this.currentModel) {
        try {
          this.app.stage.removeChild(this.currentModel);
          // ⚠️ 传入 { children: true, texture: true, baseTexture: true } 强制清空贴图内存！
          this.currentModel.destroy({ children: true, texture: true, baseTexture: true });
        } catch (e) {
          console.warn("销毁旧模型时跳过异常:", e);
        }
        this.currentModel = null; 
        
        // 顺手清理一下 PixiJS 的全局纹理缓存缓存垃圾
        PIXI.utils.clearTextureCache();
      }

      const model = await Live2DModel.from(modelUrl);
      this.currentModel = model;

      // 🌟 应用传入的初始参数
      model.scale.set(scale);
      model.x = x;
      model.y = y;

      this.app.stage.addChild(model);
      console.log(`✅ 模型加载成功: ${modelUrl}`);

      model.interactive = true;
      model.cursor = 'default';

      listen('global-mouse-move', (event) => {
        const [globalX, globalY] = event.payload as [number, number];
        const localX = (globalX - this.windowX) / window.devicePixelRatio;
        const localY = (globalY - this.windowY) / window.devicePixelRatio;
        model.focus(localX, localY);
      });

    } catch (error) {
      console.error('❌ 模型加载失败:', error);
    }
  }

  // ================= 🌟 动作系统核心功能 🌟 =================

  // 1. 动态获取当前模型的所有动作分类及清单
  public getMotionList() {
    // ⚠️ 修正：使用 this.currentModel
    if (!this.currentModel || !this.currentModel.internalModel) return {};
    
    const definitions = this.currentModel.internalModel.motionManager.definitions;
    if (!definitions) return {};

    const list: Record<string, string[]> = {};
    Object.keys(definitions).forEach(group => {
      const motions = definitions[group];
      if (Array.isArray(motions)) {
        list[group] = motions.map((m: any, index: number) => {
          return m.File ? m.File.split('/').pop().replace('.motion3.json', '') : `动作 ${index + 1}`;
        });
      }
    });
    return list;
  }

  // 2. 播放指定的具体动作 (供动作面板点选使用)
  public playSpecificMotion(group: string, index: number) {
    if (!this.currentModel) return;
    console.log(`▶️ 正在播放具体动作: 组[${group}] 索引[${index}]`);
    this.currentModel.motion(group, index);
  }

  // 3. 智能播放随机非待机动作 (供按钮或点击身体使用)
  public playRandomAction() {
    if (!this.currentModel || !this.currentModel.internalModel) return;

    const definitions = this.currentModel.internalModel.motionManager.definitions;
    if (!definitions) return;

    const allGroups = Object.keys(definitions);
    if (allGroups.length === 0) return;

    // 智能过滤：尽量排除 "Idle" (待机) 组
    let candidateGroups = allGroups.filter(name => !name.toLowerCase().includes('idle'));
    if (candidateGroups.length === 0) {
      candidateGroups = allGroups; // 兜底
    }

    const randomGroup = candidateGroups[Math.floor(Math.random() * candidateGroups.length)];
    console.log(`▶️ 随机触发动作组: ${randomGroup}`);
    this.currentModel.motion(randomGroup);
  }

  // 🌟 新增：彻底清空当前桌宠模型的方法（强化版）
  public clearModel() {
    if (this.currentModel) {
      try {
        this.app.stage.removeChild(this.currentModel);
        // ⚠️ 强制释放所有子节点、纹理、基础纹理
        this.currentModel.destroy({ 
          children: true, 
          texture: true, 
          baseTexture: true 
        });
      } catch (e) {
        console.warn("清空模型时跳过异常:", e);
      }
      this.currentModel = null;
      
      // 🛡️ 清理 PixiJS 全局纹理缓存，防止内存泄漏
      PIXI.utils.clearTextureCache();
      console.log("🧹 模型资源已深度清理");
    }
  }
  
  // 🌟🌟🌟 新增：内存监控工具（开发模式下使用）
  public getMemoryUsage() {
    const textures = Object.keys(PIXI.utils.TextureCache).length;
    const baseTextures = Object.keys(PIXI.utils.BaseTextureCache).length;
    const modelsInStage = this.app.stage.children.length;
    
    const usage = {
      textures,
      baseTextures,
      modelsInStage,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📊 PixiJS 内存状态 | 纹理: ${textures} | 基础纹理: ${baseTextures} | 舞台对象: ${modelsInStage}`);
    return usage;
  }
  
  // 🌟 定期清理孤儿纹理（可选：在空闲时调用）
  public cleanupOrphanedTextures() {
    // 仅在开发模式下输出日志
    if (import.meta.env.DEV) {
      this.getMemoryUsage();
    }
    PIXI.utils.clearTextureCache();
  }
  // 🌟🌟🌟 新增：为后台截帧引擎准备的“自爆程序” 🌟🌟🌟
  // 连同整个 WebGL 画布上下文一起炸掉，一滴显存都不留
  public destroyApp() {
    this.clearModel();
    if (this.app) {
      // 销毁整个 Pixi Application，释放 WebGL Context
      this.app.destroy(true, { children: true, texture: true, baseTexture: true });
    }
  }
  // 🌟 新增：独立控制缩放
  public setScale(scale: number) {
    if (this.currentModel) {
      this.currentModel.scale.set(scale);
    }
  }

  // 🌟 新增：独立控制位置
  public setPosition(x: number, y: number) {
    if (this.currentModel) {
      this.currentModel.x = x;
      this.currentModel.y = y;
    }
  }
  public startDragging() {
    appWindow.startDragging();
  }

  
}