import { supabase } from '../supabase';
import type { TradeAnnotation, APlusChecklist, TradeGrade } from '@/types/database';
import { emptyChecklist } from '@/types/database';

/**
 * Create or update a trade annotation
 */
export async function upsertAnnotation(
  tradeId: number,
  annotation: Partial<Omit<TradeAnnotation, 'trade_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const data = {
    trade_id: tradeId,
    ...annotation,
    checklist: annotation.checklist || emptyChecklist,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('trade_annotations').upsert(data, {
    onConflict: 'trade_id',
  });

  if (error) {
    throw new Error(`Failed to save annotation: ${error.message}`);
  }
}

/**
 * Get annotation for a trade
 */
export async function getAnnotation(tradeId: number): Promise<TradeAnnotation | null> {
  const { data, error } = await supabase
    .from('trade_annotations')
    .select('*')
    .eq('trade_id', tradeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch annotation: ${error.message}`);
  }

  return data;
}

/**
 * Update specific checklist items
 */
export async function updateChecklist(
  tradeId: number,
  checklistUpdates: Partial<APlusChecklist>
): Promise<void> {
  // Get existing annotation
  const existing = await getAnnotation(tradeId);
  const currentChecklist = existing?.checklist || emptyChecklist;

  // Deep merge the updates
  const mergedChecklist = deepMergeChecklist(currentChecklist, checklistUpdates);

  await upsertAnnotation(tradeId, { checklist: mergedChecklist });
}

/**
 * Deep merge checklist objects
 */
function deepMergeChecklist(
  current: APlusChecklist,
  updates: Partial<APlusChecklist>
): APlusChecklist {
  const result = { ...current };

  for (const [key, value] of Object.entries(updates)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key as keyof APlusChecklist] = {
        ...current[key as keyof APlusChecklist],
        ...value,
      } as any;
    }
  }

  return result;
}

/**
 * Update trade grade
 */
export async function updateGrade(tradeId: number, grade: TradeGrade): Promise<void> {
  await upsertAnnotation(tradeId, { grade });
}

/**
 * Update setup type
 */
export async function updateSetupType(
  tradeId: number,
  setupTypeId: number | null
): Promise<void> {
  await upsertAnnotation(tradeId, {
    setup_type_id: setupTypeId,
  });
}

/**
 * Update initial risk
 */
export async function updateRisk(
  tradeId: number,
  riskDollars: number,
  stopPrice?: number
): Promise<void> {
  await upsertAnnotation(tradeId, {
    initial_risk_dollars: riskDollars,
    initial_stop_price: stopPrice || null,
  });
}

/**
 * Update notes
 */
export async function updateNotes(tradeId: number, notes: string): Promise<void> {
  await upsertAnnotation(tradeId, { notes });
}

/**
 * Add screenshot URL
 */
export async function addScreenshot(tradeId: number, screenshotUrl: string): Promise<void> {
  const existing = await getAnnotation(tradeId);
  const currentUrls = existing?.screenshot_urls || [];

  await upsertAnnotation(tradeId, {
    screenshot_urls: [...currentUrls, screenshotUrl],
  });
}

/**
 * Remove screenshot URL
 */
export async function removeScreenshot(tradeId: number, screenshotUrl: string): Promise<void> {
  const existing = await getAnnotation(tradeId);
  const currentUrls = existing?.screenshot_urls || [];

  await upsertAnnotation(tradeId, {
    screenshot_urls: currentUrls.filter((url) => url !== screenshotUrl),
  });
}

/**
 * Calculate checklist score
 */
export function calculateChecklistScore(checklist: APlusChecklist): {
  score: number;
  total: number;
  percentage: number;
  volatilityContractionMet: boolean;
} {
  let score = 0;
  let total = 0;

  // Count all boolean fields
  for (const section of Object.values(checklist)) {
    for (const value of Object.values(section)) {
      if (typeof value === 'boolean') {
        total++;
        if (value) score++;
      }
    }
  }

  // Special check for volatility contraction (required for A+)
  const vcSection = checklist.volatilityContraction;
  const volatilityContractionMet =
    vcSection.visuallyTighter && vcSection.quantitativeCheck && vcSection.tightnessNearPivot;

  return {
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    volatilityContractionMet,
  };
}

/**
 * Auto-suggest grade based on checklist
 */
export function suggestGrade(checklist: APlusChecklist): TradeGrade {
  const { percentage, volatilityContractionMet } = calculateChecklistScore(checklist);

  if (percentage >= 90 && volatilityContractionMet) {
    return 'A+';
  } else if (percentage >= 80) {
    return 'A';
  } else if (percentage >= 65) {
    return 'B';
  } else if (percentage >= 50) {
    return 'C';
  } else {
    return 'F';
  }
}

/**
 * Get annotations by grade
 */
export async function getAnnotationsByGrade(
  grade: TradeGrade,
  accountId?: string
): Promise<TradeAnnotation[]> {
  let query = supabase.from('trade_annotations').select('*').eq('grade', grade);

  // Would need a join for account filtering - skip for now

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch annotations: ${error.message}`);
  }

  return data || [];
}

/**
 * Get annotations by setup type
 */
export async function getAnnotationsBySetupType(setupTypeId: number): Promise<TradeAnnotation[]> {
  const { data, error } = await supabase
    .from('trade_annotations')
    .select('*')
    .eq('setup_type_id', setupTypeId);

  if (error) {
    throw new Error(`Failed to fetch annotations: ${error.message}`);
  }

  return data || [];
}
