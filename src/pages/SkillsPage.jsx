import { useState, useRef } from 'react';
import { SKILLS, CATEGORIES, importFromCodexSkill } from '../agents/skills';
import { useSkillsStore } from '../store/skillsStore';

const AGENT_LABELS = {
  planner: 'Planner',
  researcher: 'Researcher',
  creator: 'Creator',
  reviewer: 'Reviewer',
};

const AGENT_COLORS = {
  planner: 'bg-purple-100 text-purple-700',
  researcher: 'bg-blue-100 text-blue-700',
  creator: 'bg-teal-100 text-teal-700',
  reviewer: 'bg-amber-100 text-amber-700',
};

function findMatchingAgents(description) {
  return Object.keys(AGENT_LABELS).filter((role) =>
    description.toLowerCase().includes(role.toLowerCase()),
  );
}

export default function SkillsPage() {
  const [filter, setFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState('file');
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const { installed, enabled, customSkills, install, uninstall, toggleEnabled, addCustomSkill } = useSkillsStore();

  const allSkills = [...SKILLS, ...customSkills];

  const filtered = filter === 'all'
    ? allSkills
    : filter === 'installed'
      ? allSkills.filter((s) => installed.includes(s.id))
      : allSkills.filter((s) => s.category === filter);

  const importSkillFromText = (text) => {
    const skill = importFromCodexSkill(text);
    addCustomSkill(skill);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { importSkillFromText(ev.target.result); setShowImport(false); }
      catch (err) { setImportError(err.message); }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setImportError(null);
    setImporting(true);
    try {
      const res = await fetch(importUrl.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      importSkillFromText(text);
      setShowImport(false);
      setImportUrl('');
    } catch (err) {
      setImportError(`获取失败: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleFolderImport = (e) => {
    const files = Array.from(e.target.files || []);
    const skillMd = files.find((f) => f.name === 'SKILL.md' || f.name.endsWith('/SKILL.md'));
    if (!skillMd) { setImportError('所选目录中未找到 SKILL.md 文件'); return; }
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { importSkillFromText(ev.target.result); setShowImport(false); }
      catch (err) { setImportError(err.message); }
    };
    reader.readAsText(skillMd);
  };

  return (
    <div className="h-full flex">
      {/* Left: Skills list — 60% */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">技能</h1>
          <button onClick={() => setShowImport(true)}
            className="px-3 py-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
            导入 SKILL.md
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          安装技能让 Agent 在不同场景下表现更专业。支持导入 Codex 格式的 SKILL.md 文件。
        </p>

        {/* Import dialog */}
        {showImport && (
          <div className="mb-6 p-5 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-purple-800">导入技能</span>
              <button onClick={() => { setShowImport(false); setImportError(null); setImportUrl(''); }}
                className="text-xs text-gray-400 hover:text-gray-600">取消</button>
            </div>

            {/* Import mode tabs */}
            <div className="flex gap-1 mb-4">
              {['file', 'url', 'folder'].map((m) => (
                <button key={m} onClick={() => { setImportMode(m); setImportError(null); }}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    importMode === m ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {m === 'file' ? '本地文件' : m === 'url' ? 'URL 导入' : '目录导入'}
                </button>
              ))}
            </div>

            {importMode === 'file' && (
              <div>
                <p className="text-xs text-gray-500 mb-2">选择 Codex 格式的 SKILL.md 文件</p>
                <input ref={fileRef} type="file" accept=".md" onChange={handleFileImport}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700" />
              </div>
            )}

            {importMode === 'url' && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  输入 SKILL.md 的 Raw URL。支持 openai/skills、LobeHub、agentskills.io 等源。
                </p>
                <div className="flex gap-2">
                  <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/openai/skills/main/skills/.curated/linear/SKILL.md"
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()} />
                  <button onClick={handleUrlImport} disabled={importing || !importUrl.trim()}
                    className="px-4 py-2 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-40 shrink-0">
                    {importing ? '获取中...' : '导入'}
                  </button>
                </div>
              </div>
            )}

            {importMode === 'folder' && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  选择包含 SKILL.md 的技能目录（支持批量导入）
                </p>
                <input type="file" ref={fileRef} webkitdirectory="" directory="" onChange={handleFolderImport}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700" />
              </div>
            )}

            {importError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{importError}</div>
            )}
          </div>
        )}

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="全部" />
          <FilterButton active={filter === 'installed'} onClick={() => setFilter('installed')} label="已安装" />
          {CATEGORIES.map((cat) => (
            <FilterButton key={cat} active={filter === cat} onClick={() => setFilter(cat)} label={cat} />
          ))}
        </div>

        {/* Skills grid */}
        <div className="grid gap-3">
          {filtered.map((skill) => {
            const isInstalled = installed.includes(skill.id);
            const isEnabled = enabled.includes(skill.id);

            return (
              <div key={skill.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isEnabled ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{skill.name}</span>
                    <p className="text-xs text-gray-500 mt-1 mb-2 leading-relaxed">{skill.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {findMatchingAgents(skill.description).map((agent) => (
                        <span key={agent} className={`text-[10px] px-2 py-0.5 rounded-full ${AGENT_COLORS[agent]}`}>
                          {AGENT_LABELS[agent]}
                        </span>
                      ))}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {skill.category}
                      </span>
                      {isEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          已启用
                        </span>
                      )}
                      {skill.custom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          自定义
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {!isInstalled ? (
                      <button onClick={() => install(skill.id)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors">
                        安装
                      </button>
                    ) : (
                      <>
                        <button onClick={() => toggleEnabled(skill.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            isEnabled
                              ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {isEnabled ? '已启用' : '启用'}
                        </button>
                        <button onClick={() => uninstall(skill.id)}
                          className="text-xs px-2 py-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          卸载
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">暂无匹配的技能</div>
          )}
        </div>
      </div>

      {/* Right: Context panel */}
      <div className="w-[360px] border-l border-gray-200 bg-white p-6 overflow-y-auto shrink-0">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">当前激活</h3>

        {enabled.length === 0 ? (
          <p className="text-sm text-gray-400">
            没有激活的技能。安装并启用技能后，它们会在下一个任务中影响对应 Agent 的行为。
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(AGENT_LABELS).map(([agentKey, agentLabel]) => {
              const agentSkills = allSkills.filter((s) =>
                enabled.includes(s.id) && findMatchingAgents(s.description).includes(agentKey),
              );
              return (
                <div key={agentKey}>
                  <div className={`text-xs font-medium mb-1 ${agentKey === 'planner' ? 'text-purple-600' : agentKey === 'researcher' ? 'text-blue-600' : agentKey === 'creator' ? 'text-teal-600' : 'text-amber-600'}`}>
                    {agentLabel}
                  </div>
                  {agentSkills.length === 0 ? (
                    <div className="text-xs text-gray-400">无</div>
                  ) : (
                    <div className="space-y-1">
                      {agentSkills.map((s) => (
                        <div key={s.id} className="text-xs text-gray-600 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-purple-400" />
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">怎么用</h3>
          <div className="text-xs text-gray-500 space-y-2">
            <p>1. 安装你需要的技能</p>
            <p>2. 启用你想在下个任务中激活的技能</p>
            <p>3. 回到工坊，正常执行任务——Agent 会自动加载对应技能</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-purple-600 text-white border-purple-600'
          : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
      }`}
    >
      {label}
    </button>
  );
}
