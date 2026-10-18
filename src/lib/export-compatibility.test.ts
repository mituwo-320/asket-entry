/** @jest-environment node */
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

test('updated Excel export retains Japanese names, numbers and leading-zero phone text', () => {
  const rows = [{ チーム名: 'コートサイド', 保険料: 150, 電話番号: '09000000000' }];
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), '参加者');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const read = XLSX.read(bytes, { type: 'buffer' });
  expect(XLSX.utils.sheet_to_json(read.Sheets['参加者'])).toEqual(rows);
});
test('updated PDF library still creates a valid PDF document', () => {
  const pdf = new jsPDF(); pdf.text('VANKY CUP', 20, 20);
  expect(pdf.output().startsWith('%PDF-')).toBe(true);
});
