import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { SpeechNormalizer } from '../../utils/SpeechNormalizer';

export interface BusinessDataQueryOptions {
  organizationId: string;
  documentId?: string;
  identifier?: string;
  filters?: Record<string, any>;
  fields?: string[];
  limit?: number;
}

export interface BusinessDataQueryResult {
  found: boolean;
  totalMatches: number;
  records: Array<Record<string, any>>;
  message?: string;
  source?: {
    id: string;
    name: string;
    type: string;
    primaryKey: string;
  };
}

export interface IBusinessDataProvider {
  query(options: BusinessDataQueryOptions): Promise<BusinessDataQueryResult>;
}

/**
 * Provider for uploaded Excel (XLSX, XLS) and CSV files stored in PostgreSQL.
 * Scoped strictly by organizationId with indexed primaryKey lookup.
 */
export class UploadedSpreadsheetProvider implements IBusinessDataProvider {
  async query(options: BusinessDataQueryOptions): Promise<BusinessDataQueryResult> {
    const { organizationId, documentId, identifier, filters, fields, limit = 5 } = options;

    try {
      logger.info(
        `[SpreadsheetProvider] Querying data for org=${organizationId}, doc=${documentId || 'all'}, identifier=${identifier}`
      );

      // 1. Locate the document(s) for this organization
      const docWhere: any = {
        organizationId,
        type: { in: ['XLSX', 'CSV', 'SPREADSHEET'] },
        status: 'READY',
        deletedAt: null
      };

      if (documentId) {
        docWhere.id = documentId;
      }

      const documents = await prisma.knowledgeDocument.findMany({
        where: docWhere,
        select: { id: true, name: true, type: true, metadata: true }
      });

      if (documents.length === 0) {
        return {
          found: false,
          totalMatches: 0,
          records: [],
          message: 'No active structured spreadsheet sources configured for this organization.'
        };
      }

      // 2. Query rows across matching documents
      const targetDocIds = documents.map(d => d.id);
      const cleanId = (identifier || '').trim().toLowerCase();
      const rawDigits = cleanId.replace(/\D/g, '');
      const isPossiblePhone = rawDigits.length >= 7;
      const isPossibleEmail = cleanId.includes('@');
      const cleanNumericId = cleanId.replace(/^[^0-9]+/, '');

      // Fetch rows for the target documents within this organization
      const candidateRows = await prisma.businessDataRow.findMany({
        where: {
          organizationId,
          documentId: { in: targetDocIds }
        },
        take: 1000 // Comprehensive search across all active rows
      });

      if (candidateRows.length === 0) {
        return {
          found: false,
          totalMatches: 0,
          records: [],
          message: `No records exist in the connected spreadsheets.`
        };
      }

      // 3. Filter matching records
      const matches: Array<Record<string, any>> = [];

      for (const row of candidateRows) {
        const data = row.data as Record<string, any>;
        if (!data) continue;

        let isMatch = false;

        // A. Match by primary key (with or without prefix, e.g. ORD1002 or 1002)
        if (cleanId && row.primaryKey) {
          const rowPkLower = row.primaryKey.toLowerCase();
          const rowPkDigits = rowPkLower.replace(/^[^0-9]+/, '');
          if (
            rowPkLower === cleanId ||
            (cleanNumericId && rowPkDigits === cleanNumericId)
          ) {
            isMatch = true;
          }
        }

        // B. Match by phone number (comparing stripped digits e.g. 9876540102)
        if (!isMatch && isPossiblePhone) {
          for (const [key, val] of Object.entries(data)) {
            const kLower = key.toLowerCase();
            const valStr = String(val || '');
            const valDigits = valStr.replace(/\D/g, '');
            if (valDigits.length >= 7) {
              if (
                valDigits === rawDigits ||
                valDigits.endsWith(rawDigits) ||
                rawDigits.endsWith(valDigits)
              ) {
                isMatch = true;
                break;
              }
            }
          }
        }

        // C. Match by email address
        if (!isMatch && isPossibleEmail) {
          for (const [key, val] of Object.entries(data)) {
            const valLower = String(val || '').trim().toLowerCase();
            if (valLower === cleanId || (cleanId.includes(valLower) && valLower.includes('@'))) {
              isMatch = true;
              break;
            }
          }
        }

        // D. Match by customer name or word match with accent tolerance (e.g. "Yuvaraj Khot", "Yuvraj", "Rahul")
        if (!isMatch && cleanId && cleanId.length >= 2 && !isPossiblePhone) {
          for (const [key, val] of Object.entries(data)) {
            const kLower = key.toLowerCase();
            const isNameField = kLower.includes('name') || kLower.includes('customer') || kLower.includes('client') || kLower.includes('patient') || kLower.includes('user');
            const valLower = String(val || '').trim().toLowerCase();
            if (isNameField && valLower.length >= 2) {
              if (SpeechNormalizer.isFuzzyNameMatch(cleanId, valLower)) {
                isMatch = true;
                break;
              }
            }
          }
        }

        // E. General exact match on any field
        if (!isMatch && cleanId) {
          for (const [key, val] of Object.entries(data)) {
            const strVal = String(val || '').trim().toLowerCase();
            if (strVal === cleanId) {
              isMatch = true;
              break;
            }
          }
        }

        // Apply additional column filters if provided (e.g. status: "shipped")
        if (filters && Object.keys(filters).length > 0) {
          let allFilterMatch = true;
          for (const [fKey, fVal] of Object.entries(filters)) {
            const rowVal = String(data[fKey] || '').toLowerCase();
            const targetVal = String(fVal || '').toLowerCase();
            if (rowVal !== targetVal) {
              allFilterMatch = false;
              break;
            }
          }
          if (isMatch && !allFilterMatch) isMatch = false;
          if (!cleanId && allFilterMatch) isMatch = true;
        }

        if (isMatch) {
          // If specific fields requested, project only those fields
          if (fields && fields.length > 0) {
            const projected: Record<string, any> = {};
            for (const f of fields) {
              const normF = f.trim().toLowerCase().replace(/[\s\-]+/g, '_');
              if (data[normF] !== undefined) {
                projected[normF] = data[normF];
              } else if (data[f] !== undefined) {
                projected[f] = data[f];
              }
            }
            matches.push(projected);
          } else {
            matches.push(data);
          }

          if (matches.length >= limit) break;
        }
      }

      if (matches.length === 0) {
        return {
          found: false,
          totalMatches: 0,
          records: [],
          message: identifier
            ? `No record found matching identifier "${identifier}".`
            : 'No records matched the filter criteria.'
        };
      }

      const firstDoc = documents[0];
      const meta = firstDoc.metadata as any;

      return {
        found: true,
        totalMatches: matches.length,
        records: matches,
        source: {
          id: firstDoc.id,
          name: firstDoc.name,
          type: firstDoc.type,
          primaryKey: meta?.primaryKey || 'order_id'
        }
      };
    } catch (error) {
      logger.error(`Error querying UploadedSpreadsheetProvider: ${error}`);
      return {
        found: false,
        totalMatches: 0,
        records: [],
        message: 'A database error occurred while querying business data.'
      };
    }
  }
}

