#!/usr/bin/env python3
"""
Invoice Generator Script

Generates a professional HTML invoice from JSON data using a template.

Usage:
    python generate_invoice.py <input.json> <output.html> [--pdf]

Example:
    python generate_invoice.py invoice_data.json invoice.html
    python generate_invoice.py invoice_data.json invoice.pdf --pdf
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP


def format_currency(amount, currency='USD'):
    """Format amount as currency."""
    symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
    }
    symbol = symbols.get(currency, currency)
    return f"{symbol}{amount:.2f}"


def format_percentage(rate):
    """Format tax rate as percentage."""
    return f"{rate * 100:.1f}%"


def number_format(value, decimals=2):
    """Format number with specified decimal places."""
    return f"{float(value):.{decimals}f}"


def load_template(template_path):
    """Load HTML template."""
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()


def render_template(template, data):
    """Render template with data using simple string replacement."""
    html = template
    
    # Replace simple variables
    html = html.replace('{{invoice_number}}', str(data.get('invoice_number', '')))
    html = html.replace('{{invoice_date}}', str(data.get('invoice_date', '')))
    html = html.replace('{{due_date}}', str(data.get('due_date', '')))
    
    # Currency symbol
    currency = data.get('currency', 'USD')
    currency_symbol = format_currency(0, currency).replace('0.00', '')
    html = html.replace('{{currency_symbol}}', currency_symbol)
    
    # Sender information
    sender = data.get('sender', {})
    html = html.replace('{{sender.name}}', sender.get('name', ''))
    html = html.replace('{{sender.address}}', sender.get('address', ''))
    html = html.replace('{{sender.city}}', sender.get('city', ''))
    html = html.replace('{{sender.state}}', sender.get('state', ''))
    html = html.replace('{{sender.zip}}', sender.get('zip', ''))
    html = html.replace('{{sender.phone}}', sender.get('phone', ''))
    html = html.replace('{{sender.email}}', sender.get('email', ''))
    html = html.replace('{{sender.tax_id}}', sender.get('tax_id', ''))
    
    # Customer information
    customer = data.get('customer', {})
    html = html.replace('{{customer.name}}', customer.get('name', ''))
    html = html.replace('{{customer.address}}', customer.get('address', ''))
    html = html.replace('{{customer.city}}', customer.get('city', ''))
    html = html.replace('{{customer.state}}', customer.get('state', ''))
    html = html.replace('{{customer.zip}}', customer.get('zip', ''))
    
    # Payment terms and notes
    html = html.replace('{{payment_terms}}', str(data.get('payment_terms', '')))
    html = html.replace('{{notes}}', str(data.get('notes', '')))
    
    # Totals
    subtotal = float(data.get('subtotal', 0))
    tax_rate = float(data.get('tax_rate', 0))
    tax_amount = float(data.get('tax_amount', 0))
    total = float(data.get('total', 0))
    
    html = html.replace('{{subtotal | number_format(2)}}', number_format(subtotal))
    html = html.replace('{{tax_rate | percentage}}', format_percentage(tax_rate))
    html = html.replace('{{tax_amount | number_format(2)}}', number_format(tax_amount))
    html = html.replace('{{total | number_format(2)}}', number_format(total))
    
    # Handle conditional blocks (simple approach)
    if not data.get('due_date'):
        # Remove due date line if not present
        html = html.replace('<p><strong>Due Date:</strong> {{due_date}}</p>', '')
    
    if not sender.get('city'):
        html = html.replace('<p>{{sender.city}}, {{sender.state}} {{sender.zip}}</p>', '')
    
    if not sender.get('phone'):
        html = html.replace('<p>Phone: {{sender.phone}}</p>', '')
    
    if not sender.get('email'):
        html = html.replace('<p>Email: {{sender.email}}</p>', '')
    
    if not sender.get('tax_id'):
        html = html.replace('<p>Tax ID: {{sender.tax_id}}</p>', '')
    
    if not customer.get('city'):
        html = html.replace('<p>{{customer.city}}, {{customer.state}} {{customer.zip}}</p>', '')
    
    if tax_rate == 0:
        # Remove tax row if no tax
        html = html.replace(
            '<tr class="tax-row">\n                <td class="label">Tax ({{tax_rate | percentage}}):</td>\n                <td class="amount">{{currency_symbol}}{{tax_amount | number_format(2)}}</td>\n            </tr>',
            ''
        )
    
    if not data.get('payment_terms'):
        html = html.replace('<p class="payment-terms">Payment Terms: {{payment_terms}}</p>', '')
    
    if not data.get('notes'):
        html = html.replace('<p><strong>Notes:</strong> {{notes}}</p>', '')
    
    # Generate items table rows
    items = data.get('items', [])
    items_html = ''
    for item in items:
        name = item.get('name', '')
        description = item.get('description', '')
        quantity = item.get('quantity', 0)
        unit_price = float(item.get('unit_price', 0))
        total = float(item.get('total', 0))
        
        items_html += f'''            <tr>
                <td>{name}</td>
                <td>{description}</td>
                <td class="text-center">{quantity}</td>
                <td class="text-right">{currency_symbol}{number_format(unit_price)}</td>
                <td class="text-right">{currency_symbol}{number_format(total)}</td>
            </tr>
'''
    
    # Replace items loop placeholder
    html = html.replace(
        '            {% for item in items %}\n            <tr>\n                <td>{{item.name}}</td>\n                <td>{{item.description or \'\'}}</td>\n                <td class="text-center">{{item.quantity}}</td>\n                <td class="text-right">{{currency_symbol}}{{item.unit_price | number_format(2)}}</td>\n                <td class="text-right">{{currency_symbol}}{{item.total | number_format(2)}}</td>\n            </tr>\n            {% endfor %}',
        items_html.rstrip()
    )
    
    # Remove any remaining template syntax
    html = html.replace('{% if ', '<!-- ')
    html = html.replace('{% endif %}', ' -->')
    
    return html


def validate_invoice_data(data):
    """Validate invoice data structure."""
    required_fields = ['invoice_number', 'invoice_date', 'sender', 'customer', 'items']
    
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    
    if not isinstance(data['items'], list) or len(data['items']) == 0:
        raise ValueError("Items must be a non-empty list")
    
    for item in data['items']:
        if 'name' not in item or 'quantity' not in item or 'unit_price' not in item:
            raise ValueError("Each item must have name, quantity, and unit_price")
    
    return True


def calculate_totals(data):
    """Calculate subtotal, tax, and total."""
    items = data.get('items', [])
    subtotal = sum(float(item.get('total', item.get('quantity', 0) * item.get('unit_price', 0))) for item in items)
    
    tax_rate = float(data.get('tax_rate', 0))
    tax_amount = subtotal * tax_rate
    total = subtotal + tax_amount
    
    # Update data with calculated values
    data['subtotal'] = round(subtotal, 2)
    data['tax_amount'] = round(tax_amount, 2)
    data['total'] = round(total, 2)
    
    return data


def main(input_file=None, output_file=None, generate_pdf=False, **kwargs):
    """
    Generate an HTML invoice from JSON data.
    
    Args:
        input_file: Path to input JSON file with invoice data
        output_file: Path to output HTML file
        generate_pdf: If True, also generate PDF (requires weasyprint)
        **kwargs: Additional options (ignored)
    
    Returns:
        Dict with status and generated file paths
    """
    if not input_file or not output_file:
        return {
            "status": "error",
            "message": "input_file and output_file are required"
        }
    
    # Load JSON data
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        return {
            "status": "error",
            "message": f"Input file not found: {input_file}"
        }
    except json.JSONDecodeError as e:
        return {
            "status": "error",
            "message": f"Invalid JSON in input file: {e}"
        }
    
    # Validate data
    try:
        validate_invoice_data(data)
    except ValueError as e:
        return {
            "status": "error",
            "message": f"Invalid invoice data: {e}"
        }
    
    # Calculate totals if not provided
    if 'subtotal' not in data or 'total' not in data:
        data = calculate_totals(data)
    
    # Find template
    script_dir = Path(__file__).parent
    template_path = script_dir.parent / 'templates' / 'invoice-template.html'
    
    if not template_path.exists():
        return {
            "status": "error",
            "message": f"Template not found: {template_path}"
        }
    
    # Load and render template
    try:
        template = load_template(template_path)
        html = render_template(template, data)
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error rendering template: {e}"
        }
    
    # Write output
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        result = {
            "status": "success",
            "html_file": output_file,
            "invoice_number": data.get('invoice_number', ''),
            "total": data.get('total', 0)
        }
        
        if generate_pdf:
            try:
                import weasyprint
                pdf_path = output_file.replace('.html', '.pdf')
                weasyprint.HTML(string=html).write_pdf(pdf_path)
                result["pdf_file"] = pdf_path
            except ImportError:
                result["pdf_error"] = "PDF generation requires 'weasyprint'. Install with: pip install weasyprint"
            except Exception as e:
                result["pdf_error"] = f"PDF generation failed: {e}"
        
        return result
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error writing output file: {e}"
        }


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python generate_invoice.py <input.json> <output.html> [--pdf]")
        sys.exit(1)
    
    result = main(
        input_file=sys.argv[1],
        output_file=sys.argv[2],
        generate_pdf='--pdf' in sys.argv
    )
    
    if result["status"] == "error":
        print(f"Error: {result['message']}")
        sys.exit(1)
    
    print(f"✅ Invoice generated: {result['html_file']}")
    if "pdf_file" in result:
        print(f"✅ PDF generated: {result['pdf_file']}")
    if "pdf_error" in result:
        print(f"⚠️  {result['pdf_error']}")