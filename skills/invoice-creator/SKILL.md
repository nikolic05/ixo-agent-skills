---
name: invoice-creator
description: Generate professional invoices from itemized lists. When a user or AI needs to create an invoice document, this skill guides the process of collecting invoice details (items, quantities, prices, customer info), calculating totals and taxes, and generating a formatted invoice file using a professional template. The skill supports customization of invoice metadata, tax rates, and output formats (HTML/PDF).
license: MIT
compatibility: Python 3.8+
allowed-tools: write, shell
---

# Invoice Creator

This skill enables the creation of professional invoices from itemized lists. It guides the AI through collecting invoice data, calculating totals, and generating formatted invoice documents.

## When to Use This Skill

**Trigger conditions:**
- User wants to create an invoice
- User provides a list of items/services with prices
- User needs to generate a billing document
- User mentions "invoice", "bill", "receipt", or "billing"

**Initial offer:**
Offer to help create a professional invoice. Explain that you'll need:
1. Invoice details (number, date, due date)
2. Sender/company information
3. Customer/client information
4. List of items with descriptions, quantities, and unit prices
5. Tax rate (if applicable)
6. Payment terms/notes (optional)

## Workflow

### Step 1: Collect Invoice Metadata

Ask for or confirm:
- **Invoice Number**: Unique identifier (e.g., "INV-2026-001")
- **Invoice Date**: Date of issue
- **Due Date**: Payment deadline (optional)
- **Currency**: Default to USD if not specified

### Step 2: Collect Sender Information

Ask for or use default:
- Company/Business name
- Address
- Contact information (phone, email)
- Tax ID/VAT number (if applicable)

If user doesn't provide, use placeholder values and ask if they want to customize.

### Step 3: Collect Customer Information

Ask for:
- Customer name
- Address
- Contact information (optional)

### Step 4: Collect Line Items

For each item, collect:
- **Item name/description**
- **Quantity**
- **Unit price**
- **Total** (calculated automatically: quantity × unit price)

Support multiple input formats:
- Structured: "Item: Widget, Qty: 5, Price: $10"
- List format: "5x Widget @ $10 each"
- Table format: User provides table data

Continue asking for items until user indicates they're done.

### Step 5: Calculate Totals

Automatically calculate:
- **Subtotal**: Sum of all line item totals
- **Tax**: Subtotal × tax rate (if tax rate provided)
- **Grand Total**: Subtotal + Tax

Display calculations for user confirmation.

### Step 6: Additional Information

Ask for optional details:
- Payment terms (e.g., "Net 30", "Due on receipt")
- Notes/memo
- Tax rate (if not already provided)

### Step 7: Generate Invoice

1. **Load Template**: Use the HTML template from `templates/invoice-template.html`
2. **Render Data**: Fill template with collected information
3. **Create File**: Generate `invoice-{invoice-number}.html` in the current directory
4. **Optional PDF**: If user requests PDF, use the Python script to convert HTML to PDF

**File Output:**
- Filename: `invoice-{invoice-number}.html` (e.g., `invoice-INV-2026-001.html`)
- Format: Professional HTML with embedded CSS
- Print-friendly: Optimized for printing/PDF conversion

## Using the Python Script

The skill includes a Python script (`scripts/generate_invoice.py`) for programmatic invoice generation:

```bash
python scripts/generate_invoice.py invoice_data.json output.html
```

**Input JSON format:**
```json
{
  "invoice_number": "INV-2026-001",
  "invoice_date": "2026-01-28",
  "due_date": "2026-02-27",
  "currency": "USD",
  "sender": {
    "name": "Company Name",
    "address": "123 Main St",
    "city": "City",
    "state": "State",
    "zip": "12345",
    "phone": "+1 (555) 123-4567",
    "email": "billing@company.com",
    "tax_id": "12-3456789"
  },
  "customer": {
    "name": "Customer Name",
    "address": "456 Oak Ave",
    "city": "City",
    "state": "State",
    "zip": "67890"
  },
  "items": [
    {
      "name": "Widget",
      "description": "Premium widget",
      "quantity": 5,
      "unit_price": 10.00,
      "total": 50.00
    }
  ],
  "subtotal": 50.00,
  "tax_rate": 0.08,
  "tax_amount": 4.00,
  "total": 54.00,
  "payment_terms": "Net 30",
  "notes": "Thank you for your business!"
}
```

## Template Features

The invoice template includes:
- Professional header with company logo space
- Clear invoice metadata display
- Organized customer information section
- Itemized table with proper alignment
- Automatic calculations display
- Footer with payment terms and notes
- Print-optimized CSS (removes colors, ensures proper page breaks)
- Responsive design for screen viewing

## Customization

Users can customize:
- Invoice styling (colors, fonts) by modifying the template
- Tax calculations (flat rate, multiple tax types)
- Currency formatting
- Date formats
- Additional fields (PO number, terms, etc.)

## Tips for Effective Invoice Creation

1. **Be thorough**: Collect all necessary information before generating
2. **Verify calculations**: Always show calculations for user confirmation
3. **Professional formatting**: Use consistent formatting and clear labels
4. **Save templates**: If user has recurring invoices, save sender info for reuse
5. **PDF option**: Offer PDF conversion if user needs to email or print

## Error Handling

- Validate all numeric inputs (quantities, prices must be positive numbers)
- Ensure invoice number is unique (warn if file already exists)
- Handle missing optional fields gracefully
- Provide clear error messages if template or script fails

## Scripts

### generate_invoice.py

Generates a professional HTML invoice from JSON data using a template. Validates input data, calculates totals, renders the template, and optionally generates a PDF.

**Usage:**
```bash
python scripts/generate_invoice.py <input.json> <output.html> [--pdf]
```

**Examples:**
```bash
# Generate HTML invoice
python scripts/generate_invoice.py invoice_data.json invoice.html

# Generate HTML + PDF
python scripts/generate_invoice.py invoice_data.json invoice.html --pdf
```

**Returns:** Dict with status, generated file paths, and invoice metadata.