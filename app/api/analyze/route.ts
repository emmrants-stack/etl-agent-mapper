import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';

const client = new Anthropic();

const AGENT_SYSTEM_PROMPT = `You are an expert data mapping agent specializing in ERP/Fusion customer data imports.

Your task: Analyze messy source data and map to Fusion template with semantic intelligence.

**Core Rules:**
1. System-generated IDs never from user: PARTY_NUMBER, PARTY_SITE_NUMBER, ACCOUNT_NUMBER, PERSON_PARTY_NUMBER, BUSINESS_UNIT_ID, BANK_ACCOUNT_ID. Mark "SKIP - system will populate".

2. Semantic matching over exact names. "Customer Name", "CUST_NAME", "Company", "Org_Name" → ORGANIZATION_NAME.

3. Confidence scoring: HIGH (obvious), MEDIUM (reasonable), LOW (ambiguous), SKIP (unmapped/system).

4. Flag data quality: duplicates, missing required, format issues, case/spacing inconsistencies.

5. Ruthless: Don't assume bad data becomes good.

Return ONLY valid JSON with no preamble.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const template = formData.get('template') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const sourceData = XLSX.utils.sheet_to_json(sheet);

    if (sourceData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    const headers = Object.keys(sourceData[0]);

    const schema: Record<string, any> = {};
    headers.forEach((header) => {
      const values = sourceData.map((row: any) => row[header]).filter((v) => v);
      const uniqueValues = [...new Set(values)];

      schema[header] = {
        data_type: inferDataType(values),
        sample_values: uniqueValues.slice(0, 3),
        missing_count: sourceData.length - values.length,
        null_percentage: ((sourceData.length - values.length) / sourceData.length * 100).toFixed(1),
        unique_count: uniqueValues.length,
        has_duplicates: uniqueValues.length < values.length,
      };
    });

    const analysisPrompt = `
Analyze this messy customer data and provide mappings to Oracle Fusion Customers template.

Source Data Schema:
- Columns: ${headers.join(', ')}
- Total rows: ${sourceData.length}
- Sample data row 1: ${JSON.stringify(sourceData[0])}

Destination Template Fields (Customer Master):
- PARTY_NUMBER (customer ID - system generated)
- ORGANIZATION_NAME (customer name - REQUIRED)
- ACCOUNT_NUMBER (account ID - system generated)
- ACCOUNT_NAME, CUSTOMER_TYPE, CUSTOMER_CLASS_CODE
- ADDRESS1, ADDRESS2, ADDRESS3, ADDRESS4, CITY, STATE, POSTAL_CODE, COUNTRY
- EMAIL, PHONE
- SITE_USE_CODE (BILL_TO, SHIP_TO, SOLD_TO)

Task:
1. Map each source column to appropriate destination field
2. Flag system-generated fields (skip these)
3. Identify unmapped columns
4. Detect data quality issues: duplicates, missing required fields, format inconsistencies
5. Provide transformation rules (TRIM, UPPER, STANDARDIZE_PHONE, etc)

Return JSON with: mappings[], unmapped_columns[], system_generated_fields[], data_quality_issues[], summary{}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 4000,
      system: AGENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    let mappings;
    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      mappings = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText.substring(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json({
      mappings,
      sourceSchema: { headers, total_rows: sourceData.length, sample_rows: sourceData.slice(0, 3) },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function inferDataType(values: any[]): string {
  if (values.length === 0) return 'UNKNOWN';
  const sample = String(values[0]);
  if (!isNaN(Number(sample)) && sample !== '') return 'NUMBER';
  if (/^\d{4}-\d{2}-\d{2}/.test(sample)) return 'DATE';
  if (/^[^\s@]+@[^\s@]+/.test(sample)) return 'EMAIL';
  if (/[\d\s\-\(\)\+]{10,}/.test(sample)) return 'PHONE';
  return 'TEXT';
}