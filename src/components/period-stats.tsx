'use client';

interface PeriodStatsProps {
  stats: {
    netPnl: number;
    winRate: number;
    totalTrades: number;
    winners: number;
    losers: number;
    avgSetupRating: number | null;
  } | null;
  loading?: boolean;
}

export function PeriodStats({ stats, loading }: PeriodStatsProps) {
  if (loading) {
    return (
      <div className="flex justify-between">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-16 bg-zinc-100 rounded mb-2" />
            <div className="h-6 w-12 bg-zinc-100 rounded" />
          </div>
        ))}
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
    <div className="flex justify-between">
      {/* Total Trades */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">Trades</p>
        <p className="text-sm font-semibold text-zinc-900">{stats.totalTrades}</p>
      </div>

      {/* Win Rate */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">Win Rate</p>
        <p className="text-sm font-semibold text-zinc-900">{stats.winRate}%</p>
      </div>

      {/* Winners */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">Winners</p>
        <p className="text-sm font-semibold text-zinc-900">{stats.winners}</p>
      </div>

      {/* Losers */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">Losers</p>
        <p className="text-sm font-semibold text-zinc-900">{stats.losers}</p>
      </div>

      {/* Net P&L */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">Net P&L</p>
        <p className={`text-sm font-semibold ${stats.netPnl >= 0 ? 'text-zinc-900' : 'text-zinc-900'}`}>
          {formatPnl(stats.netPnl)}
        </p>
      </div>
    </div>
  );
}
