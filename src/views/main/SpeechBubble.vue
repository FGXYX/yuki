<script setup lang="ts">
defineProps<{
  visible: boolean
  message: string
}>()
</script>

<template>
  <Transition name="bubble-pop">
    <div v-if="visible" class="yuki-speech-bubble">
      <div class="bubble-content">{{ message }}</div>
      <div class="bubble-tail"></div>
    </div>
  </Transition>
</template>

<style scoped>
.yuki-speech-bubble {
  position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
  max-width: 320px; min-width: 100px; padding: 16px 20px;
  background: rgba(30, 30, 30, 0.65);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.25);
  color: #fff; font-size: 15px; line-height: 1.6; z-index: 100;
  pointer-events: auto;
}
.yuki-speech-bubble .bubble-tail {
  content: ''; position: absolute; bottom: -10px; left: 50%;
  transform: translateX(-50%);
  border-width: 10px 10px 0; border-style: solid;
  border-color: rgba(30,30,30,0.65) transparent transparent;
  display: block; width: 0;
}
.bubble-content {
  max-height: 140px; overflow-y: auto; text-align: left;
  word-break: break-word; padding-right: 6px;
}
.bubble-content::-webkit-scrollbar { width: 4px; }
.bubble-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
.bubble-content::-webkit-scrollbar-track { background: transparent; }

.bubble-pop-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.bubble-pop-leave-active { transition: all 0.3s ease-in; }
.bubble-pop-enter-from { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
.bubble-pop-leave-to { opacity: 0; transform: translate(-50%, -10px) scale(0.9); }
</style>
