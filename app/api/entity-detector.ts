/**
 * Multi-Entity Detection and Mapping
 * Detects what entities are in source data and creates mappings for each
 */

export interface DetectedEntity {
  name: string;
  confidence: number;
  key_indicators: string[];
}

export interface EntityAnalysis {
  detected_entities: DetectedEntity[];
  entity_mappings: Record<string, EntityMapping>;
  warnings: string[];
}

export interface EntityMapping {
  entity_type: string;
  source_columns: string[];
  destination_template: string;
  column_mappings: ColumnMapping[];
  unmapped_columns: string[];
  row_count_estimate: number;
}

export interface ColumnMapping {
  source_column: string;
  destination_field: string;
  confidence: string;
  transformation: string;
}

/**
 * Detect what entities are present in the normalized data
 */
export function detectEntities(normalizedRows: any[]): DetectedEntity[] {
  if (!normalizedRows || normalizedRows.length === 0) return [];

  const sampleRow = normalizedRows[0];
  const allColumns = Object.keys(sampleRow);
  const entities: DetectedEntity[] = [];

  // Check for CUSTOMERS
  const customerIndicators = ['organization_name', 'account_name', 'customer_name', 'company', 'cust_name'];
  const hasCustomer = customerIndicators.some((ind) => allColumns.some((col) => col.toLowerCase().includes(ind)));
  if (hasCustomer) {
    entities.push({
      name: 'Customers',
      confidence: 0.95,
      key_indicators: allColumns.filter((col) => /name|email|phone|organization|account/.test(col.toLowerCase())),
    });
  }

  // Check for CONTACTS
  const contactIndicators = ['contact_name', 'contact_first', 'contact_last', 'contact_email', 'contact_phone', 'contact_title'];
  const hasContact = contactIndicators.some((ind) => allColumns.some((col) => col.toLowerCase().includes(ind)));
  if (hasContact) {
    entities.push({
      name: 'Contacts',
      confidence: 0.87,
      key_indicators: allColumns.filter((col) => /contact|person|first|last|title|role/.test(col.toLowerCase())),
    });
  }

  // Check for ADDRESSES / REFERENCE ACCOUNTS
  const addressIndicators = ['address1', 'address_line', 'city', 'state', 'postal_code', 'street'];
  const hasAddress = addressIndicators.some((ind) => allColumns.some((col) => col.toLowerCase().includes(ind)));
  if (hasAddress) {
    entities.push({
      name: 'ReferenceAccounts',
      confidence: 0.92,
      key_indicators: allColumns.filter((col) => /address|city|state|postal|street|country/.test(col.toLowerCase())),
    });
  }

  // Check for BANK ACCOUNTS
  const bankIndicators = ['bank_name', 'account_number', 'routing_number', 'bank_account', 'account_holder'];
  const hasBank = bankIndicators.some((ind) => allColumns.some((col) => col.toLowerCase().includes(ind)));
  if (hasBank) {
    entities.push({
      name: 'BankAccounts',
      confidence: 0.75,
      key_indicators: allColumns.filter((col) => /bank|account|routing|holder/.test(col.toLowerCase())),
    });
  }

  return entities;
}

/**
 * Create entity-specific column mappings based on Claude's analysis
 */
