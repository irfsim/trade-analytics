'use client';

interface PeriodStatsProps {
  stats: {
    netPnl: number;
    winRate: number;
    totalTrades: number;
    winners: number;
    losers: number;
    avgSetupRating: number | null;
    planAdherence: number | null;
    avgWin: number | null;
    avgWinPct: number | null;
    avgLoss: number | null;
    avgLossPct: number | null;
  } | null;
  loading?: boolean;
}

// Classify plan adherence percentage into labels
// 90-100%: Excellent - Consistently following trading rules
// 75-89%: Good - Strong discipline with occasional lapses
// 60-74%: Fair - Room for improvement in rule-following
// 40-59%: Needs work - Frequent deviations from plan
// 0-39%: Poor - Significant discipline issues
function getAdherenceLabel(value: number): string {
  if (value >= 90) return 'Excellent';
  if (value >= 75) return 'Good';
  if (value >= 60) return 'Fair';
  if (value >= 40) return 'Needs work';
  return 'Poor';
}

function CircularProgress({ value, size = 48, strokeWidth = 4, isEmpty = false }: { value: number; size?: number; strokeWidth?: number; isEmpty?: boolean }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = isEmpty ? circumference : circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--progress-bg)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        {!isEmpty && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--success)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-medium ${isEmpty ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {isEmpty ? '—' : value}
        </span>
      </div>
    </div>
  );
}

export function PeriodStats({ stats, loading }: PeriodStatsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-16 bg-zinc-100 dark:bg-[#1c1c1e] rounded mb-2" />
              <div className="h-6 w-12 bg-zinc-100 dark:bg-[#1c1c1e] rounded" />
            </div>
          ))}
        </div>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-[#1c1c1e] rounded-full" />
          <div className="h-4 w-24 bg-zinc-100 dark:bg-[#1c1c1e] rounded" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatPnl = (value: number): string => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-8">
        {/* Total Trades */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Trades</p>
          <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{stats.totalTrades}</p>
        </div>

        {/* Winners */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Winners</p>
          <p className="text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
            <span className="font-medium">{stats.winners}</span>
            <span className="font-normal"> ({stats.totalTrades > 0 ? Math.round((stats.winners / stats.totalTrades) * 100) : 0}%)</span>
          </p>
        </div>

        {/* Losers */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Losers</p>
          <p className="text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
            <span className="font-medium">{stats.losers}</span>
            <span className="font-normal"> ({stats.totalTrades > 0 ? Math.round((stats.losers / stats.totalTrades) * 100) : 0}%)</span>
          </p>
        </div>

        {/* Net P&L */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Net P&L</p>
          <p className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatPnl(stats.netPnl)}
          </p>
        </div>

        {/* Avg Win */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Avg Win</p>
          <p className="text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
            {stats.avgWin !== null ? (
              <>
                <span className="font-medium">+${stats.avgWin.toLocaleString('en-US')}</span>
                <span> {stats.avgWinPct !== null ? `(+${stats.avgWinPct}%)` : '—'}</span>
              </>
            ) : (
              <span className="font-medium">—</span>
            )}
          </p>
        </div>

        {/* Avg Loss */}
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Avg Loss</p>
          <p className="text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
            {stats.avgLoss !== null ? (
              <>
                <span className="font-medium">-${Math.abs(stats.avgLoss).toLocaleString('en-US')}</span>
                <span> {stats.avgLossPct !== null ? `(${stats.avgLossPct}%)` : '—'}</span>
              </>
            ) : (
              <span className="font-medium">—</span>
            )}
          </p>
        </div>
      </div>

      {/* Plan Adherence */}
      <div className="flex items-start gap-3">
        <CircularProgress value={stats.planAdherence ?? 0} isEmpty={stats.planAdherence === null} />
        <div className="mt-0.5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Compliance</p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {stats.planAdherence !== null ? getAdherenceLabel(stats.planAdherence) : 'No data'}
          </p>
        </div>
      </div>
    </div>
  );
}
