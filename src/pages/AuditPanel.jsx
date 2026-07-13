import { AuditCollector } from '../audit/collector';
import { useState, useEffect } from 'react';

export default function AuditPanel() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    setReport(AuditCollector.getReport());
  }, []);

  if (!report) return <div className="max-w-2xl mx-auto py-8 text-gray-400">加载中...</div>;

  const agencyColor = report.agencyScore >= 60 ? 'text-green-600' : report.agencyScore >= 30 ? 'text-amber-600' : 'text-red-600';
  const aiDepColor = report.aiDependencyScore <= 30 ? 'text-green-600' : report.aiDependencyScore <= 60 ? 'text-amber-600' : 'text-red-600';
  const questioningColor = report.questioningScore >= 60 ? 'text-green-600' : report.questioningScore >= 30 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">价值健康报告</h1>
      <p className="text-sm text-gray-500 mb-8">
        这些指标只显示给你自己，绝不出现在任何公共排名中。
        <br />
        <span className="text-purple-600">"你的 AI 越来越好了，你越来越好了吗？"</span>
      </p>

      {/* Score Cards — 3-column */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs text-gray-500 mb-1">AI 介入度</div>
          <div className={`text-2xl font-bold ${aiDepColor}`}>{report.aiDependencyScore}</div>
          <div className="text-xs text-gray-400 mt-1">
            越低越好——AI 替你做{'\n'}决策的程度
          </div>
          {report.aiDependencyScore > 60 && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
              AI 参与了超过一半的任务步骤
            </div>
          )}
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs text-gray-500 mb-1">能力保留度</div>
          <div className={`text-2xl font-bold ${agencyColor}`}>{report.agencyScore}</div>
          <div className="text-xs text-gray-400 mt-1">
            自己做 + 反驳 + 反思 / 总任务
          </div>
          {report.agencyScore < 30 && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
              在下一个任务中试试自己做一步
            </div>
          )}
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs text-gray-500 mb-1">追问频率</div>
          <div className={`text-2xl font-bold ${questioningColor}`}>{report.questioningScore}</div>
          <div className="text-xs text-gray-400 mt-1">
            溯源完成率 + 反思频率
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">统计详情（{report.period}）</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <StatRow label="任务总数" value={report.totalTasks} />
          <StatRow label="溯源跳过率" value={`${report.traceSkipRate}%`}
            warning={report.traceSkipRate > 50} warningText="超过一半的任务跳过了溯源追问" />
          <StatRow label="自己做的步骤" value={report.userDidStepCount}
            warning={report.userDidStepCount === 0 && report.totalTasks > 3} warningText="最近没有自己动手完成任何步骤" />
          <StatRow label="反驳 AI 假设" value={report.rebuttalCount} />
          <StatRow label="暂停反思次数" value={report.reflectCount}
            warning={report.reflectCount === 0 && report.totalTasks > 5} warningText="已超过5个任务未使用暂停反思模式" />
          <StatRow label="价值观修改" value={report.valuesChangedCount} />
        </div>
      </div>

      {/* Warning Banner */}
      {report.agencyScore < 30 && report.totalTasks > 3 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="text-sm font-medium text-red-800 mb-1">效率侵蚀警告</div>
          <div className="text-xs text-red-600">
            你的 AI 越来越高效了——但你越来越少自己动手、越来越少反问 AI 的假设。
            一个以人的代价换来的效率不是效率。
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, warning, warningText }) {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {warning && (
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full" title={warningText}>
            !
          </span>
        )}
      </div>
    </div>
  );
}
