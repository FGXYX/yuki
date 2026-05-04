// src/composables/useConsole.ts
import { ref } from 'vue';
import { emit, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

// 🌟 1. 引入 Tauri v2 的底层文件系统 API
import { writeTextFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'system';

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
  source?: string;
}

const logs = ref<LogEntry[]>([]);
let isListening = false;
let isLoaded = false;
let isHijacked = false;

// 原生方法备份
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

const MAX_LOG_COUNT = 200;

// ==========================================
// 🌟 2. 实体日志缓冲池 (Buffer Pool)
// ==========================================
let logBuffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

export function useConsole() {
  
  // ==========================================
  // 🌟 3. 核心落盘逻辑：将缓冲池的数据刷入硬盘
  // ==========================================
  const flushLogsToDisk = async () => {
    // 如果缓冲池是空的，或者正在写入中，就跳过
    if (logBuffer.length === 0 || isFlushing) return;
    
    isFlushing = true;

    // 截取当前缓冲区的数据，并立刻清空原缓冲区，让新日志可以继续进
    const logsToWrite = [...logBuffer];
    logBuffer = [];

    try {
      // 检查系统级 AppLog 目录是否存在，不在则创建
      const dirExists = await exists('', { baseDir: BaseDirectory.AppLog });
      if (!dirExists) {
        await mkdir('', { baseDir: BaseDirectory.AppLog, recursive: true });
      }

      // 按天生成文件名，例如：yuki-2026-04-13.log
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const fileName = `yuki-${dateStr}.log`;

      // 格式化为人类易读的纯文本
      const textContent = logsToWrite.map(l => 
        `[${l.time}] [${l.level.toUpperCase()}] <${l.source || 'System'}> ${l.message}`
      ).join('\n') + '\n';

      // 追加写入实体文件 (Append 模式)
      await writeTextFile(fileName, textContent, { 
        baseDir: BaseDirectory.AppLog, 
        append: true 
      });

    } catch (err) {
      // 写入失败时，只能用系统底层的打印，千万别用 addLog，否则会死循环！
      originalError("实体日志落盘失败:", err);
    } finally {
      isFlushing = false;
    }
  };

  const loadHistoryLogs = () => {
    if (isLoaded) return;
    try {
      const saved = localStorage.getItem('yuki_developer_logs');
      if (saved) logs.value = JSON.parse(saved);
    } catch (e) {
      originalWarn("加载历史日志失败:", e);
    }
    isLoaded = true;
  };

  loadHistoryLogs();

  const initConsoleListener = async () => {
    if (isListening) return;
    isListening = true;
    
    originalLog("📡 控制台雷达已激活...");
    
    await listen<LogEntry>('yuki-broadcast-log', (event) => {
      const newLog = event.payload;
      if (!logs.value.some(l => l.id === newLog.id)) {
        logs.value = [...logs.value, newLog];
        // 🌟 将 1000 改为 MAX_LOG_COUNT
        if (logs.value.length > MAX_LOG_COUNT) logs.value.shift(); 
      }
    });

    await listen('yuki-clear-logs', () => {
      logs.value = [];
      localStorage.removeItem('yuki_developer_logs');
    });
  };

  const addLog = async (level: LogLevel, source: string, message: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    const newLog: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: timeString, level, source, message
    };

    // 1. 存入内存和缓存
    logs.value = [...logs.value, newLog];
    if (logs.value.length > MAX_LOG_COUNT) logs.value.shift();

    // 🌟 2. 扔进缓冲池准备落盘
    logBuffer.push(newLog);
    
    // 如果缓冲池超过 20 条，立刻强制刷入硬盘
    if (logBuffer.length >= 20) {
      flushLogsToDisk();
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    } else if (!flushTimer) {
      // 否则设置 3 秒定时器，3秒后不管有几条都刷入硬盘
      flushTimer = setTimeout(() => {
        flushLogsToDisk();
        flushTimer = null;
      }, 3000);
    }

    // 3. 跨窗口广播
    try {
      await emit('yuki-broadcast-log', newLog);
      const consoleWin = await WebviewWindow.getByLabel('console-room');
      if (consoleWin) await consoleWin.emit('yuki-broadcast-log', newLog);
    } catch (e) {}
  };

  const clearLogs = async () => {
    logs.value = [];
    localStorage.removeItem('yuki_developer_logs');
    
    // 🌟 清空界面日志时，顺便往实体文件里记一笔
    logBuffer.push({
      id: `log_${Date.now()}_clear`,
      time: new Date().toLocaleTimeString(),
      level: 'system',
      source: 'System',
      message: '--- 用户在控制台清空了界面日志缓存 ---'
    });
    flushLogsToDisk();

    try {
      await emit('yuki-clear-logs');
      const consoleWin = await WebviewWindow.getByLabel('console-room');
      if (consoleWin) await consoleWin.emit('yuki-clear-logs');
    } catch (e) {}
  };

  const hijackNativeConsole = () => {
    if (isHijacked) return;
    isHijacked = true;

    const formatArgs = (args: any[]) => {
      return args.map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch (e) { return '[Object]'; }
        }
        return String(arg);
      }).join(' ');
    };

    console.log = (...args) => {
      originalLog.apply(console, args); 
      addLog('info', 'F12_Log', formatArgs(args)); 
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warning', 'F12_Warn', formatArgs(args));
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', 'F12_Error', formatArgs(args));
    };
  };

  // 🛡️ 新增：应用关闭前强制刷盘，防止日志丢失
  const setupCrashProtection = () => {
    window.addEventListener('beforeunload', () => {
      if (logBuffer.length > 0 || flushTimer) {
        // 取消定时器，立即同步刷盘
        if (flushTimer) clearTimeout(flushTimer);
        flushLogsToDisk();
      }
    });
  };

  // 自动启用崩溃保护
  setupCrashProtection();

  return { logs, addLog, clearLogs, initConsoleListener, hijackNativeConsole };
}