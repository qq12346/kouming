import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useIntentStore } from '../store/intentStore';
import { useAgentStore } from '../store/agentStore';
import { useGuardianStore } from '../store/guardianStore';
import { useUserStore } from '../store/userStore';
import { AuditCollector } from '../audit/collector';
import { orchestrate, improveIteration } from '../orchestrator';
import Markdown from '../components/Markdown';
import { buildMarkdownExport, downloadMarkdown } from '../utils/export';

const VALUE_LABELS = {
  speed: { speed: '快速', accuracy: '准确', depth: '深度' },
  coverage: { coverage: '全面', focus: '聚焦', key_points: '关键点' },
  novelty: { novelty: '创新', feasibility: '可行', reliability: '可靠' },
};

export default function AssemblyLine() {
  const navigate = useNavigate();
  const { intent, trace, values, status: intentStatus, setStatus } = useIntentStore();
  const apiKey = useUserStore((s) => s.apiKey);
  const guardianAlerts = useGuardianStore((s) => s.alerts);
  const {
    agentOutputs, currentStep, totalSteps, status: execStatus, setStatus: setExecStatus,
    result, setResult, skipSteps: storedSkips, setSkipSteps: storeSkips,
    userEdits: storedEdits, setUserEdits: storeEdits,
    error: storeError, setError: setStoreError,
  } = useAgentStore();

  const [skipSteps] = useState(new Set(storedSkips));
  const [userEdits, setLocalEdits] = useState(storedEdits);
  const [editingStep, setEditingStep] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [rebuttals, setRebuttals] = useState({});
  const [error, setError] = useState(storeError);
  const [iterations, setIterations] = useState([]); // Reflexion 多轮改进结果
  const [improving, setImproving] = useState(false);

  const updateSkipSteps = (s) => { storeSkips(Array.from(s)); };
  const updateUserEdits = (e) => { storeEdits(e); setLocalEdits(e); };
  const updateResult = (r) => { setResult(r); };
  const updateError = (e) => { setError(e); setStoreError(e); };

  useEffect(() => {
    if (intentStatus !== 'confirmed' || !intent.goal) navigate('/');
  }, []);

  // On mount: auto-resume if interrupted, start fresh if idle
  useEffect(() => {
    if (intentStatus !== 'confirmed') return;
    if (execStatus === 'completed') return;
    if (execStatus === 'running' && result) {
      runOrchestration(true); // 断点续跑
    } else if (execStatus === 'idle' && !result) {
      runOrchestration(false);
    }
  }, []);

  const runOrchestration = useCallback(async (resume = false) => {
    if (!apiKey) { updateError('请先配置 DeepSeek API Key'); return; }
    updateError(null);
    try {
      const r = await orchestrate({
        apiKey, intent, trace, values,
        options: { skipSteps: Array.from(skipSteps), userEdits, simpleMode: intent.simpleMode || false },
        savedResult: resume ? result : null,
      });
      updateResult(r);
    } catch (e) { updateError(e.message); }
  }, [apiKey, intent, trace, values, skipSteps, userEdits, result]);

  const handleImprove = async () => {
    if (!apiKey || !result?.review) return;
    if (iterations.length >= 5) return;
    setImproving(true);
    try {
      const r = await improveIteration({ apiKey, intent, trace, values, review: result.review });
      setIterations([...iterations, r]);
    } catch (e) { setError(`改进失败: ${e.message}`); }
    setImproving(false);
  };

  const toggleSkipStep = (stepId) => {
    const next = new Set(skipSteps);
    next.has(stepId) ? next.delete(stepId) : next.add(stepId);
    updateSkipSteps(next);
    if (next.has(stepId)) {
      setEditingStep(stepId);
      setEditContent('');
    }
  };

  const submitUserEdit = (stepId) => {
    updateUserEdits({ ...userEdits, [stepId]: editContent });
    AuditCollector.stepUserDid(stepId);
    setEditingStep(null);
    setExecStatus('idle');
    updateResult(null);
    setTimeout(() => runOrchestration(), 0);
  };

  const rebutAssumption = (stepId, correction) => {
    setRebuttals((prev) => ({ ...prev, [stepId]: correction }));
    AuditCollector.assumptionRebuttal(stepId);
  };

  const constitutionStatus = result
    ? (result.plan?.constitution?.status === 'block' || result.creatorResults?.some((r) => r.constitution?.status === 'block')
      ? 'block' : result.creatorResults?.some((r) => r.constitution?.status === 'warn') ? 'warn' : 'pass')
    : null;

  return (
    <div className="h-full flex">
      {/* LEFT: Agent output area — 60% */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {execStatus === 'running' && !result && (
          <div className="space-y-4">
            {agentOutputs.length === 0 && (
              <div className="py-20 text-center">
                <div className="text-sm text-gray-400 mb-2 animate-pulse">Planner 正在拆解你的意图...</div>
                <div className="text-xs text-gray-300">{intent.goal}</div>
              </div>
            )}
            {agentOutputs.map((out, i) => (
              <AgentCard key={i} agent={out.agent} output={out.output} status={out.constitution} subtaskId={out.subtaskId} />
            ))}
          </div>
        )}

        {error && (
          <div className="py-12 text-center">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl inline-block text-left">
              <div className="text-sm font-medium text-red-800 mb-1">执行出错</div>
              <div className="text-xs text-red-600">{error}</div>
            </div>
            <button onClick={() => { updateError(null); setExecStatus('idle'); updateResult(null); setTimeout(runOrchestration, 0); }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg">重试</button>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Planner */}
            <div className="p-5 rounded-xl" style={{ border: '1px solid var(--color-ai-border)', background: 'var(--color-ai-bg)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-ai)' }}>Planner</span>
                <ConstitutionBadge status={result.plan?.constitution?.status} />
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {result.plan?.subtasks?.map((st) => (
                  <span key={st.id} className="text-xs px-3 py-1.5 bg-white rounded-full border border-purple-200 text-purple-700 font-medium">
                    {st.id}. {st.title}
                  </span>
                ))}
              </div>
              {result.plan?.reasoning && (
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-purple-200">
                  拆解依据：{result.plan.reasoning}
                </div>
              )}
            </div>

            {/* Creator results */}
            {result.creatorResults?.map((item) => (
              <div key={item.subtask.id} className="p-5 rounded-xl" style={{ border: '1px solid var(--color-ai-border)', background: 'var(--color-ai-bg)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-ai)' }}>
                      Creator #{item.subtask.id}
                    </span>
                    {item.constitution && <ConstitutionBadge status={item.constitution.status} />}
                  </div>
                  <button onClick={() => toggleSkipStep(item.subtask.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      skipSteps.has(item.subtask.id) || userEdits[item.subtask.id]
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'text-gray-500 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {skipSteps.has(item.subtask.id) || userEdits[item.subtask.id] ? '自己做的' : '自己做'}
                  </button>
                </div>

                {editingStep === item.subtask.id ? (
                  <div className="space-y-3">
                    <textarea className="w-full h-32 p-4 border border-purple-200 rounded-xl text-sm bg-white" value={editContent}
                      onChange={(e) => setEditContent(e.target.value)} placeholder="在这里完成这个子任务..." />
                    <div className="flex gap-2">
                      <button onClick={() => submitUserEdit(item.subtask.id)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg">提交，继续</button>
                      <button onClick={() => { const n = new Set(skipSteps); n.delete(item.subtask.id); updateSkipSteps(n); setEditingStep(null); }}
                        className="px-4 py-2 text-sm text-gray-500">取消</button>
                    </div>
                  </div>
                ) : userEdits[item.subtask.id] ? (
                  <div className="p-3 rounded-lg text-sm text-gray-700 bg-green-50 border border-green-200">
                    {userEdits[item.subtask.id]}
                  </div>
                ) : (
                  <>
                  <CreatorContent content={item.content} />

                  {/* Assumptions — 追问宪法：不可折叠 */}
                    {item.assumptions && (
                      <div className="mt-4 p-3 rounded-lg text-xs"
                        style={{ background: 'var(--color-assumption-bg)', border: '1px solid #FAC775' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium" style={{ color: 'var(--color-assumption)' }}>我的假设</span>
                          {rebuttals[item.subtask.id] && (
                            <span className="text-green-700">已有修正</span>
                          )}
                        </div>
                        <Markdown className="whitespace-pre-wrap text-xs" style={{ color: '#854F0B' }} text={item.assumptions} />
                        {!rebuttals[item.subtask.id] && (
                          <input className="mt-2 w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white
                                             focus:outline-none focus:ring-1 focus:ring-amber-400"
                            placeholder="不对——我认为..."
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { rebutAssumption(item.subtask.id, e.target.value.trim()); e.target.value = ''; } }}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {result.review && (
              <div className="p-4 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Reviewer #{iterations.length + 1}</span>
                  <span className="text-xs text-gray-500">
                    综合评分 {result.review.overall}/5
                    {result.review.strictMode && ' · 严格模式'}
                  </span>
                </div>
                {result.review.issues?.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1">
                    {result.review.issues.map((issue, i) => <div key={i}>- {issue}</div>)}
                  </div>
                )}
                {iterations.length < 5 && (
                  <button onClick={handleImprove} disabled={improving}
                    className="mt-3 w-full px-4 py-2 text-xs bg-teal-50 text-teal-700 rounded-lg
                               hover:bg-teal-100 disabled:opacity-50 transition-colors">
                    {improving ? '改进中...' : `根据反馈改进 (${5 - iterations.length}/5)`}
                  </button>
                )}
              </div>
            )}

            {/* Improved iterations */}
            {iterations.map((iter, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Reviewer #{idx + 2}</span>
                  <span className="text-xs text-gray-500">
                    综合评分 {iter.review.overall}/5
                    <span className="text-gray-400 ml-2">第 {idx + 1} 轮改进</span>
                  </span>
                </div>
                {iter.review.issues?.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1">
                    {iter.review.issues.map((issue, i) => <div key={i}>- {issue}</div>)}
                  </div>
                )}
              </div>
            ))}

            {/* Export */}
            {result?.creatorResults?.length > 0 && (
              <button
                onClick={() => {
                  const md = buildMarkdownExport({
                    goal: intent.goal,
                    background: intent.background,
                    plan: result.plan,
                    creatorResults: result.creatorResults,
                    review: result.review,
                  });
                  downloadMarkdown(md, intent.goal);
                }}
                className="w-full px-4 py-3 bg-purple-600 text-white text-sm rounded-xl
                           hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                导出 Markdown
              </button>
            )}

          </div>
        )}
      </div>

      {/* RIGHT: Context panel — 40% */}
      <div className="w-[360px] border-l border-gray-200 bg-white p-6 overflow-y-auto shrink-0">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">语境</h3>

        <div className="space-y-4">
          <ContextBlock label="意图" text={intent.goal} />
          {intent.background && <ContextBlock label="背景" text={intent.background} />}
          {intent.constraints && <ContextBlock label="约束" text={intent.constraints} />}

          {trace && !trace.skipped && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-1">溯源</div>
              <div className="text-sm text-gray-600">服务于 {trace.serves}</div>
              <div className="text-sm text-gray-600">"好" = {trace.definedGood}</div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-1">价值观</div>
            {Object.entries(values).map(([k, v]) => (
              <div key={k} className="text-sm text-gray-700">
                {VALUE_LABELS[k]?.[v] || v}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">宪法状态</h3>
            <div className="flex items-center gap-2">
              {constitutionStatus === 'pass' && <span className="w-2 h-2 rounded-full bg-green-500" />}
              {constitutionStatus === 'warn' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              {constitutionStatus === 'block' && <span className="w-2 h-2 rounded-full bg-red-500" />}
              {!constitutionStatus && <span className="w-2 h-2 rounded-full bg-gray-300" />}
              <span className="text-xs text-gray-500">
                {constitutionStatus === 'pass' ? '全部通过' : constitutionStatus === 'warn' ? '有警告' : constitutionStatus === 'block' ? '有阻断' : '等待中'}
              </span>
            </div>
            {constitutionStatus !== 'pass' && constitutionStatus && (
              <div className="mt-2 text-xs text-amber-700">
                Agent 输出未完全通过宪法检查。查看左侧卡片中的标记了解详情。
              </div>
            )}
          </div>

          {/* Guardian alerts */}
          {guardianAlerts.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">守护</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {guardianAlerts.slice(0, 5).map((a) => (
                  <div key={a.id} className={`text-xs p-2 rounded-lg ${
                    a.type === 'violation' ? 'bg-red-50 text-red-700' :
                    a.type === 'metric_drift' ? 'bg-amber-50 text-amber-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    <span className="font-medium">
                      {a.type === 'violation' ? '⚡' : a.type === 'metric_drift' ? '📉' : '💜'}
                    </span>{' '}
                    {a.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {execStatus === 'running' && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">进度</h3>
              <div className="text-xs text-gray-500">{currentStep}/{totalSteps || '?'} 步</div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                <div className="bg-purple-500 h-1 rounded-full transition-all" style={{ width: totalSteps ? `${(currentStep/totalSteps)*100}%` : '10%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConstitutionBadge({ status }) {
  if (!status || status === 'pass') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">宪法通过</span>;
  if (status === 'warn') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">宪法警告</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">宪法阻断</span>;
}

function AgentCard({ agent, output, status, subtaskId }) {
  let display = output?.slice(0, 500) || '等待...';
  // Planner 的 rawText 是 JSON，解析后展示 reasoning + 子任务列表
  if (agent === 'planner' && output) {
    try {
      const j = JSON.parse(output);
      const lines = [];
      if (j.reasoning) lines.push(j.reasoning);
      if (j.subtasks?.length) {
        lines.push('');
        j.subtasks.forEach((t, i) => { lines.push(`${t.id || i + 1}. ${t.title || '未命名子任务'}`); });
      }
      display = lines.join('\n').slice(0, 500);
    } catch { /* 不是 JSON 就原样显示 */ }
  }
  return (
    <div className="p-4 rounded-xl" style={{ border: '1px solid var(--color-ai-border)', background: 'var(--color-ai-bg)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-ai)' }}>
          {agent === 'planner' ? 'Planner' : agent === 'researcher' ? 'Researcher' : agent === 'creator' ? `Creator ${subtaskId ? '#' + subtaskId : ''}` : agent}
        </span>
        <ConstitutionBadge status={status} />
      </div>
      <Markdown className="text-sm text-gray-600 leading-relaxed line-clamp-4" text={display} />
    </div>
  );
}

/** AI 声明折叠 + 正文渲染 */
function CreatorContent({ content }) {
  if (!content) return <div className="text-sm text-gray-400">(AI 未生成内容)</div>;

  // 匹配声明：从"叩鸣·工坊 ... Agent"到第一个 --- 或 ## 标题
  const declMatch = content.match(/叩鸣[·.]?工坊[\s\S]*?(?:Creator|Planner|Researcher|Reviewer)\s*Agent[\s\S]*?(?=\n---|\n##\s)/i);
  if (!declMatch) {
    return <Markdown className="text-sm text-gray-700 leading-relaxed" text={content} />;
  }

  const declaration = declMatch[0].trim();
  let body = content.slice(declMatch.index + declMatch[0].length).replace(/^\s*---\s*\n*/, '');
  // 剥离末尾"假设"区域——黄色卡片单独显示
  body = body.replace(/[\n\r]+(?:###?\s*)?(?:假设|我的假设)[\n\r\s-]*(?:我的假设：[\s\S]*)?$/i, '').trim();

  return (
    <div>
      <details className="mb-3">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
          AI 参与声明
        </summary>
        <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800 leading-relaxed whitespace-pre-line">
          {declaration}
        </div>
      </details>
      <Markdown className="text-sm text-gray-700 leading-relaxed" text={body} />
    </div>
  );
}

function ContextBlock({ label, text }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-700 leading-relaxed">{text}</div>
    </div>
  );
}
