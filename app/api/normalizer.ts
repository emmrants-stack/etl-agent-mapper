/**
 * Smart Data Normalizer
 * Handles: MongoDB nested, Salesforce denormalized, JSON API hybrid
 * Detects format, parses nested structures, flattens intelligently
 */

export interface NormalizedRow {
  [key: string]: any;
}

export interface NormalizationResult {
  success: boolean;
  format_detected: string;
  rows: NormalizedRow[];
  warnings: string[];
  metadata: {
    original_record_count: number;
    normalized_record_count: number;
    array_fields_expanded: string[];
    json_fields_parsed: string[];
  };
}

/**
 * Main normalizer entry point
 */
export function normalizeData(data: any): NormalizationResult {
  const warnings: string[] = [];

  // Detect format
  const format = detectFormat(data);
  console.log(`Detected format: ${format}`);

  let rows: NormalizedRow[] = [];
  let arrayFieldsExpanded: string[] = [];
  let jsonFieldsParsed: string[] = [];

  try {
    switch (format) {
      case 'mongodb-nested':
        const mongoResult = normalizeMongoDBNested(data);
        rows = mongoResult.rows;
        arrayFieldsExpanded = mongoResult.arrayFieldsExpanded;
        jsonFieldsParsed = mongoResult.jsonFieldsParsed;
        warnings.push(...mongoResult.warnings);
        break;

      case 'salesforce-denormalized':
        const sfResult = normalizeSalesforcedenormalized(data);
        rows = sfResult.rows;
        arrayFieldsExpanded = sfResult.arrayFieldsExpanded;
        jsonFieldsParsed = sfResult.jsonFieldsParsed;
        warnings.push(...sfResult.warnings);
        break;

      case 'json-api-hybrid':
        const jsonResult = normalizeJSONAPIHybrid(data);
        rows = jsonResult.rows;
        arrayFieldsExpanded = jsonResult.arrayFieldsExpanded;
        jsonFieldsParsed = jsonResult.jsonFieldsParsed;
        warnings.push(...jsonResult.warnings);
        break;

      case 'csv-tabular':
        rows = data; // Already normalized
        break;

      default:
        rows = data;
        warnings.push('Unknown format, treating as tabular');
    }

    return {
      success: true,
      format_detected: format,
      rows,
      warnings,
      metadata: {
        original_record_count: Array.isArray(data) ? data.length : 1,
        normalized_record_count: rows.length,
        array_fields_expanded: arrayFieldsExpanded,
        json_fields_parsed: jsonFieldsParsed,
      },
    };
  } catch (error) {
    return {
      success: false,
      format_detected: format,
      rows: [],
      warnings: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        original_record_count: 0,
        normalized_record_count: 0,
        array_fields_expanded: [],
        json_fields_parsed: [],
      },
    };
  }
}

/**
 * Detect input data format
 */
function detectFormat(data: any): string {
  if (!data) return 'unknown';

  // Handle JSON string input
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return 'csv-tabular';
    }
  }

  // Array of objects
  if (Array.isArray(data)) {
    const firstRecord = data[0];
    if (!firstRecord) return 'unknown';

    // MongoDB: has _id and nested objects
    if (firstRecord._id && (typeof firstRecord.customer === 'object' || typeof firstRecord.contact_info === 'object')) {
      return 'mongodb-nested';
    }

    // Salesforce: has Contact 1, Contact 2, Opportunity 1, etc
    const keys = Object.keys(firstRecord);
    if (keys.some((k) => /Contact \d+ (Name|Email)/.test(k)) || keys.some((k) => /Opportunity \d+ (Name|Amount)/.test(k))) {
      return 'salesforce-denormalized';
    }

    return 'csv-tabular';
  }

  // Single JSON object with nested structure
  if (typeof data === 'object') {
    // JSON API response: has data.customers or similar
    if (data.data && (Array.isArray(data.data) || data.data.customers)) {
      return 'json-api-hybrid';
    }

    // MongoDB document
    if (data._id || (data.customer && typeof data.customer === 'object')) {
      return 'mongodb-nested';
    }
  }

  return 'unknown';
}

/**
 * Normalize MongoDB nested structure
 * Pattern: nested objects + arrays
 */
