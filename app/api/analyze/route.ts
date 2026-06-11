import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import { normalizeData } from '../normalizer';
import { getTemplate } from '../template-registry';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const selectedTemplate = formData.get('template') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!selectedTemplate) {
      return NextResponse.json({ error: 'No template selected' }, { status: 400 });
    }

    const templateConfig = getTemplate(selectedTemplate);
    if (!templateConfig) {
      return NextResponse.json({ error: `Template ${selectedTemplate} not found` }, { status: 400 });
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

        // Try normalization for Salesforce pattern
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

    // Build prompt for Claude
    const formatInfo = normalizationResult
      ? `
Format detected: ${normalizationResult.format_detected}
- Original records: ${normalizationResult.metadata.original_record_count}
- Normalized records: ${normalizationResult.metadata.normalized_record_count}
`
      : '';

    const analysisPrompt = `Map this data to Oracle Fusion ${templateConfig.name} template.

${formatInfo}

Source columns: ${headers.join(', ')}
Sample row: ${JSON.stringify(sourceData[0])}

Destination template fields (sample): ${templateConfig.sample_columns.join(', ')}

Return JSON only:
{
  "mappings": [{"source_columns": ["col"], "destination_field": "FIELD", "confidence": "HIGH", "transformation": "TRIM"}],
  "unmapped_columns": [{"column": "col", "reason": "not applicable"}],
  "data_quality_issues": [{"severity": "HIGH", "issue_type": "TYPE", "details": "desc", "recommended_fix": "fix"}],
  "summary": {"mapped": 5, "unmapped": 10, "critical_issues": 0}
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
      return NextResponse.json({ error: 'Claude response parsing failed' }, { status: 500 });
    }

    return NextResponse.json({
      template: selectedTemplate,
      template_config: templateConfig,
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
