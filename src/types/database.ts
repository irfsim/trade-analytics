// Database types matching the PostgreSQL schema

export interface Account {
  account_id: string;
  alias: string;
  account_type: 'isa' | 'margin';
  starting_balance: number;
  created_at: string;
}

export interface CashFlow {
  id: number;
  account_id: string;
  flow_type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  flow_date: string;
  notes: string | null;
  created_at: string;
}

export interface Execution {
  id: number;
  execution_id: string;
  account_id: string;
  order_id: string | null;
  ticker: string;
  executed_at: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission: number;
  net_cash: number | null;
  exchange: string | null;
  imported_at: string;
}

export interface Trade {
  id: number;
  account_id: string;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  entry_datetime: string;
  exit_datetime: string | null;
  entry_price: number;
  exit_price: number | null;
  total_shares: number;
  remaining_shares: number;
  realized_pnl: number | null;
  total_commission: number;
  created_at: string;
  updated_at: string;
}

export interface TradeLeg {
  id: number;
  trade_id: number;
  execution_id: string;
  leg_type: 'ENTRY' | 'ADD' | 'TRIM' | 'EXIT';
  shares: number;
  price: number;
  executed_at: string;
}

// Setup types are now stored in the setup_types table
export interface SetupType {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}
export type MarketRegime = 'STRONG_UPTREND' | 'UPTREND_CHOP' | 'SIDEWAYS' | 'DOWNTREND' | 'CORRECTION';
export type TradeGrade = 'A+' | 'A' | 'B' | 'C' | 'F';

export interface APlusChecklist {
  marketContext: {
    bullishConditions: boolean;
  };
  stockSelection: {
    momentumLeader: boolean;
    highRS: boolean;
    sufficientVolume: boolean;
    sufficientADR: boolean;
  };
  priorUptrend: {
    clearStrongUptrend: boolean;
  };
  consolidation: {
    orderlyPattern: boolean;
    notChoppy: boolean;
    stillInRange: boolean;
  };
  maSupport: {
    nearRisingMA: boolean;
    masStacked: boolean;
  };
  volatilityContraction: {
    visuallyTighter: boolean;
    quantitativeCheck: boolean;
    tightnessNearPivot: boolean;
  };
  volumePattern: {
    volumeContracted: boolean;
    lowVolumeTightDays: boolean;
  };
  pivotAndRisk: {
    clearPivot: boolean;
    logicalStop: boolean;
    acceptableRisk: boolean;
  };
  context: {
    leadingSector: boolean;
    recentCatalyst: boolean;
  };
}

export interface TradeAnnotation {
  trade_id: number;
  grade: TradeGrade | null;
  should_have_taken: boolean | null;
  followed_plan: boolean | null;
  setup_rating: number | null;
  setup_type_id: number | null;
  market_regime: MarketRegime | null;
  initial_risk_dollars: number | null;
  initial_stop_price: number | null;
  checklist: APlusChecklist;
  screenshot_urls: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: number;
  account_id: string;
  date: string;
  trades_closed: number;
  gross_pnl: number;
  total_commission: number;
  net_pnl: number;
  winners: number;
  losers: number;
  breakeven: number;
  total_r: number | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklySummary {
  id: number;
  account_id: string;
  year: number;
  week: number;
  week_start: string;
  week_end: string;
  trades_closed: number;
  gross_pnl: number;
  total_commission: number;
  net_pnl: number;
  winners: number;
  losers: number;
  total_r: number | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  id: number;
  account_id: string;
  year: number;
  month: number;
  trades_closed: number;
  gross_pnl: number;
  total_commission: number;
  net_pnl: number;
  winners: number;
  losers: number;
  total_r: number | null;
  created_at: string;
  updated_at: string;
}

export interface YearlySummary {
  id: number;
  account_id: string;
  year: number;
  trades_closed: number;
  gross_pnl: number;
  total_commission: number;
  net_pnl: number;
  winners: number;
  losers: number;
  total_r: number | null;
  created_at: string;
  updated_at: string;
}

// Helper type for trade with all related data
export interface TradeWithDetails extends Trade {
  legs: TradeLeg[];
  annotation: TradeAnnotation | null;
}

// Trade with setup rating for list views
export interface TradeWithRating extends Trade {
  setup_rating: number | null;
  followed_plan: boolean | null;
  setup_type_name: string | null;
  account_pct: number | null;
  position_size_pct: number | null;
}

// Computed metrics
export interface PerformanceMetrics {
  totalTrades: number;
  winners: number;
  losers: number;
  breakeven: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  averageR: number | null;
  expectancy: number;
  expectancyR: number | null;
  profitFactor: number;
  grossPnl: number;
  totalCommission: number;
  netPnl: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
}

// Default empty checklist
export const emptyChecklist: APlusChecklist = {
  marketContext: { bullishConditions: false },
  stockSelection: {
    momentumLeader: false,
    highRS: false,
    sufficientVolume: false,
    sufficientADR: false,
  },
  priorUptrend: { clearStrongUptrend: false },
  consolidation: { orderlyPattern: false, notChoppy: false, stillInRange: false },
  maSupport: { nearRisingMA: false, masStacked: false },
  volatilityContraction: {
    visuallyTighter: false,
    quantitativeCheck: false,
    tightnessNearPivot: false,
  },
  volumePattern: { volumeContracted: false, lowVolumeTightDays: false },
  pivotAndRisk: { clearPivot: false, logicalStop: false, acceptableRisk: false },
  context: { leadingSector: false, recentCatalyst: false },
};
