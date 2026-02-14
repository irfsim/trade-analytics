import type { TradeWithRating, TradeWithDetails, TradeLeg, TradeAnnotation, MarketRegime, APlusChecklist } from '@/types/database';

// --- Shared generation logic (extracted from seed route) ---

// Seeded PRNG for deterministic data generation (Mulberry32)
export function createSeededRandom(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const TICKERS = [
  'NVDA', 'TSLA', 'AMD', 'META', 'AAPL', 'MSFT', 'GOOGL', 'AMZN',
  'NFLX', 'CRWD', 'SNOW', 'PLTR', 'COIN', 'SQ', 'ROKU', 'DKNG',
  'AFRM', 'UPST', 'SOFI', 'RIVN', 'SMCI', 'ARM', 'PANW', 'ZS',
  'NET', 'DDOG', 'MDB', 'CFLT', 'ABNB', 'UBER', 'DASH', 'RBLX',
  'U', 'PATH', 'OKTA', 'CRSP', 'BILL', 'HUBS', 'TTD', 'ENPH',
];

const SETUP_TYPES = ['Episodic pivot', 'Flag', 'Base breakout'] as const;
const SETUP_TYPE_COLORS: Record<string, string> = {
  'Episodic pivot': '#3b82f6',
  'Flag': '#10b981',
  'Base breakout': '#f59e0b',
};

// Real 2025 stats:
// Win: 209, Loss: 731, Total: 940
// Win rate: 22.23%
// Avg win: 14.12%, Avg loss: -2.08%
// Avg winner holding: 3.79 days, Avg loser holding: 1.31 days
export function generateDeterministicTrades() {
  const SEED = 42;
  const random = createSeededRandom(SEED);

  const count = 940;
  const winCount = 209;
  const startDate = new Date('2025-01-01T00:00:00Z');
  const endDate = new Date('2026-02-04T23:59:59Z');
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const seededElement = <T,>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)];
  const seededBetween = (min: number, max: number): number => random() * (max - min) + min;
  const gaussianRandom = (): number => {
    const u1 = random();
    const u2 = random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  // Pre-determine exactly which trades are winners (deterministic shuffle)
  const winnerSet = new Set<number>();
  const indices = Array.from({ length: count }, (_, i) => i);
  // Fisher-Yates shuffle with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < winCount; i++) {
    winnerSet.add(indices[i]);
  }

  const trades = [];

  for (let i = 0; i < count; i++) {
    const ticker = seededElement(TICKERS);
    const dayOffset = Math.floor((i / count) * totalDays);
    const entryDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    entryDate.setUTCHours(14 + Math.floor(random() * 5), Math.floor(random() * 60));

    const dayOfWeek = entryDate.getUTCDay();
    if (dayOfWeek === 0) entryDate.setDate(entryDate.getDate() + 1);
    if (dayOfWeek === 6) entryDate.setDate(entryDate.getDate() + 2);

    const entryPrice = seededBetween(30, 400);
    const isWinner = winnerSet.has(i);

    // Holding period: winners ~3.79 days, losers ~1.31 days
    let holdingDays: number;
    if (isWinner) {
      holdingDays = Math.max(1, Math.min(10, Math.round(3.79 + gaussianRandom() * 1.5)));
    } else {
      holdingDays = Math.max(0, Math.min(4, Math.round(1.31 + gaussianRandom() * 0.8)));
    }

    const exitDate = new Date(entryDate);
    exitDate.setDate(exitDate.getDate() + holdingDays);
    exitDate.setUTCHours(entryDate.getUTCHours() + Math.floor(random() * 4));

    let movePercent: number;
    if (isWinner) {
      // Avg win: 14.12% — tight gaussian, reduced outlier impact
      movePercent = 0.13 + gaussianRandom() * 0.04;
      // 5% chance of outlier winner (25-35%)
      if (random() < 0.05) movePercent = seededBetween(0.25, 0.35);
      movePercent = Math.max(0.02, movePercent);
    } else {
      // Avg loss: -2.08% — very tight distribution
      movePercent = -0.0195 + gaussianRandom() * 0.006;
      // 2% chance of outlier loss (5-10%)
      if (random() < 0.02) movePercent = seededBetween(-0.10, -0.05);
      movePercent = Math.min(-0.003, movePercent);
      movePercent = Math.max(-0.12, movePercent);
    }

    const exitPrice = entryPrice * (1 + movePercent);
    const targetPosition = 9000;
    const positionMultiplier = Math.exp(gaussianRandom() * 0.3);
    const positionValue = targetPosition * positionMultiplier;
    const shares = Math.max(10, Math.round(positionValue / entryPrice / 10) * 10);
    const commission = seededBetween(1, 3);
    const realizedPnl = (exitPrice - entryPrice) * shares - commission;
    const accountId = random() < 0.6 ? 'MARGIN' : 'ISA';

    trades.push({
      ticker,
      accountId,
      entryDate,
      exitDate,
      entryPrice: Math.round(entryPrice * 100) / 100,
      exitPrice: Math.round(exitPrice * 100) / 100,
      shares,
      commission: Math.round(commission * 100) / 100,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      isWinner,
    });
  }

  trades.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  return trades;
}

