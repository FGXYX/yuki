import Database from '@tauri-apps/plugin-sql';


let dbInstance: Database | null = null;
// 🌟 声明全局的 db 实例变量
let db: Database | null = null;

// 1. 获取数据库实例（Tauri 会自动在 AppData 目录下创建 yuki_data.db）
export const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:yuki_data.db');
  }
  return dbInstance;
};

// 2. 初始化建表（开机时调用一次即可）
export async function initDB() {
  db = await Database.load('sqlite:yuki_memory.db');
  
  // 1. 创建基础表结构
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 2. 兼容性升级：为老数据库热更新 session_id 字段
  try { 
    await db.execute(`ALTER TABLE chat_history ADD COLUMN session_id TEXT DEFAULT 'default'`); 
  } catch (e) { }

  // 🌟 3. 性能核武器：为 session_id 建立索引！
  // 加上这一行，以后不管这张表里存了上百万条还是千万条消息，查询特定对话瞬间就能完成。
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_session_id ON chat_history(session_id)
  `);
}


// 🌟 读取历史记录时，根据 sessionId 筛选 (已补全 created_at)
export async function fetchHistory(limit: number = 50, sessionId: string = 'default') {
  if (!db) return [];
  // 1. 补全泛型定义，告诉 TS 这里面有 created_at
  const result = await db.select<{role: string, content: string, created_at: string}[]>(
    // 2. 补全 SQL 语句，把 created_at 查出来
    `SELECT role, content, created_at FROM (SELECT * FROM chat_history WHERE session_id = $1 ORDER BY id DESC LIMIT $2) ORDER BY id ASC`, 
    [sessionId, limit]
  );
  return result;
}

// 🌟 存入数据时，带上 sessionId
export async function insertMessage(role: string, content: string, sessionId: string = 'default') {
  if (!db) return;
  await db.execute(
    // 修复：手动指定 created_at，并使用 SQLite 内置的 datetime('now', 'localtime') 转换时区
    `INSERT INTO chat_history (role, content, session_id, created_at) VALUES ($1, $2, $3, datetime('now', 'localtime'))`, 
    [role, content, sessionId]
  );
}

// 🌟 清空特定会话的记忆
export async function clearHistoryDB(sessionId: string = 'default') {
  if (!db) return;
  await db.execute(`DELETE FROM chat_history WHERE session_id = $1`, [sessionId]);
}

// 🛡️ 新增：归档旧消息（30天以上数据移至备份表）
export async function archiveOldMessages(days: number = 30) {
  if (!db) return 0;
  
  try {
    // 1. 创建归档表（如果不存在）
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_history_archive (
        id INTEGER PRIMARY KEY,
        role TEXT,
        content TEXT,
        created_at DATETIME,
        session_id TEXT
      )
    `);
    
    // 2. 计算 cutoff 日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString();
    
    // 3. 将旧数据复制到归档表
    // 注意：Tauri SQL plugin 通常使用 ? 作为占位符，或者 $1, $2 等。
    // 之前的代码使用了 $1, $2, $3，这里为了保持一致性，如果底层驱动支持命名参数或位置参数需确认。
    // 但 sqlite 通常支持 ?。鉴于上文 initDB 中使用了 $1，我们尝试保持风格，但 sqlite 原生通常用 ?。
    // Tauri plugin-sql 对 sqlite 使用 ? 占位符更常见，但之前的代码用了 $1。
    // 让我们检查之前的用法: insertMessage 使用了 $1, $2, $3。
    // 如果之前的代码能运行，说明插件处理了 $1。我们将继续使用 $1 以保持一致。
    
    const result = await db.execute(
      `INSERT INTO chat_history_archive SELECT * FROM chat_history WHERE created_at < $1`,
      [cutoffStr]
    );
    
    // 4. 从主表删除已归档的数据
    await db.execute(
      `DELETE FROM chat_history WHERE created_at < $1`,
      [cutoffStr]
    );
    
    console.log(`📦 已归档 ${result.rowsAffected || 0} 条旧消息（${days}天前）`);
    return result.rowsAffected || 0;
  } catch (error) {
    console.error('❌ 归档旧消息失败:', error);
    return 0;
  }
}

// 🛡️ 新增：获取数据库统计信息
export async function getDatabaseStats() {
  if (!db) return { total: 0, archived: 0 };
  
  try {
    const totalResult = await db.select<{count: number}[]>(
      `SELECT COUNT(*) as count FROM chat_history`
    );
    
    let archivedCount = 0;
    try {
      const archivedResult = await db.select<{count: number}[]>(
        `SELECT COUNT(*) as count FROM chat_history_archive`
      );
      archivedCount = archivedResult[0]?.count || 0;
    } catch (e) {
      // 如果归档表不存在，计数为0
      archivedCount = 0;
    }
    
    return {
      total: totalResult[0]?.count || 0,
      archived: archivedCount
    };
  } catch (error) {
    console.error('❌ 获取数据库统计失败:', error);
    return { total: 0, archived: 0 };
  }
}