<script setup lang="ts">
defineProps<{
  isMenuOpen: boolean
  isDocked: boolean
  isAlwaysOnTop: boolean
  isFadeMode: boolean
  isAutoVoiceMode: boolean
  isRecording: boolean
  isChatInputOpen: boolean
  menuItems: { id: string; label: string; icon: string }[]
}>()

const emit = defineEmits<{
  toggleMenu: []
  startDrag: []
  itemClick: [item: { id: string; label: string; icon: string }]
  mouseEnter: []
  mouseLeave: []
}>()

const UI_DOTS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="16" fill="currentColor"></circle><circle cx="128" cy="64" r="16" fill="currentColor"></circle><circle cx="128" cy="192" r="16" fill="currentColor"></circle></svg>'
const UI_CROSS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><line x1="200" y1="56" x2="56" y2="200" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line><line x1="200" y1="200" x2="56" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"></line></svg>'
const UI_DRAG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16" d="M128,40V216M88,80l40-40,40,40M88,176l40,40,40-40M40,128H216M80,88,40,128l40,40M176,88l40,40-40,40"></path></svg>'
</script>

<template>
  <div :class="['control-panel', { 'is-docked': isDocked }]"
    @mouseenter="emit('mouseEnter')" @mouseleave="emit('mouseLeave')">
    <div class="main-buttons">
      <button :class="['circle-btn', 'toggle-btn', { 'is-active': isMenuOpen }]"
        @click="emit('toggleMenu')" title="功能菜单">
        <span class="icon-wrap" v-html="isMenuOpen ? UI_CROSS : UI_DOTS"></span>
      </button>
      <Transition name="fab-pop">
        <button v-show="isMenuOpen" class="circle-btn drag-btn" @mousedown="emit('startDrag')" title="拖动角色">
          <span class="icon-wrap" v-html="UI_DRAG"></span>
        </button>
      </Transition>
    </div>

    <Transition name="slide-fade">
      <div v-show="isMenuOpen" class="grid-menu">
        <button v-for="item in menuItems" :key="item.id"
          :class="[
            'icon-btn',
            {
              'is-active': (item.id === 'pin' && isAlwaysOnTop) ||
                           (item.id === 'fade' && isFadeMode) ||
                           (item.id === 'chat' && isChatInputOpen) ||
                           (item.id === 'voice' && isAutoVoiceMode),
              'is-hearing': item.id === 'voice' && isRecording
            }
          ]"
          :data-label="item.label"
          @click="emit('itemClick', item)">
          <span class="icon-wrap" v-html="item.icon"></span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute; top: 30px; right: 30px; z-index: 1000;
  transition: transform 0.5s ease, opacity 0.5s ease;
}
.control-panel.is-docked { transform: scale(0.85); transform-origin: top right; opacity: 0.3; }
.control-panel.is-docked:hover { opacity: 1; }

.main-buttons { position: relative; width: 48px; height: 48px; display: flex; justify-content: center; }

.circle-btn {
  border-radius: 50%; border: 1px solid rgba(255,255,255,0.15);
  background-color: rgba(30,30,30,0.65);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: #fff; cursor: pointer;
  display: flex; justify-content: center; align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.toggle-btn { position: absolute; z-index: 2; top: 0; width: 48px; height: 48px; }
.toggle-btn:hover { background-color: rgba(60,60,60,0.8); transform: scale(1.05); }
.toggle-btn.is-active { transform: rotate(90deg); background-color: rgba(40,40,40,0.75); border-color: rgba(255,255,255,0.25); }
.drag-btn { position: absolute; z-index: 1; top: 60px; width: 40px; height: 40px; }
.drag-btn:hover { background-color: rgba(80,80,80,0.8); transform: scale(1.05); }
.drag-btn:active { cursor: grabbing; transform: scale(0.92); background-color: rgba(50,50,50,0.8); border-color: rgba(255,255,255,0.3); }

.icon-wrap { display: flex; justify-content: center; align-items: center; width: 22px; height: 22px; }
.icon-wrap svg { width: 100%; height: 100%; color: #ffffff; display: block; }

.grid-menu {
  position: absolute; top: 0; right: 60px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  background: rgba(30,30,30,0.65);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  padding: 16px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  transform-origin: top right;
}
.icon-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(70,70,70,0.8), rgba(30,30,30,0.6));
  border: 1px solid rgba(255,255,255,0.15); color: white;
  display: flex; justify-content: center; align-items: center;
  cursor: pointer; position: relative;
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15);
}
.icon-btn:hover {
  background: linear-gradient(135deg, rgba(90,90,90,0.9), rgba(50,50,50,0.7));
  border-color: rgba(255,255,255,0.3);
  transform: translateY(-3px) scale(1.08);
  box-shadow: 0 8px 20px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.25);
}
.icon-btn::after {
  content: attr(data-label); position: absolute;
  bottom: calc(100% + 12px); left: 50%;
  transform: translateX(-50%) translateY(5px);
  background-color: rgba(0,0,0,0.8); color: #fff;
  font-size: 12px; font-weight: 500; padding: 6px 10px; border-radius: 8px;
  white-space: nowrap; pointer-events: none; opacity: 0; transition: all 0.2s ease;
}
.icon-btn:hover::after { opacity: 1; transform: translateX(-50%) translateY(0); }
.icon-btn.is-active {
  background: linear-gradient(135deg, #4facfe, color-mix(in srgb, #4facfe 50%, #000));
  border-color: rgba(255,255,255,0.4);
  box-shadow: 0 4px 15px color-mix(in srgb, #4facfe 60%, transparent), inset 0 1px 3px rgba(255,255,255,0.3);
}
.icon-btn.is-hearing {
  background: linear-gradient(135deg, rgba(239,68,68,0.8), rgba(185,28,28,0.9)) !important;
  border-color: #f87171 !important;
  box-shadow: 0 0 15px rgba(239,68,68,0.6) !important;
  animation: mic-pulse-danger 1.2s infinite !important;
}
@keyframes mic-pulse-danger {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
  70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}

.fab-pop-enter-active, .fab-pop-leave-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.fab-pop-enter-from, .fab-pop-leave-to { opacity: 0; transform: translateY(-30px) scale(0.5); }
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: scale(0.6) translate(30px,-30px); opacity: 0; }
</style>
