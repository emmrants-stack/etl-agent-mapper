import { NextRequest, NextResponse } from 'next/server';
import { generateMultiSheetExcel, prepareEntityDataForExcel } from '../sheet-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappingResult } = body;

    if (!mappingResult) {
      return NextResponse.json({ error: 'No mapping result' }, { status: 400 });
    }

    // Extract entity data from analysis result
    const entityRows = mappingResult.entity_rows || {};
    const entityMappings = mappingResult.entity_mappings || {};
    const claudeMappings = mappingResult.mappings || { mappings: [] };

    if (Object.keys(entityRows).length === 0) {
      return NextResponse.json({ error: 'No entity data to transform' }, { status: 400 });
    }

    // Prepare data for Excel generation
    const entityDataForExcel = prepareEntityDataForExcel(entityRows, entityMappings, claudeMappings);

    // Generate multi-sheet Excel
    const buffer = generateMultiSheetExcel(entityDataForExcel);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="oracle-fusion-complete-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Transform error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
