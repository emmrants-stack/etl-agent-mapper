import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Oracle Customers template column structure (row 5 of template)
const ORACLE_COLUMNS = [
  '*Source System',           // 1
  '*Customer Number',         // 2
  'Customer Source Reference',// 3
  '*Customer Name',           // 4
  'D-U-N-S Number',          // 5
  'Taxpayer ID',             // 6
  'Taxpayer Registration Number', // 7
  'Customer GSA Indicator',  // 8
  '*Account Number',         // 9
  'Account Source Reference',// 10
  'Account Description',     // 11
  'Account Type',            // 12
  'Account Established Date',// 13
  'Customer Class',          // 14
  'Customer Profile Class',  // 15
  '*Site Number',            // 16
  'Site Source Reference',   // 17
  'Site Name',               // 18
  '*Account Address Set',    // 19
  '*Location Source Reference', // 20
  '*Address Line 1',         // 21
  'Address Line 2',          // 22
  'Mail Stop',               // 23
  'Address Line 3',          // 24
  'Address Line 4',          // 25
  'Building',                // 26
  'Floor Number',            // 27
  'Type of House',           // 28
  'Additional Address Attribute 1', // 29
  'Additional Address Attribute 2', // 30
  'Additional Address Attribute 3', // 31
  'Additional Address Attribute 4', // 32
  'Additional Address Attribute 5', // 33
  'City',                    // 34
  'State',                   // 35
  'Province',                // 36
  'Postal Code',             // 37
  'Postal Code Extension',   // 38
  'County',                  // 39
  '*Country',                // 40
  'Phonetic Address Line',   // 41
  'Address Description',     // 42
  'Short Description',       // 43
  'Time Zone Code',          // 44
  'Sales Tax Geocode',       // 45
  'Sales Tax Inside City Limits', // 46
  '*Identifying Address',    // 47
  'Site Language',           // 48
  'Translated Customer Name',// 49
  '*Site Purpose Source Reference', // 50
  '*Purpose',                // 51
  '*Site Purpose Primary Indicator', // 52
  'Site',                    // 53
  'Bill-to Site',            // 54
  'Payment Method',          // 55
  'Primary Payment Method Indicator', // 56
  'Customer Account Descriptive Flexfield Context Prompt', // 57
  'Customer Account Descriptive Flexfield Segment 1', // 58
  'Customer Account Descriptive Flexfield Segment 2',
  'Customer Account Descriptive Flexfield Segment 3',
  'Customer Account Descriptive Flexfield Segment 4',
  'Customer Account Descriptive Flexfield Segment 5',
  'Customer Account Descriptive Flexfield Segment 6',
  'Customer Account Descriptive Flexfield Segment 7',
  'Customer Account Descriptive Flexfield Segment 8',
  'Customer Account Descriptive Flexfield Segment 9',
  'Customer Account Descriptive Flexfield Segment 10',
  'Customer Account Descriptive Flexfield Segment 11',
  'Customer Account Descriptive Flexfield Segment 12',
  'Customer Account Descriptive Flexfield Segment 13',
  'Customer Account Descriptive Flexfield Segment 14',
  'Customer Account Descriptive Flexfield Segment 15',
  'Customer Account Descriptive Flexfield Segment 16',
  'Customer Account Descriptive Flexfield Segment 17',
  'Customer Account Descriptive Flexfield Segment 18',
  'Customer Account Descriptive Flexfield Segment 19',
  'Customer Account Descriptive Flexfield Segment 20',
  'Customer Account Descriptive Flexfield Segment 21',
  'Customer Account Descriptive Flexfield Segment 22',
  'Customer Account Descriptive Flexfield Segment 23',
  'Customer Account Descriptive Flexfield Segment 24',
  'Customer Account Descriptive Flexfield Segment 25',
  'Customer Account Descriptive Flexfield Segment 26',
  'Customer Account Descriptive Flexfield Segment 27',
  'Customer Account Descriptive Flexfield Segment 28',
  'Customer Account Descriptive Flexfield Segment 29',
  'Customer Account Descriptive Flexfield Segment 30',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mappingResult } = body;

    if (!mappingResult) {
      return NextResponse.json({ error: 'No mapping result' }, { status: 400 });
    }

    const sourceRows = mappingResult.sourceSchema.sample_rows;
    const mappings = mappingResult.mappings.mappings || [];

    // Create mapping lookup: Oracle column name -> source columns
    const mappingLookup: Record<string, any> = {};
    mappings.forEach((m: any) => {
      if (m.destination_field) {
        mappingLookup[m.destination_field] = {
          source_columns: Array.isArray(m.source_columns) ? m.source_columns : [m.source_columns],
          transformation: m.transformation,
        };
      }
    });

    // Transform source data into Oracle format
    const transformedRows = sourceRows.map((sourceRow: any) => {
      const oracleRow: Record<string, any> = {};

      // Process each Oracle column
      ORACLE_COLUMNS.forEach((oracleCol) => {
        // Find mapping for this Oracle column
        const mapping = mappingLookup[oracleCol];

        if (mapping) {
          // Get value from first available source column
          let value = '';
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

          oracleRow[oracleCol] = value;
        } else {
          // No mapping for this Oracle column - leave empty
          oracleRow[oracleCol] = '';
        }
      });

      return oracleRow;
    });

    // Create Excel workbook in Oracle template format
    const ws = XLSX.utils.json_to_sheet(transformedRows, { header: ORACLE_COLUMNS });
    
    // Add header formatting (simulate Oracle template)
    ws['!cols'] = Array(ORACLE_COLUMNS.length).fill({ wch: 15 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="oracle-customers-${Date.now()}.xlsx"`,
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
    }
    else if (rule.includes('TRIM')) result = result.trim();
    else if (rule.includes('LEFT(TRIM')) {
      // Extract number from LEFT(TRIM(col), 5)
      const match = rule.match(/LEFT.*,\s*(\d+)\)/);
      if (match) {
        const len = parseInt(match[1]);
        result = result.substring(0, len);
      }
    }
  });

  return result;
}
