import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappingResult } = body;

    if (!mappingResult) {
      return NextResponse.json({ error: 'No mapping result provided' }, { status: 400 });
    }

    // Create a new workbook with transformed data
    const transformedData = mappingResult.sourceSchema.sample_rows.map((row: any) => {
      const transformedRow: Record<string, any> = {};

      mappingResult.mappings.mappings.forEach((mapping: any) => {
        if (mapping.destination_field && row[mapping.source_column] !== undefined) {
          let value = row[mapping.source_column];

          // Apply transformations
          if (mapping.transformation) {
            value = applyTransformation(value, mapping.transformation);
          }

          transformedRow[mapping.destination_field] = value;
        }
      });

      return transformedRow;
    });

    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(transformedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    // Write to buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Return as file download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="transformed-${Date.now()}.xlsx"`,
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

function applyTransformation(value: any, transformation: string): any {
  if (!value) return value;

  let result = String(value);
  const rules = transformation.split(',').map((r) => r.trim());

  rules.forEach((rule) => {
    switch (rule) {
      case 'TRIM':
        result = result.trim();
        break;
      case 'UPPER':
        result = result.toUpperCase();
        break;
      case 'LOWER':
        result = result.toLowerCase();
        break;
      case 'PROPER CASE':
        result = result
          .toLowerCase()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        break;
      case 'REMOVE_SPACES':
        result = result.replace(/\s+/g, '');
        break;
      case 'STANDARDIZE_PHONE':
        const digits = result.replace(/\D/g, '').slice(-10);
        if (digits.length === 10) {
          result = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
        }
        break;
      case 'NORMALIZE_EMAIL':
        result = result.toLowerCase().trim();
        break;
    }
  });

  return result;
}