export function generateChecklist(isGoodSetup: boolean, random: () => number) {
  const check = (prob: number) => random() < prob;
  const goodProb = isGoodSetup ? 0.85 : 0.4;
  const reqProb = isGoodSetup ? 0.95 : 0.3;

  return {
    marketContext: { bullishConditions: check(goodProb) },
    stockSelection: {
      momentumLeader: check(goodProb),
      highRS: check(goodProb),
      sufficientVolume: check(0.9),
      sufficientADR: check(goodProb),
    },
    priorUptrend: { clearStrongUptrend: check(goodProb) },
    consolidation: {
      orderlyPattern: check(goodProb),
      notChoppy: check(goodProb),
      stillInRange: check(goodProb),
    },
    maSupport: {
      nearRisingMA: check(goodProb),
      masStacked: check(goodProb),
    },
    volatilityContraction: {
      visuallyTighter: check(reqProb),
      quantitativeCheck: check(reqProb),
      tightnessNearPivot: check(reqProb),
    },
    volumePattern: {
      volumeContracted: check(goodProb),
      lowVolumeTightDays: check(goodProb),
    },
    pivotAndRisk: {
      clearPivot: check(0.9),
      logicalStop: check(0.85),
      acceptableRisk: check(0.8),
    },
    context: {
      leadingSector: check(0.6),
      recentCatalyst: check(0.4),
    },
  };
}

// --- Lazy singleton in-memory store ---

interface DummyStore {
  trades: TradeWithRating[];
  details: Map<number, TradeWithDetails>;
  annotations: Map<number, TradeAnnotation>;
}

let _store: DummyStore | null = null;