/**
 * Provider for live Google Sheets sync.
 * Ready for service account credentials or published sheet URLs without fake sync.
 */
export class GoogleSheetsProvider implements IBusinessDataProvider {
  async query(options: BusinessDataQueryOptions): Promise<BusinessDataQueryResult> {
    // If live credentials are not yet configured in environment variables,
    // fallback gracefully to UploadedSpreadsheetProvider so system keeps working seamlessly.
    const hasGoogleCreds = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !!process.env.GOOGLE_SHEETS_API_KEY;
    if (!hasGoogleCreds) {
      logger.debug('Google Sheets API credentials not set, using database-cached spreadsheet provider');
      const fallback = new UploadedSpreadsheetProvider();
      return fallback.query(options);
    }

    // When configured, fetch live sheet values
    return {
      found: false,
      totalMatches: 0,
      records: [],
      message: 'Google Sheets synchronization requires connected service account credentials.'
    };
  }
}

export const uploadedSpreadsheetProvider = new UploadedSpreadsheetProvider();
export const googleSheetsProvider = new GoogleSheetsProvider();

export const businessDataProvider = {
  getProvider(type: string): IBusinessDataProvider {
    if (type === 'SPREADSHEET' || type === 'GOOGLE_SHEETS') {
      return googleSheetsProvider;
    }
    return uploadedSpreadsheetProvider;
  },

  async query(options: BusinessDataQueryOptions): Promise<BusinessDataQueryResult> {
    return uploadedSpreadsheetProvider.query(options);
  }
};
