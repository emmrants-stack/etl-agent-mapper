# ETL Agent Mapper - AI-Powered Data Mapping for ERP Imports

An intelligent data mapping agent that analyzes messy customer data files and automatically generates mappings to Oracle Fusion ERP templates using Claude Sonnet.

## Features

- **Intelligent Schema Analysis**: Analyzes messy source data using Claude Sonnet to understand column semantics
- **Semantic Mapping**: Maps columns based on meaning, not just naming conventions (e.g., "Customer Name", "CUST_NAME", "Company" all map to ORGANIZATION_NAME)
- **System-Generated ID Detection**: Automatically flags fields that should be skipped (PARTY_NUMBER, ACCOUNT_NUMBER, etc.)
- **Data Quality Flagging**: Identifies and reports:
  - Duplicate records with spelling/case variations
  - Missing required fields
  - Format inconsistencies (phone numbers, emails, dates)
  - Orphaned records
- **Interactive Mapping Review**: Users review proposed mappings before transformation
- **Automated Data Transformation**: Applies cleaning rules (TRIM, UPPER, STANDARDIZE_PHONE, etc.)
- **Excel Export**: Outputs cleaned, mapped data ready for ERP import

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                  │
│  - File upload interface                                │
│  - Mapping review dashboard                             │
│  - Data quality issue viewer                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │   Next.js API Routes │
        │  /api/analyze        │ → Claude Sonnet
        │  /api/transform      │
        └──────────────────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │   Claude Sonnet      │
        │  - Schema analysis   │
        │  - Mapping generation│
        │  - Issue detection   │
        └──────────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- Anthropic API key
- Oracle Fusion customer upload template (UploadCustomersTemplate.xlsm)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd etl-agent-mapper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

4. Place the template file:
```bash
cp UploadCustomersTemplate.xlsm ./public/
```

5. Run development server:
```bash
npm run dev
```

6. Open http://localhost:3000

## Usage

### Basic Flow

1. **Upload File**
   - Select destination template (Customers, Contacts, etc.)
   - Upload your messy Excel/CSV file

2. **Review Mappings**
   - Agent analyzes schema and generates mappings
   - Review proposed column mappings (with confidence levels)
   - Review data quality issues:
     - Duplicates
     - Missing required fields
     - Format inconsistencies

3. **Confirm & Transform**
   - Confirm mappings (can edit before transform)
   - Agent applies transformations and cleaning rules
   - Download cleaned Excel file ready for ERP import

### Example Input File

```
Customer Name | CUST_NAME | Email | phone_number | City | State | Country
Acme Corp     | ACME_CORP | ...   | (555)123-4567| NY   | NY   | US
acme corp     | ACME CORP | ...   | 555-123-4567 | NY   | NY   | USA
```

### Example Output

Mappings generated:
- "Customer Name" → ORGANIZATION_NAME (HIGH confidence)
- "CUST_NAME" → ORGANIZATION_NAME (MEDIUM confidence, deduplicate)
- "Email" → EMAIL_ADDRESS (HIGH)
- "phone_number" → PHONE_NUMBER + standardize format (HIGH)
- "City" → CITY (HIGH)
- "State" → STATE (HIGH)
- "Country" → COUNTRY (MEDIUM - validate against TERRITORY_CODE)

Data Quality Flagged:
- ⚠️ Duplicate: "Acme Corp" / "acme corp" / "ACME CORP" in rows 1, 2, 15
- ⚠️ Missing: Email blank in rows 8, 12, 20
- ⚠️ Format: Phone numbers in 3 different formats (555-123-4567, (555)1234, etc.)

## Agent Logic

### System-Generated Fields (Automatic SKIP)

The agent recognizes these fields as system-generated and skips them:
- PARTY_NUMBER (customer ID)
- PARTY_SITE_NUMBER (site ID)
- ACCOUNT_NUMBER (account ID)
- PERSON_PARTY_NUMBER (contact ID)
- BUSINESS_UNIT_ID
- BANK_ACCOUNT_ID

Users are never asked to provide these.

### Confidence Scoring

- **HIGH**: Clear semantic match (email → EMAIL, city → CITY)
- **MEDIUM**: Reasonable but needs context (state abbreviations, phone areas)
- **LOW**: Ambiguous, needs user review
- **SKIP**: Unmapped or system-generated

### Data Quality Detection

**Duplicates**: Fuzzy matching on company names, flagging:
- Case variations (Acme Corp vs ACME CORP vs acme corp)
- Spelling differences (TechStart vs Tech Start vs TechStar)
- Spacing issues (Smith,John vs Smith, John)
- Abbreviations (Inc. vs Inc vs Incorporated)

