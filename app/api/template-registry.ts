/**
 * Oracle Fusion Template Registry
 * Metadata for all supported import templates
 */

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  sheet_name: string;
  header_row: number;
  total_columns: number;
  key_indicators: string[];
  sample_columns: string[];
}

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  customers: {
    id: 'customers',
    name: 'Customers',
    description: 'Customer Master with Contacts, Addresses, Bank Accounts',
    sheet_name: 'Customers',
    header_row: 5,
    total_columns: 87,
    key_indicators: ['organization_name', 'account_name', 'customer_name', 'email', 'phone'],
    sample_columns: ['*Customer Number', '*Customer Name', '*Account Number', 'Email', 'Phone'],
  },

  assets: {
    id: 'assets',
    name: 'Fixed Assets',
    description: 'Fixed Asset Mass Additions - Asset Book, Description, Type, Tag Number',
    sheet_name: 'FA_MASS_ADDITIONS',
    header_row: 4,
    total_columns: 422,
    key_indicators: ['asset_number', 'asset_description', 'asset_type', 'tag_number', 'asset_book'],
    sample_columns: [
      '*Interface Line Number',
      '*Asset Book',
      '*Asset Description',
      'Asset Type',
      'Tag Number',
      'Serial Number',
      'Cost',
    ],
  },

  suppliers: {
    id: 'suppliers',
    name: 'Suppliers',
    description: 'Supplier Address - Supplier Name, Address, Country, City',
    sheet_name: 'POZ_SUPPLIER_ADDRESSES_INT',
    header_row: 4,
    total_columns: 110,
    key_indicators: ['supplier_name', 'address_name', 'address_line', 'city', 'country'],
    sample_columns: [
      'Batch ID',
      '*Supplier Name',
      '*Address Name',
      '*Country',
      '*Address Line 1',
      'City',
      'State',
      'Postal Code',
    ],
  },

  journals: {
    id: 'journals',
    name: 'Journal Entries',
    description: 'GL Journal Import - Ledger, Journal Source, Category, Amounts',
    sheet_name: 'GL_INTERFACE',
    header_row: 4,
    total_columns: 223,
    key_indicators: ['ledger_id', 'journal_source', 'journal_category', 'amount', 'account'],
    sample_columns: [
      '*Status Code',
      '*Ledger ID',
      '*Effective Date',
      '*Journal Source',
      '*Journal Category',
      '*Currency Code',
      'Segment1',
      'Account Number',
      'Amount',
    ],
  },

  items: {
    id: 'items',
    name: 'Inventory Items',
    description: 'Item Master - Item Number, Description, Organization, Type',
    sheet_name: 'EGP_SYSTEM_ITEMS_INTERFACE',
    header_row: 4,
    total_columns: 400,
    key_indicators: ['item_number', 'item_name', 'organization_code', 'description', 'item_type'],
    sample_columns: [
      '*Name',
      '*Transaction Type',
      '*Item Number',
      '*Organization Code',
      'Description',
      'Item Type',
      'Batch ID',
      'Source System Code',
    ],
  },
};

/**
 * Get template config by ID
 */
export function getTemplate(templateId: string): TemplateConfig | null {
  return TEMPLATE_REGISTRY[templateId] || null;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Detect which template source data likely belongs to
 */
export function detectTemplate(sourceColumns: string[]): string[] {
  const detected: string[] = [];

  sourceColumns.forEach((col) => {
    const lower = col.toLowerCase();

    if (/customer|account|organization|contact/.test(lower)) detected.push('customers');
    if (/asset|book|tag|serial/.test(lower)) detected.push('assets');
    if (/supplier|vendor|address/.test(lower)) detected.push('suppliers');
    if (/journal|ledger|segment|account_number|amount/.test(lower)) detected.push('journals');
    if (/item|sku|inventory|product|organization_code/.test(lower)) detected.push('items');
  });

  // Return unique, most likely first
  return [...new Set(detected)];
}
