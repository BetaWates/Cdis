import * as XLSX from 'xlsx';
import { Specification } from '../types';

/**
 * Parse an Excel file using SheetJS (xlsx) into Specification[].
 *
 * Expected column headers (case-insensitive, flexible matching):
 *   - Parameter / Parameter Name / Inspection Parameter
 *   - Standard Value / Standard / Nominal / Value
 *   - Tolerance / Tol / Allowance
 *   - Unit / Units / Satuan
 *
 * Run `npm install xlsx` in FrontEnd/ before using this.
 */
export async function parseExcelFile(file: File): Promise<Specification[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) return [];

  const colMap = buildColumnMap(Object.keys(rows[0]));

  return rows
    .filter((row) => String(getCol(row, colMap.parameter) ?? '').trim() !== '')
    .map((row, index) => ({
      id: `parsed-${Date.now()}-${index}`,
      parameterName: String(getCol(row, colMap.parameter) ?? '').trim(),
      standardValue: String(getCol(row, colMap.standardValue) ?? '').trim(),
      tolerance: String(getCol(row, colMap.tolerance) ?? '').trim(),
      unit: String(getCol(row, colMap.unit) ?? '').trim(),
    }));
}

function buildColumnMap(keys: string[]) {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const m = keys.find((k) => norm(k) === norm(c));
      if (m) return m;
    }
    for (const c of candidates) {
      const m = keys.find((k) => norm(k).includes(norm(c)));
      if (m) return m;
    }
    return '';
  };
  return {
    parameter: find('parameter name', 'parametername', 'parameter', 'inspection parameter', 'param'),
    standardValue: find('standard value', 'standardvalue', 'standard', 'nominal', 'value', 'spec'),
    tolerance: find('tolerance', 'tol', 'allowance'),
    unit: find('unit', 'units', 'satuan'),
  };
}

function getCol(row: Record<string, unknown>, key: string): unknown {
  return key ? (row[key] ?? '') : '';
}
