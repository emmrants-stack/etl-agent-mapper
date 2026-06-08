import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import { normalizeData } from '../normalizer';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const template = formData.get('template') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file and detect format
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let sourceData: any[] = [];
    let fileFormat = 'unknown';
    let normalizationResult: any = null;

    // Try to parse as JSON first (for MongoDB, API responses)
    try {
      const text = buffer.toString('utf-8');
      const jsonData = JSON.parse(text);
      fileFormat = 'json';
      normalizationResult = normalizeData(jsonData);

      if (normalizationResult.success) {
        sourceData = normalizationResult.rows;
        fileFormat = normalizationResult.format_detected;
      } else {
        throw new Error('JSON parsing failed');
      }
    } catch (jsonError) {
      // Not JSON, try as Excel/CSV
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        sourceData = XLSX.utils.sheet_to_json(sheet);
        fileFormat = 'csv-tabular';

        // Check if it might be Salesforce denormalized
        if (sourceData.length > 0) {
          const keys = Object.keys(sourceData[0]);
          if (keys.some((k: string) => /Contact \d+ (Name|Email)/.test(k))) {
            normalizationResult = normalizeData(sourceData);
            if (normalizationResult.success) {
              sourceData = normalizationResult.rows;
              fileFormat = normalizationResult.format_detected;
            }
          }
        }
      } catch (csvError) {
        return NextResponse.json({ error: 'Could not parse file as JSON, CSV, or Excel' }, { status: 400 });
      }
    }

    if (sourceData.length === 0) {
      return NextResponse.json({ error: 'File is empty or contains no data' }, { status: 400 });
    }

    const headers = Object.keys(sourceData[0]);

    // Build prompt for Claude with format info
    const formatInfo = normalizationResult
      ? `
Format detected: ${normalizationResult.format_detected}
Normalization metadata:
- Original records: ${normalizationResult.metadata.original_record_count}
- Normalized records: ${normalizationResult.metadata.normalized_record_count}
- Array fields expanded: ${normalizationResult.metadata.array_fields_expanded.join(', ') || 'none'}
- JSON fields parsed: ${normalizationResult.metadata.json_fields_parsed.join(', ') || 'none'}
- Warnings: ${normalizationResult.warnings.join('; ') || 'none'}
`
      : '';

    const analysisPrompt = `Map this data to Fusion Customer template and flag issues.

Source format: ${fileFormat}
${formatInfo}

Columns: ${headers.join(', ')}
Sample: ${JSON.stringify(sourceData[0])}

Destination fields: ORGANIZATION_NAME, ACCOUNT_NAME, ADDRESS1, ADDRESS2, ADDRESS3, ADDRESS4, CITY, STATE, POSTAL_CODE, COUNTRY, EMAIL, PHONE

Return JSON only:
{
  "mappings": [{"source_columns": ["col"], "destination_field": "FIELD", "confidence": "HIGH", "transformation": "TRIM"}],
  "unmapped_columns": [{"column": "col", "reason": "not needed"}],
  "data_quality_issues": [{"severity": "HIGH", "issue_type": "DUPLICATES", "details": "description", "recommended_fix": "action"}],
  "summary": {"total_source_columns": ${headers.length}, "mapped_columns": 0, "unmapped_columns": 0, "critical_issues": 0}
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    let mappings;
    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (Array.isArray(jsonMatch) ? jsonMatch[1] || jsonMatch[0] : jsonMatch[0]) : responseText;
      mappings = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Parse error:', responseText.substring(0, 200));
      return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
    }

    return NextResponse.json({
      mappings,
      sourceSchema: {
        headers,
        total_rows: sourceData.length,
        sample_rows: sourceData.slice(0, 5),
      },
      normalization: normalizationResult,
      file_format: fileFormat,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
