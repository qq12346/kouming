/**
 * 叩鸣·工坊 — 知识库管理器
 *
 * 本地知识库：上传文件 → 提取文本 → 分块存储 → 关键词检索。
 * 所有数据存储在 IndexedDB，不上传服务器。
 */

const DB_NAME = 'kouming-kb';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('addedAt', 'addedAt', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export const KnowledgeBase = {
  /** 上传文本文档 */
  async uploadFile(file) {
    const text = await readFileAsText(file);
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const chunks = chunkText(text, 1000);

    const doc = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      content: text,
      chunks,
      addedAt: Date.now(),
      source: 'user_uploaded',  // 费曼+波兹曼要求：标注是自己上传的
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(doc);
      tx.oncomplete = () => resolve(doc);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  /** 列出所有文档 */
  async listDocuments() {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  },

  /** 删除文档 */
  async deleteDocument(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  /** 关键词检索 */
  async search(query, maxResults = 3) {
    const docs = await this.listDocuments();
    const results = [];

    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        if (chunk.toLowerCase().includes(query.toLowerCase())) {
          // 提取上下文
          const idx = doc.content.toLowerCase().indexOf(query.toLowerCase());
          const start = Math.max(0, idx - 200);
          const end = Math.min(doc.content.length, idx + query.length + 200);
          const snippet = doc.content.slice(start, end);

          results.push({
            docId: doc.id,
            docName: doc.name,
            snippet: (start > 0 ? '...' : '') + snippet + (end < doc.content.length ? '...' : ''),
            relevance: (chunk.match(new RegExp(query, 'gi')) || []).length,
            source: doc.source,
          });
        }
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  },

  /** 获取检索上下文（用于注入 Agent prompt） */
  async getContext(query, maxTokens = 500) {
    const results = await this.search(query, 2);
    if (results.length === 0) return null;

    return results
      .map((r) => `[来源: ${r.docName}]\n${r.snippet}`)
      .join('\n\n')
      .slice(0, maxTokens * 2); // rough token estimate
  },
};

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e.target.error);
    reader.readAsText(file);
  });
}

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
