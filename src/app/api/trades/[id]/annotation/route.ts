import { NextRequest, NextResponse } from 'next/server';
import { getAnnotation, upsertAnnotation, calculateChecklistScore, suggestGrade } from '@/lib/db/annotations';
import type { APlusChecklist, TradeGrade, SetupType, MarketRegime } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json({ error: 'Invalid trade ID' }, { status: 400 });
    }

    const annotation = await getAnnotation(tradeId);

    if (!annotation) {
      return NextResponse.json({ annotation: null });
    }

    // Calculate score
    const score = calculateChecklistScore(annotation.checklist as APlusChecklist);
    const suggestedGrade = suggestGrade(annotation.checklist as APlusChecklist);

    return NextResponse.json({
      annotation,
      score,
      suggestedGrade,
    });
  } catch (error) {
    console.error('Error fetching annotation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json({ error: 'Invalid trade ID' }, { status: 400 });
    }

    const body = await request.json();

    // Validate and extract fields
    const annotationData: {
      grade?: TradeGrade;
      should_have_taken?: boolean;
      setup_type?: SetupType;
      setup_type_other?: string;
      market_regime?: MarketRegime;
      initial_risk_dollars?: number;
      initial_stop_price?: number;
      checklist?: APlusChecklist;
      screenshot_urls?: string[];
      notes?: string;
    } = {};

    if (body.grade !== undefined) annotationData.grade = body.grade;
    if (body.should_have_taken !== undefined) annotationData.should_have_taken = body.should_have_taken;
    if (body.setup_type !== undefined) annotationData.setup_type = body.setup_type;
    if (body.setup_type_other !== undefined) annotationData.setup_type_other = body.setup_type_other;
    if (body.market_regime !== undefined) annotationData.market_regime = body.market_regime;
    if (body.initial_risk_dollars !== undefined) annotationData.initial_risk_dollars = body.initial_risk_dollars;
    if (body.initial_stop_price !== undefined) annotationData.initial_stop_price = body.initial_stop_price;
    if (body.checklist !== undefined) annotationData.checklist = body.checklist;
    if (body.screenshot_urls !== undefined) annotationData.screenshot_urls = body.screenshot_urls;
    if (body.notes !== undefined) annotationData.notes = body.notes;

    await upsertAnnotation(tradeId, annotationData);

    // Return updated annotation with score
    const updated = await getAnnotation(tradeId);
    const score = updated ? calculateChecklistScore(updated.checklist as APlusChecklist) : null;
    const suggestedGrade = updated ? suggestGrade(updated.checklist as APlusChecklist) : null;

    return NextResponse.json({
      success: true,
      annotation: updated,
      score,
      suggestedGrade,
    });
  } catch (error) {
    console.error('Error saving annotation:', error);
    return NextResponse.json(
      { error: 'Failed to save annotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