export function createEntityMappings(
  claudeMappings: any,
  normalizedRows: any[],
  detectedEntities: DetectedEntity[]
): Record<string, EntityMapping> {
  const entityMappings: Record<string, EntityMapping> = {};

  // CUSTOMERS mapping
  if (detectedEntities.some((e) => e.name === 'Customers')) {
    entityMappings['Customers'] = {
      entity_type: 'Customers',
      source_columns: claudeMappings.mappings.map((m: any) => m.source_columns).flat(),
      destination_template: 'Customers',
      column_mappings: claudeMappings.mappings.filter(
        (m: any) =>
          /ORGANIZATION_NAME|ACCOUNT_NAME|EMAIL|PHONE|ADDRESS|CITY|STATE|POSTAL_CODE|COUNTRY/.test(m.destination_field)
      ),
      unmapped_columns: claudeMappings.unmapped_columns.map((u: any) => u.column),
      row_count_estimate: normalizedRows.length,
    };
  }

  // CONTACTS mapping
  if (detectedEntities.some((e) => e.name === 'Contacts')) {
    entityMappings['Contacts'] = {
      entity_type: 'Contacts',
      source_columns: claudeMappings.mappings
        .map((m: any) => m.source_columns)
        .flat()
        .filter((col: string) => /contact|person|first|last|title/.test(col.toLowerCase())),
      destination_template: 'Contacts',
      column_mappings: [
        // Will be populated with contact-specific mappings
        {
          source_column: 'contact_name',
          destination_field: 'CONTACT_NAME',
          confidence: 'HIGH',
          transformation: 'TRIM, PROPER_CASE',
        },
      ],
      unmapped_columns: [],
      row_count_estimate: normalizedRows.length, // Could be higher if contacts are expanded
    };
  }

  // REFERENCE_ACCOUNTS mapping (Addresses)
  if (detectedEntities.some((e) => e.name === 'ReferenceAccounts')) {
    entityMappings['ReferenceAccounts'] = {
      entity_type: 'ReferenceAccounts',
      source_columns: claudeMappings.mappings
        .map((m: any) => m.source_columns)
        .flat()
        .filter((col: string) => /address|city|state|postal|country/.test(col.toLowerCase())),
      destination_template: 'ReferenceAccounts',
      column_mappings: claudeMappings.mappings.filter(
        (m: any) => /ADDRESS|CITY|STATE|POSTAL_CODE|COUNTRY/.test(m.destination_field)
      ),
      unmapped_columns: [],
      row_count_estimate: normalizedRows.length,
    };
  }

  // BANK_ACCOUNTS mapping
  if (detectedEntities.some((e) => e.name === 'BankAccounts')) {
    entityMappings['BankAccounts'] = {
      entity_type: 'BankAccounts',
      source_columns: claudeMappings.mappings
        .map((m: any) => m.source_columns)
        .flat()
        .filter((col: string) => /bank|account|routing/.test(col.toLowerCase())),
      destination_template: 'BankAccounts',
      column_mappings: [
        {
          source_column: 'bank_name',
          destination_field: 'BANK_NAME',
          confidence: 'HIGH',
          transformation: 'TRIM',
        },
      ],
      unmapped_columns: [],
      row_count_estimate: normalizedRows.length,
    };
  }

  return entityMappings;
}

/**
 * Split normalized rows into entity-specific subsets
 */
export function splitRowsByEntity(
  normalizedRows: any[],
  entityMappings: Record<string, EntityMapping>
): Record<string, any[]> {
  const entityRows: Record<string, any[]> = {};

  Object.keys(entityMappings).forEach((entityType) => {
    const mapping = entityMappings[entityType];
    const sourceColumns = mapping.source_columns;

    // Filter rows that have data for this entity
    const relevantRows = normalizedRows.filter((row) =>
      sourceColumns.some((col) => row[col] && row[col] !== '')
    );

    entityRows[entityType] = relevantRows;
  });

  return entityRows;
}

/**
 * Generate entity analysis for UI display
 */
export function generateEntityAnalysis(
  normalizedRows: any[],
  claudeMappings: any,
  detectedEntities: DetectedEntity[]
): EntityAnalysis {
  const entityMappings = createEntityMappings(claudeMappings, normalizedRows, detectedEntities);
  const entityRows = splitRowsByEntity(normalizedRows, entityMappings);

  const warnings: string[] = [];

  // Warn about entities with few rows
  Object.keys(entityRows).forEach((entity) => {
    if (entityRows[entity].length === 0) {
      warnings.push(`${entity}: No source data found - sheet will be empty`);
    } else if (entityRows[entity].length < 3) {
      warnings.push(`${entity}: Only ${entityRows[entity].length} row(s) detected`);
    }
  });

  return {
    detected_entities: detectedEntities,
    entity_mappings: entityMappings,
    warnings,
  };
}