function normalizeMongoDBNested(data: any) {
  const rows: NormalizedRow[] = [];
  const arrayFieldsExpanded: string[] = [];
  const jsonFieldsParsed: string[] = [];
  const warnings: string[] = [];

  const records = Array.isArray(data) ? data : [data];

  records.forEach((record, recordIdx) => {
    try {
      // Flatten nested objects
      const flatRecord = flattenObject(record, '');

      // Check for arrays that need expansion
      const arrayFields = Object.keys(flatRecord).filter((key) => Array.isArray(flatRecord[key]));

      if (arrayFields.length > 0) {
        // Expand arrays - create one row per array item
        const mainArrayField = arrayFields[0]; // Usually 'addresses'
        const arrayItems = flatRecord[mainArrayField] as any[];
        const nonArrayData = { ...flatRecord };
        delete nonArrayData[mainArrayField];

        arrayItems.forEach((item, itemIdx) => {
          const expandedRow = {
            ...nonArrayData,
            ...flattenObject(item, `${mainArrayField}_`),
            [`${mainArrayField}_index`]: itemIdx,
          };
          rows.push(expandedRow);
          arrayFieldsExpanded.push(`${mainArrayField} (${arrayItems.length} items)`);
        });
      } else {
        // No arrays, just use flattened record
        rows.push(flatRecord);
      }
    } catch (error) {
      warnings.push(`Record ${recordIdx}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });

  return { rows, arrayFieldsExpanded, jsonFieldsParsed, warnings };
}

/**
 * Normalize Salesforce denormalized structure
 * Pattern: multiple contacts/opportunities in columns
 */
function normalizeSalesforcedenormalized(data: any) {
  const rows: NormalizedRow[] = [];
  const arrayFieldsExpanded: string[] = [];
  const jsonFieldsParsed: string[] = [];
  const warnings: string[] = [];

  const records = Array.isArray(data) ? data : [data];

  records.forEach((record, recordIdx) => {
    try {
      // Identify contact and opportunity groups
      const contactGroups = extractNumberedGroups(record, 'Contact');
      const opportunityGroups = extractNumberedGroups(record, 'Opportunity');

      // Start with base record (non-grouped fields)
      const baseRecord = { ...record };

      // Remove all Contact and Opportunity fields from base
      Object.keys(baseRecord).forEach((key) => {
        if (/Contact \d+|Opportunity \d+/.test(key)) {
          delete baseRecord[key];
        }
      });

      // If we have contacts or opportunities, expand them
      if (contactGroups.length > 0 || opportunityGroups.length > 0) {
        // Create one row per contact (primary)
        const numContacts = Math.max(contactGroups.length, 1);

        for (let i = 0; i < numContacts; i++) {
          const expandedRow = { ...baseRecord };

          // Add contact fields
          if (contactGroups[i]) {
            Object.keys(contactGroups[i]).forEach((key) => {
              expandedRow[`contact_${key}`] = contactGroups[i][key];
            });
          }

          // Add first opportunity
          if (opportunityGroups[0]) {
            Object.keys(opportunityGroups[0]).forEach((key) => {
              expandedRow[`opportunity_${key}`] = opportunityGroups[0][key];
            });
          }

          expandedRow['contact_index'] = i;
          rows.push(expandedRow);
        }

        arrayFieldsExpanded.push(`Contacts (${contactGroups.length})`);
        if (opportunityGroups.length > 0) {
          arrayFieldsExpanded.push(`Opportunities (${opportunityGroups.length})`);
        }
      } else {
        rows.push(baseRecord);
      }
    } catch (error) {
      warnings.push(`Record ${recordIdx}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });

  return { rows, arrayFieldsExpanded, jsonFieldsParsed, warnings };
}

/**
 * Normalize JSON API hybrid structure
 * Pattern: JSON strings inside fields, nested objects, arrays
 */
function normalizeJSONAPIHybrid(data: any) {
  const rows: NormalizedRow[] = [];
  const arrayFieldsExpanded: string[] = [];
  const jsonFieldsParsed: string[] = [];
  const warnings: string[] = [];

  // Handle API response format
  let records = data;
  if (data.data && data.data.customers) {
    records = data.data.customers;
  } else if (data.data && Array.isArray(data.data)) {
    records = data.data;
  }

  records = Array.isArray(records) ? records : [records];

  records.forEach((record, recordIdx) => {
    try {
      const flatRecord: NormalizedRow = {};
      const parsedJsonFields: string[] = [];

      Object.keys(record).forEach((key) => {
        const value = record[key];

        // Try to parse JSON strings
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            const parsed = JSON.parse(value);
            const flattened = flattenObject(parsed, `${key}_`);
            Object.assign(flatRecord, flattened);
            parsedJsonFields.push(key);
            jsonFieldsParsed.push(key);
          } catch {
            flatRecord[key] = value;
          }
        } else if (Array.isArray(value)) {
          // Handle arrays
          if (value.length > 0 && typeof value[0] === 'object') {
            // Array of objects - flatten first item
            const flattened = flattenObject(value[0], `${key}_`);
            Object.assign(flatRecord, flattened);
            arrayFieldsExpanded.push(`${key} (${value.length} items)`);
          } else {
            // Array of primitives - join them
            flatRecord[key] = value.join(', ');
          }
        } else if (typeof value === 'object' && value !== null) {
          // Nested object
          const flattened = flattenObject(value, `${key}_`);
          Object.assign(flatRecord, flattened);
        } else {
          flatRecord[key] = value;
        }
      });

      rows.push(flatRecord);

      if (parsedJsonFields.length > 0) {
        warnings.push(`Record ${recordIdx}: Parsed JSON from ${parsedJsonFields.join(', ')}`);
      }
    } catch (error) {
      warnings.push(`Record ${recordIdx}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });

  return { rows, arrayFieldsExpanded, jsonFieldsParsed, warnings };
}

/**
 * Flatten nested objects with prefix
 */
function flattenObject(obj: any, prefix = ''): NormalizedRow {
  const flattened: NormalizedRow = {};

  if (!obj || typeof obj !== 'object') {
    return { [prefix.slice(0, -1)]: obj };
  }

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix + key;

    if (value === null || value === undefined) {
      flattened[newKey] = '';
    } else if (Array.isArray(value)) {
      flattened[newKey] = value;
    } else if (typeof value === 'object') {
      // Recursively flatten
      Object.assign(flattened, flattenObject(value, newKey + '_'));
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}

/**
 * Extract numbered groups (Contact 1, Contact 2, etc)
 */
function extractNumberedGroups(record: any, prefix: string) {
  const groups: NormalizedRow[] = [];
  const groupMap: Record<number, NormalizedRow> = {};

  Object.keys(record).forEach((key) => {
    const match = key.match(new RegExp(`^${prefix} (\\d+) (.+)$`));
    if (match) {
      const groupNum = parseInt(match[1]) - 1; // 0-indexed
      const fieldName = match[2];
      const value = record[key];

      if (!groupMap[groupNum]) {
        groupMap[groupNum] = {};
      }
      groupMap[groupNum][fieldName] = value;
    }
  });

  // Convert to array, sorted by key
  return Object.keys(groupMap)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((key) => groupMap[parseInt(key)]);
}
