import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import { normalizeData } from '../normalizer';
import { detectEntities, createEntityMappings, generateEntityAnalysis, splitRowsByEntity } from '../entity-detector';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const template = formData.get('template') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read and normalize data
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let sourceData: any[] = [];
    let fileFormat = 'unknown';
    let normalizationResult: any = null;

    // Try JSON first
    try {
      const text = buffer.toString('utf-8');
      const jsonData = JSON.parse(text);
      fileFormat = 'json';
      normalizationResult = normalizeData(jsonData);

      if (normalizationResult.success) {
        sourceData = normalizationResult.rows;
        fileFormat = normalizationResult.format_detected;
      }
    } catch (jsonError) {
      // Try Excel/CSV
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        sourceData = XLSX.utils.sheet_to_json(sheet);
        fileFormat = 'csv-tabular';

        // Check for Salesforce denormalization
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
        return NextResponse.json({ error: 'Could not parse file' }, { status: 400 });
      }
    }

    if (sourceData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const headers = Object.keys(sourceData[0]);

    // NEW: Detect entities in the data
    const detectedEntities = detectEntities(sourceData);

    if (detectedEntities.length === 0) {
      return NextResponse.json({ error: 'No recognizable entities detected in data' }, { status: 400 });
    }

    // Call Claude for column mappings (existing flow)
    const formatInfo = normalizationResult
      ? `
Format detected: ${normalizationResult.format_detected}
- Original records: ${normalizationResult.metadata.original_record_count}
- Normalized records: ${normalizationResult.metadata.normalized_record_count}
- Arrays expanded: ${normalizationResult.metadata.array_fields_expanded.join(', ') || 'none'}
`
      : '';

    const analysisPrompt = `Map this data to Oracle Fusion Customer template.

Detected entities in source: ${detectedEntities.map((e) => e.name).join(', ')}
${formatInfo}

Columns: ${headers.join(', ')}
Sample: ${JSON.stringify(sourceData[0])}

Destination fields: ORGANIZATION_NAME, ACCOUNT_NAME, ADDRESS1, ADDRESS2, ADDRESS3, ADDRESS4, CITY, STATE, POSTAL_CODE, COUNTRY, EMAIL, PHONE

Return JSON:
{
  "mappings": [{"source_columns": ["col"], "destination_field": "FIELD", "confidence": "HIGH", "transformation": "TRIM"}],
  "unmapped_columns": [{"column": "col", "reason": "reason"}],
  "data_quality_issues": [{"severity": "HIGH", "issue_type": "TYPE", "details": "detail", "recommended_fix": "fix"}],
  "summary": {"total_source_columns": ${headers.length}, "mapped_columns": 5, "unmapped_columns": 10, "critical_issues": 0}
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    let mappings;
    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (Array.isArray(jsonMatch) ? jsonMatch[1] || jsonMatch[0] : jsonMatch[0]) : responseText;
      mappings = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Parse error:', responseText.substring(0, 200));
      return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
    }

    // NEW: Create entity-specific mappings
    const entityMappings = createEntityMappings(mappings, sourceData, detectedEntities);

    // NEW: Generate entity analysis
    const entityAnalysis = generateEntityAnalysis(sourceData, mappings, detectedEntities);

    // NEW: Split rows by entity
    const entityRows = splitRowsByEntity(sourceData, entityMappings);

    return NextResponse.json({
      mappings,
      sourceSchema: {
        headers,
        total_rows: sourceData.length,
        sample_rows: sourceData.slice(0, 5),
      },
      // NEW: Add multi-entity information
      detected_entities: detectedEntities,
      entity_analysis: entityAnalysis,
      entity_rows: entityRows,
      entity_mappings: entityMappings,
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
