import * as XLSX from 'xlsx';
import { TEMPLATE_REGISTRY } from './template-registry';

/**
 * Load column headers from a template file
 */
export async function loadTemplateColumns(templateId: string, file: Buffer): Promise<string[]> {
  const config = TEMPLATE_REGISTRY[templateId];
  if (!config) throw new Error(`Template ${templateId} not found`);

  try {
    const workbook = XLSX.read(file, { type: 'buffer' });
    const sheet = workbook.Sheets[config.sheet_name];

    if (!sheet) {
      throw new Error(`Sheet ${config.sheet_name} not found in template`);
    }

    // Parse sheet to JSON to get headers
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

    // Headers are at config.header_row (1-indexed, but array is 0-indexed)
    const headerRowIndex = config.header_row - 1;

    if (headerRowIndex >= data.length) {
      throw new Error(`Header row ${config.header_row} not found`);
    }

    const headers = data[headerRowIndex];
    const columnHeaders = headers
      .filter((h: any) => h && h.toString().trim() !== '')
      .map((h: any) => h.toString().trim());

    return columnHeaders;
  } catch (error) {
    throw new Error(`Failed to load template columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get expected columns for a template (from registry)
 */
export function getExpectedColumns(templateId: string): string[] {
  const config = TEMPLATE_REGISTRY[templateId];
  if (!config) return [];
  return config.sample_columns;
}
