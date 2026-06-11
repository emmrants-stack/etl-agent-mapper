import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getTemplate } from '../template-registry';

/**
 * Apply transformation rules to a value
 */
function applyTransformation(value: string, transformation: string): string {
  if (!value || !transformation) return value;

  let result = value.trim();
  const rules = transformation.split(',').map((r) => r.trim());

  rules.forEach((rule) => {
    if (rule.includes('UPPER')) result = result.toUpperCase();
    else if (rule.includes('LOWER')) result = result.toLowerCase();
    else if (rule.includes('PROPER') || rule.includes('TITLE')) {
      result = result
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    } else if (rule.includes('TRIM')) result = result.trim();
  });

  return result;
}

/**
 * Transform source data to template format
 */
function transformData(sourceRows: any[], mappings: any[]): Record<string, any>[] {
  // Build mapping lookup
  const mappingLookup: Record<string, any> = {};
  mappings.forEach((m: any) => {
    if (m.destination_field) {
      mappingLookup[m.destination_field] = {
        source_columns: Array.isArray(m.source_columns) ? m.source_columns : [m.source_columns],
        transformation: m.transformation,
      };
    }
  });

  // Transform each row
  return sourceRows.map((sourceRow: any) => {
    const transformedRow: Record<string, any> = {};

    Object.keys(mappingLookup).forEach((destField) => {
      const mapping = mappingLookup[destField];
      let value = '';

      // Get value from first available source column
      for (const srcCol of mapping.source_columns) {
        if (sourceRow[srcCol]) {
          value = String(sourceRow[srcCol]).trim();
          break;
        }
      }

      // Apply transformation
      if (value && mapping.transformation) {
        value = applyTransformation(value, mapping.transformation);
      }

      transformedRow[destField] = value;
    });

    return transformedRow;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappingResult, sourceRows } = body;

    if (!mappingResult) {
      return NextResponse.json({ error: 'No mapping result provided' }, { status: 400 });
    }

    if (!sourceRows || sourceRows.length === 0) {
      return NextResponse.json({ error: 'No source rows provided' }, { status: 400 });
    }

    const templateId = mappingResult.template;
    const templateConfig = getTemplate(templateId);

    if (!templateConfig) {
      return NextResponse.json({ error: `Template ${templateId} not found` }, { status: 400 });
    }

    // Transform source data
    const mappings = mappingResult.mappings?.mappings || [];
    const transformedRows = transformData(sourceRows, mappings);

    // Get all destination fields from mappings
    const destinationFields = mappings.map((m: any) => m.destination_field);

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(transformedRows, { header: destinationFields });
    ws['!cols'] = destinationFields.map(() => ({ wch: 15 }));

    XLSX.utils.book_append_sheet(wb, ws, templateConfig.sheet_name);

    // Generate buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${templateConfig.id}-${Date.now()}.xlsx"`,
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
