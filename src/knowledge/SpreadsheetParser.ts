import * as XLSX from 'xlsx';
import { logger } from '../lib/logger';

export interface ParsedSpreadsheet {
  columns: Array<{ name: string; key: string; type: string }>;
  primaryKey: string;
  rowCount: number;
  previewRows: Array<Record<string, any>>;
  allRows: Array<Record<string, any>>;
}

export class SpreadsheetParser {
  /**
   * Normalizes a header string to a safe, clean snake_case property key.
   * e.g. "Order ID" -> "order_id", "Expected Delivery Date" -> "expected_delivery_date"
   */
  normalizeKey(header: string): string {
    return String(header || '')
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Detects the most probable primary identifier column in the dataset
   * (e.g. columns ending in _id, id, code, ref, number, or email).
   */
  detectPrimaryKey(columns: string[], rows: Array<Record<string, any>>): string {
    const idCandidates = columns.filter(col => {
      const lower = col.toLowerCase();
      return (
        lower === 'id' ||
        lower.endsWith('_id') ||
        lower.includes('order') ||
        lower.includes('ticket') ||
        lower.includes('invoice') ||
        lower.includes('code') ||
        lower.includes('reference') ||
        lower.includes('number') ||
        lower.includes('email')
      );
    });

    if (idCandidates.length > 0) {
      // Pick candidate with highest uniqueness
      for (const candidate of idCandidates) {
        const values = rows.map(r => r[candidate]).filter(Boolean);
        const uniqueValues = new Set(values);
        if (uniqueValues.size >= values.length * 0.8) {
          return candidate;
        }
      }
      return idCandidates[0];
    }

    return columns[0] || 'id';
  }

  /**
   * Infers primitive data type of a column based on sample row values.
   */
  inferType(values: any[]): string {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNull.length === 0) return 'string';

    const sample = nonNull.slice(0, 20);
    const isNum = sample.every(v => !isNaN(Number(v)));
    if (isNum) return 'number';

    const isDate = sample.every(v => {
      const str = String(v);
      return (
        str.includes('-') || str.includes('/') || !isNaN(Date.parse(str))
      ) && isNaN(Number(v));
    });
    if (isDate) return 'date';

    return 'string';
  }

  /**
   * Parses an XLSX, XLS, or CSV Buffer into structured, normalized rows.
   */
  parseBuffer(buffer: Buffer, filename: string): ParsedSpreadsheet {
    try {
      logger.info(`Parsing spreadsheet: ${filename} (${buffer.length} bytes)`);

      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Spreadsheet has no sheets');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        raw: false,
        defval: ''
      });

      if (!rawJson || rawJson.length === 0) {
        return {
          columns: [],
          primaryKey: 'id',
          rowCount: 0,
          previewRows: [],
          allRows: []
        };
      }

      // Map raw headers to normalized snake_case keys
      const rawHeaders = Object.keys(rawJson[0]);
      const headerMap: Record<string, string> = {};
      const normalizedColumns: string[] = [];

      for (const h of rawHeaders) {
        const key = this.normalizeKey(h) || `col_${normalizedColumns.length}`;
        headerMap[h] = key;
        normalizedColumns.push(key);
      }

      // Normalize all row objects
      const allRows = rawJson.map(row => {
        const cleanRow: Record<string, any> = {};
        for (const [rawH, val] of Object.entries(row)) {
          const key = headerMap[rawH];
          if (key) {
            cleanRow[key] = typeof val === 'string' ? val.trim() : val;
          }
        }
        return cleanRow;
      });

      // Detect primary key
      const primaryKey = this.detectPrimaryKey(normalizedColumns, allRows);

      // Build column definitions with inferred types
      const columns = rawHeaders.map(rawH => {
        const key = headerMap[rawH];
        const colValues = allRows.map(r => r[key]);
        const type = this.inferType(colValues);
        return {
          name: rawH,
          key,
          type
        };
      });

      logger.info(
        `Parsed ${allRows.length} rows and ${columns.length} columns from ${filename}. Primary key: ${primaryKey}`
      );

      return {
        columns,
        primaryKey,
        rowCount: allRows.length,
        previewRows: allRows.slice(0, 10),
        allRows
      };
    } catch (error) {
      logger.error(`Error parsing spreadsheet ${filename}: ${error}`);
      throw error;
    }
  }
}

export const spreadsheetParser = new SpreadsheetParser();
