<script setup lang="ts">
defineProps<{
  visible: boolean
  model: { defScale: number; defX: number; defY: number } | null
}>()

const emit = defineEmits<{
  close: []
  scaleChange: [value: number]
  posChange: []
}>()
</script>

<template>
  <Transition name="scale-fade">
    <div v-if="visible" class="window-modal">
      <div class="window-header">
        <span> 位置参数微调</span>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>
      <div class="sliders-section" v-if="model">
        <div class="slider-group">
          <label>缩放大小</label>
          <input type="range" :value="model.defScale" min="0.01" max="0.5" step="0.005"
            @input="emit('scaleChange', parseFloat(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="slider-group">
          <label>水平位置 (X)</label>
          <input type="range" :value="model.defX" min="-1000" max="1000" step="5"
            @input="emit('posChange')" />
        </div>
        <div class="slider-group">
          <label>垂直位置 (Y)</label>
          <input type="range" :value="model.defY" min="-1000" max="1000" step="5"
            @input="emit('posChange')" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.window-modal {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 280px; background: rgba(30, 30, 30, 0.65);
  backdrop-filter: blur(25px) saturate(150%);
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 20px 50px rgba(0,0,0,0.4); color: white;
  z-index: 2000; display: flex; flex-direction: column;
  padding: 20px; box-sizing: border-box;
}
.window-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 15px; font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px; margin-bottom: 16px;
}
.close-btn {
  background: transparent; border: none; color: white; font-size: 24px;
  cursor: pointer; opacity: 0.6; transition: 0.2s;
}
.close-btn:hover { opacity: 1; color: #ff5e5e; }

.sliders-section { display: flex; flex-direction: column; gap: 12px; }
.slider-group { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #ddd; }
input[type=range] {
  -webkit-appearance: none; appearance: none;
  width: 100%; background: rgba(255,255,255,0.2);
  height: 4px; border-radius: 2px; outline: none;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 16px; height: 16px; border-radius: 50%;
  background: #ffffff; border: 1px solid rgba(0,0,0,0.1);
  cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: translate(-50%,-45%) scale(0.95); }
</style>