**Missing Required Fields**:
- ORGANIZATION_NAME (customer name)
- PARTY_SITE_ORIG_SYS_REF (site reference)
- SITE_USE_CODE (bill-to, ship-to, sold-to)
- ADDRESS1 (primary address)
- COUNTRY

**Format Issues**:
- Phone: Different formats, missing digits, invalid patterns
- Email: Missing @, invalid domain, spaces
- Date: Mixed formats (MM/DD/YYYY vs DD/MM/YYYY)
- Country: Non-ISO 2-letter codes (verify against TERRITORY_CODE)

## Transformation Rules

Applied during the transform step:

| Rule | Example |
|------|---------|
| TRIM | " John Smith " → "John Smith" |
| UPPER | "john smith" → "JOHN SMITH" |
| LOWER | "JOHN SMITH" → "john smith" |
| PROPER CASE | "john smith" → "John Smith" |
| REMOVE_SPACES | "John Smith" → "JohnSmith" |
| STANDARDIZE_PHONE | "555-123-4567" → "(555) 123-4567" |
| NORMALIZE_EMAIL | "JOHN@EXAMPLE.COM" → "john@example.com" |

## API Reference

### POST /api/analyze

Analyzes source file and generates mappings.

**Request:**
```
Content-Type: multipart/form-data
- file: Excel/CSV file
- template: "Customers" | "Contacts" | "Reference Accounts" | "Bank Accounts"
```

**Response:**
```json
{
  "mappings": {
    "mappings": [
      {
        "source_column": "Customer Name",
        "destination_field": "ORGANIZATION_NAME",
        "confidence": "HIGH",
        "transformation": "TRIM, PROPER CASE",
        "rationale": "Primary customer identifier"
      }
    ],
    "unmapped_columns": [...],
    "system_generated_fields": [...],
    "data_quality_issues": [...],
    "summary": {...}
  },
  "sourceSchema": {...},
  "timestamp": "2024-05-20T11:00:00Z"
}
```

### POST /api/transform

Applies mappings and returns transformed Excel file.

**Request:**
```json
{
  "mappingResult": { /* from /api/analyze */ }
}
```

**Response:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
(Excel file download)
```

## Development

### Project Structure

```
etl-agent-mapper/
├── app/
│   ├── page.tsx           # Main UI component
│   ├── layout.tsx         # Root layout
│   └── api/
│       ├── analyze/
│       │   └── route.ts   # Mapping analysis endpoint
│       └── transform/
│           └── route.ts   # Data transformation endpoint
├── agent-mapper.js        # Core agent logic (standalone)
├── public/
│   └── UploadCustomersTemplate.xlsm
├── package.json
└── README.md
```

### Adding New Templates

1. Add template to `app/page.tsx` templates array:
```tsx
const templates = ['Customers', 'Contacts', 'Reference Accounts', 'Bank Accounts', 'NewTemplate'];
```

2. Update `/api/analyze` to handle new template fields

3. Add destination fields to agent system prompt

## Known Limitations

- Single-sheet source files (multi-sheet imports split into separate jobs)
- Basic fuzzy matching for deduplication (uses string similarity, not ML)
- Transformation rules are predefined (custom logic requires modification)
- No manual mapping override UI yet (planned for v2)
- Memory limitation: Files > 50MB not recommended

## Future Enhancements

- [ ] Manual mapping overrides
- [ ] Learning from previous mappings
- [ ] Support for multi-sheet source files
- [ ] Custom transformation rule builder
- [ ] Integration with Fusion API for direct upload
- [ ] Batch processing multiple files
- [ ] Advanced deduplication with ML-based fuzzy matching
- [ ] Mapping templates for different industry verticals
- [ ] Audit trail and mapping history
- [ ] API key management UI

## Troubleshooting

### "Failed to parse AI response"
- Check ANTHROPIC_API_KEY is valid
- Ensure Claude Sonnet model is available
- Check API request size (files > 10MB might hit limits)

### "File is empty"
- Verify source file has data rows
- Check file format (supports .xlsx, .xls, .csv)

### Mappings look wrong
- Review the "Rationale" field for each mapping
- Check confidence scores
- Unmapped columns may need manual review
- Report edge cases for agent prompt refinement

## Support

For issues or questions:
1. Check this README
2. Review data quality flags in the UI
3. Check logs in browser console (F12)
4. Review Claude's reasoning in mapping rationales

## License

MIT

## Author

Built with Claude Sonnet 4 and Next.js 14
