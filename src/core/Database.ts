import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

// 1. 获取数据库实例（Tauri 会自动在 AppData 目录下创建 yuki_memory.db）
export const getDB = async () => {
  if (!db) {
    db = await Database.load('sqlite:yuki_memory.db');
  }
  return db;
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

  // 3. 性能索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_session_id ON chat_history(session_id)
  `);
}


// 读取历史记录
export async function fetchHistory(limit: number = 50, sessionId: string = 'default') {
  if (!db) return [];
  const result = await db.select<{role: string, content: string, created_at: string}[]>(
    `SELECT role, content, created_at FROM (SELECT * FROM chat_history WHERE session_id = $1 ORDER BY id DESC LIMIT $2) ORDER BY id ASC`, 
    [sessionId, limit]
  );
  return result;
}

// 存入数据
export async function insertMessage(role: string, content: string, sessionId: string = 'default') {
  if (!db) return;
  await db.execute(
    `INSERT INTO chat_history (role, content, session_id, created_at) VALUES ($1, $2, $3, datetime('now', 'localtime'))`, 
    [role, content, sessionId]
  );
}

// 清空特定会话的记忆
export async function clearHistoryDB(sessionId: string = 'default') {
  if (!db) return;
  await db.execute(`DELETE FROM chat_history WHERE session_id = $1`, [sessionId]);
}

// 归档旧消息（带事务保护）
export async function archiveOldMessages(days: number = 30) {
  if (!db) return 0;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString();

    // 用事务包裹 INSERT + DELETE，防止中间状态丢数据
    await db.execute(`BEGIN TRANSACTION`);

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
    
    // 2. 将旧数据复制到归档表
    const result = await db.execute(
      `INSERT INTO chat_history_archive SELECT * FROM chat_history WHERE created_at < $1`,
      [cutoffStr]
    );
    
    // 3. 从主表删除已归档的数据
    await db.execute(
      `DELETE FROM chat_history WHERE created_at < $1`,
      [cutoffStr]
    );

    await db.execute(`COMMIT`);
    
    console.log(`📦 已归档 ${result.rowsAffected || 0} 条旧消息（${days}天前）`);
    return result.rowsAffected || 0;
  } catch (error) {
    // 事务回滚
    try { await db.execute(`ROLLBACK`); } catch (e) {}
    console.error('❌ 归档旧消息失败:', error);
    return 0;
  }
}

// 获取数据库统计信息
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
