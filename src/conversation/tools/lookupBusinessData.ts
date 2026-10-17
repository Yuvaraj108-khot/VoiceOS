import { businessDataProvider, BusinessDataQueryResult } from '../../knowledge/providers/BusinessDataProvider';
import { logger } from '../../lib/logger';

export const lookupBusinessDataTool = {
  type: 'function',
  function: {
    name: 'lookupBusinessData',
    description:
      'Search and retrieve exact live structured business records (orders, customers, tracking numbers, invoices, inventory, pricing) from the company spreadsheets. Always use this tool when the customer mentions specific IDs, order numbers, or asks about their account or order status. NEVER invent or guess order/customer data.',
    parameters: {
      type: 'object',
      properties: {
        identifier: {
          type: 'string',
          description:
            'The exact ID, order number, reference code, customer email, or tracking number mentioned by the caller (e.g. "ORD1002", "INV-891", "yuvaraj@example.com").'
        },
        filterField: {
          type: 'string',
          description: 'Optional column name to filter on, such as "order_id", "customer", "status".'
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific fields to return, e.g. ["status", "expected_delivery", "product"].'
        }
      },
      required: ['identifier']
    }
  }
};

export async function executeLookupBusinessData(
  organizationId: string,
  args: { identifier: string; filterField?: string; fields?: string[] }
): Promise<string> {
  const { identifier, filterField, fields } = args;

  if (!organizationId) {
    logger.warn('[lookupBusinessData] Missing organizationId in lookup');
    return JSON.stringify({
      found: false,
      error: 'Missing organization context for data lookup.'
    });
  }

  logger.info(
    `[lookupBusinessData] Executing lookup for org=${organizationId}, identifier="${identifier}"`
  );

  const filters = filterField ? { [filterField]: identifier } : undefined;

  const result: BusinessDataQueryResult = await businessDataProvider.query({
    organizationId,
    identifier,
    filters,
    fields,
    limit: 3
  });

  if (!result.found || result.records.length === 0) {
    return JSON.stringify({
      found: false,
      searchedIdentifier: identifier,
      message: `No record found in company data matching "${identifier}".`,
      directive:
        "Inform the caller warmly that no active record was found matching that detail. Reassure them and offer alternative ways to look it up (e.g., registered phone number, email, or full name), or offer to assist with other plans and services."
    });
  }

  // Merge attributes across matching document rows to provide the richest record
  const rawMerged = result.records.reduce((acc, curr) => ({ ...curr, ...acc }), {});
  const cleanRecord: Record<string, any> = {};

  for (const [k, v] of Object.entries(rawMerged)) {
    if (typeof v === 'string') {
      cleanRecord[k] = v.replace(/â‚¹|â¹/g, '₹');
    } else {
      cleanRecord[k] = v;
    }
  }

  return JSON.stringify({
    found: true,
    searchedIdentifier: identifier,
    source: result.source?.name,
    record: cleanRecord,
    directive:
      "Use the exact information above to answer the caller's question concisely (1-2 sentences). Do not mention JSON, databases, or spreadsheet columns."
  });
}
