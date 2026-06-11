import * as XLSX from 'xlsx';

/**
 * Oracle template column structures (from UploadCustomersTemplate.xlsm)
 */
const ORACLE_COLUMNS = {
  Customers: [
    '*Source System', '*Customer Number', 'Customer Source Reference', '*Customer Name', 'D-U-N-S Number',
    'Taxpayer ID', 'Taxpayer Registration Number', 'Customer GSA Indicator', '*Account Number', 'Account Source Reference',
    'Account Description', 'Account Type', 'Account Established Date', 'Customer Class', 'Customer Profile Class',
    '*Site Number', 'Site Source Reference', 'Site Name', '*Account Address Set', '*Location Source Reference',
    '*Address Line 1', 'Address Line 2', 'Mail Stop', 'Address Line 3', 'Address Line 4', 'Building', 'Floor Number',
    'Type of House', 'Additional Address Attribute 1', 'Additional Address Attribute 2', 'Additional Address Attribute 3',
    'Additional Address Attribute 4', 'Additional Address Attribute 5', 'City', 'State', 'Province', 'Postal Code',
    'Postal Code Extension', 'County', '*Country', 'Phonetic Address Line', 'Address Description', 'Short Description',
    'Time Zone Code', 'Sales Tax Geocode', 'Sales Tax Inside City Limits', '*Identifying Address', 'Site Language',
    'Translated Customer Name', '*Site Purpose Source Reference', '*Purpose', '*Site Purpose Primary Indicator', 'Site',
    'Bill-to Site', 'Payment Method', 'Primary Payment Method Indicator', ...Array(30).fill('').map((_, i) => `Descriptive Flexfield Segment ${i + 1}`),
  ],

  Contacts: [
    '*Source System', '*Customer Number', 'Customer Source Reference', '*Contact Number', 'Contact Source Reference',
    '*Contact First Name', '*Contact Last Name', 'Contact Middle Name', 'Contact Name Prefix', 'Contact Name Suffix',
    'Contact Title', 'Contact Email Address', 'Contact Phone Number', 'Contact Mobile Number', 'Contact Fax Number',
    'Contact Preferred Contact Method', 'Contact Department', 'Contact Preferred Name', 'Contact Effective From Date',
    'Contact Effective To Date', 'Contact Primary Indicator', 'Contact Status', ...Array(26).fill('').map((_, i) => `Descriptive Flexfield Segment ${i + 1}`),
  ],

  ReferenceAccounts: [
    '*Source System', '*Customer Number', 'Customer Source Reference', '*Reference Account Number', 'Reference Account Source Reference',
    '*Reference Account Name', 'Reference Account Type', 'Reference Account Description', '*Address Line 1', 'Address Line 2',
    'Address Line 3', 'Address Line 4', 'City', 'State', 'Province', 'Postal Code', 'Postal Code Extension', 'County',
    '*Country', 'Address Effective From Date', 'Address Effective To Date', 'Address Status', ...Array(14).fill('').map((_, i) => `Descriptive Flexfield Segment ${i + 1}`),
  ],

  BankAccounts: [
    '*Source System', '*Customer Number', 'Customer Source Reference', '*Bank Account Number', 'Bank Account Source Reference',
    '*Bank Account Name', 'Bank Name', 'Bank Account Type', 'Bank Account Currency Code', 'Bank Account IBAN',
    'Bank Account BIC', 'Bank Account Status', 'Bank Account Effective From Date', 'Bank Account Effective To Date',
    '*Account Holder Name', 'Account Holder Type', 'Routing Number', 'Account Number', ...Array(13).fill('').map((_, i) => `Descriptive Flexfield Segment ${i + 1}`),
  ],
};

/**
 * Transform entity-specific data into Oracle format for a sheet
 */
function transformEntityData(entityRows: any[], mappings: any[], sheetType: string): Record<string, any>[] {
  const columns = ORACLE_COLUMNS[sheetType as keyof typeof ORACLE_COLUMNS] || [];
  const mappingLookup: Record<string, any> = {};

  // Build lookup: Oracle column -> source column mapping
  mappings.forEach((m: any) => {
    if (m.destination_field) {
      mappingLookup[m.destination_field] = {
        source_columns: Array.isArray(m.source_columns) ? m.source_columns : [m.source_columns],
        transformation: m.transformation,
      };
    }
  });

  // Transform each row
  return entityRows.map((sourceRow: any) => {
    const oracleRow: Record<string, any> = {};

    columns.forEach((oracleCol) => {
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
        // No mapping - leave empty
        oracleRow[oracleCol] = '';
      }
    });

    return oracleRow;
  });
}

/**
 * Apply data transformation rules
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
    else if (rule.includes('LEFT(TRIM')) {
      const match = rule.match(/LEFT.*,\s*(\d+)\)/);
      if (match) {
        const len = parseInt(match[1]);
        result = result.substring(0, len);
      }
    }
  });

  return result;
}

/**
 * Generate multi-sheet Excel workbook
 */
export function generateMultiSheetExcel(
  entityData: Record<
    string,
    {
      rows: any[];
      mappings: any[];
    }
  >
): Buffer {
  const wb = XLSX.utils.book_new();

  // Generate sheet for each entity
  Object.keys(entityData).forEach((entityType) => {
    const { rows, mappings } = entityData[entityType];

    if (rows && rows.length > 0) {
      // Transform data to Oracle format
      const transformedRows = transformEntityData(rows, mappings, entityType);

      // Get column headers
      const columns = ORACLE_COLUMNS[entityType as keyof typeof ORACLE_COLUMNS] || [];

      // Create sheet
      const ws = XLSX.utils.json_to_sheet(transformedRows, { header: columns });
      ws['!cols'] = Array(columns.length).fill({ wch: 15 });

      // Add sheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, entityType);
    }
  });

  // Add empty sheets for entities not in data (for completeness)
  const allSheets = ['Customers', 'Contacts', 'ReferenceAccounts', 'BankAccounts'];
  allSheets.forEach((sheetName) => {
    if (!Object.keys(entityData).includes(sheetName)) {
      const columns = ORACLE_COLUMNS[sheetName as keyof typeof ORACLE_COLUMNS] || [];
      const ws = XLSX.utils.json_to_sheet([], { header: columns });
      ws['!cols'] = Array(columns.length).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  // Generate buffer
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

/**
 * Prepare entity data for Excel generation
 */
export function prepareEntityDataForExcel(
  entityRows: Record<string, any[]>,
  entityMappings: Record<string, any>,
  claudeMappings: any
): Record<
  string,
  {
    rows: any[];
    mappings: any[];
  }
> {
  const result: Record<
    string,
    {
      rows: any[];
      mappings: any[];
    }
  > = {};

  Object.keys(entityRows).forEach((entityType) => {
    const rows = entityRows[entityType];
    const mappings = entityMappings[entityType]?.column_mappings || [];

    // Use Claude mappings if entity-specific not available
    const finalMappings = mappings.length > 0 ? mappings : claudeMappings.mappings;

    result[entityType] = {
      rows,
      mappings: finalMappings,
    };
  });

  return result;
}