function buildStore(): DummyStore {
  const rawTrades = generateDeterministicTrades();

  const ANNOTATION_SEED = 123;
  const annotationRandom = createSeededRandom(ANNOTATION_SEED);
  const seededElement = <T,>(arr: readonly T[]): T => arr[Math.floor(annotationRandom() * arr.length)];
  const seededBetween = (min: number, max: number): number => annotationRandom() * (max - min) + min;

  const trades: TradeWithRating[] = [];
  const details = new Map<number, TradeWithDetails>();
  const annotations = new Map<number, TradeAnnotation>();

  let executionCounter = 1;

  for (let i = 0; i < rawTrades.length; i++) {
    const raw = rawTrades[i];
    const tradeId = i + 1;
    const now = new Date().toISOString();

    const entryExecId = `DUMMY-ENTRY-${executionCounter++}`;
    const exitExecId = `DUMMY-EXIT-${executionCounter++}`;

    // Market condition (same logic as seed route)
    const marketRoll = annotationRandom();
    let marketCondition: MarketRegime;
    if (marketRoll < 0.30) marketCondition = 'STRONG_UPTREND';
    else if (marketRoll < 0.50) marketCondition = 'UPTREND_CHOP';
    else if (marketRoll < 0.70) marketCondition = 'SIDEWAYS';
    else if (marketRoll < 0.85) marketCondition = 'DOWNTREND';
    else marketCondition = 'CORRECTION';

    // Annotation (~70% of trades)
    let annotation: TradeAnnotation | null = null;
    let setupRating: number | null = null;
    let followedPlan: boolean | null = null;
    let setupTypeName: string | null = null;
    let setupTypeColor: string | null = null;

    if (annotationRandom() < 0.7) {
      const isGoodSetup = raw.isWinner ? annotationRandom() < 0.7 : annotationRandom() < 0.3;
      const grade = isGoodSetup
        ? seededElement(['A+', 'A', 'B'] as const)
        : seededElement(['B', 'C', 'F'] as const);

      const riskPercent = seededBetween(0.03, 0.08);
      const initialRisk = raw.entryPrice * raw.shares * riskPercent;
      const plan = isGoodSetup ? annotationRandom() < 0.8 : annotationRandom() < 0.5;
      const checklist = generateChecklist(isGoodSetup, annotationRandom);

      const sections = [
        checklist.marketContext, checklist.stockSelection, checklist.priorUptrend,
        checklist.consolidation, checklist.maSupport, checklist.volatilityContraction,
        checklist.volumePattern, checklist.pivotAndRisk, checklist.context,
      ];
      const rating = sections.filter(section =>
        Object.values(section).every(Boolean)
      ).length;

      const setupType = seededElement(SETUP_TYPES);

      setupRating = rating;
      followedPlan = plan;
      setupTypeName = setupType;
      setupTypeColor = SETUP_TYPE_COLORS[setupType] || '#6b7280';

      annotation = {
        trade_id: tradeId,
        grade: grade as TradeAnnotation['grade'],
        should_have_taken: null,
        followed_plan: plan,
        setup_rating: rating,
        setup_type_id: SETUP_TYPES.indexOf(setupType) + 1,
        market_regime: null,
        initial_risk_dollars: Math.round(initialRisk * 100) / 100,
        initial_stop_price: Math.round(raw.entryPrice * (1 - riskPercent) * 100) / 100,
        checklist: checklist as APlusChecklist,
        screenshot_urls: [],
        notes: plan
          ? 'Executed according to plan.'
          : 'Deviated from plan - need to review execution.',
        created_at: now,
        updated_at: now,
      };

      annotations.set(tradeId, annotation);
    }

    const trade: TradeWithRating = {
      id: tradeId,
      account_id: raw.accountId,
      ticker: raw.ticker,
      direction: 'LONG',
      status: 'CLOSED',
      entry_datetime: raw.entryDate.toISOString(),
      exit_datetime: raw.exitDate.toISOString(),
      entry_price: raw.entryPrice,
      exit_price: raw.exitPrice,
      total_shares: raw.shares,
      remaining_shares: 0,
      realized_pnl: raw.realizedPnl,
      total_commission: raw.commission,
      market_condition: marketCondition,
      created_at: now,
      updated_at: now,
      setup_rating: setupRating,
      followed_plan: followedPlan,
      setup_type_name: setupTypeName,
      setup_type_color: setupTypeColor,
      account_pct: null,
      position_size_pct: null,
    };

    trades.push(trade);

    // Build legs for detail view
    const legs: TradeLeg[] = [
      {
        id: i * 2 + 1,
        trade_id: tradeId,
        execution_id: entryExecId,
        leg_type: 'ENTRY',
        shares: raw.shares,
        price: raw.entryPrice,
        executed_at: raw.entryDate.toISOString(),
      },
      {
        id: i * 2 + 2,
        trade_id: tradeId,
        execution_id: exitExecId,
        leg_type: 'EXIT',
        shares: raw.shares,
        price: raw.exitPrice,
        executed_at: raw.exitDate.toISOString(),
      },
    ];

    details.set(tradeId, { ...trade, legs, annotation });
  }

  return { trades, details, annotations };
}

function getStore(): DummyStore {
  if (!_store) {
    _store = buildStore();
  }
  return _store;
}

// --- Public API ---

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getDummyTrades(options?: {
  accountId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): TradeWithRating[] {
  let filtered = [...getStore().trades];

  if (options?.accountId) {
    filtered = filtered.filter(t => t.account_id === options.accountId);
  }
  if (options?.from) {
    filtered = filtered.filter(t => t.entry_datetime >= options.from!);
  }
  if (options?.to) {
    filtered = filtered.filter(t => t.entry_datetime <= options.to!);
  }

  // Sort by entry_datetime descending (most recent first) to match DB behavior
  filtered.sort((a, b) => b.entry_datetime.localeCompare(a.entry_datetime));

  if (options?.offset) {
    filtered = filtered.slice(options.offset);
  }
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

export function getDummyTradeDetail(id: number): TradeWithDetails | null {
  return getStore().details.get(id) ?? null;
}

export function getDummyAnnotation(tradeId: number): TradeAnnotation | null {
  return getStore().annotations.get(tradeId) ?? null;
}

export function getDummyAccounts() {
  return [
    {
      account_id: 'ISA',
      alias: 'ISA',
      account_type: 'isa',
      starting_balance: 30000,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      account_id: 'MARGIN',
      alias: 'MARGIN',
      account_type: 'margin',
      starting_balance: 50000,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ];
}
