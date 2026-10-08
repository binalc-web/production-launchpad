// Run: node src/app/lib/csv.check.ts
import assert from 'node:assert/strict';
import { toCsv } from './csv.ts';

assert.equal(toCsv([]), '');
assert.equal(
  toCsv([{ Name: 'Smith & Associates, LLC', Note: 'say "hi"', Formula: '=SUM(A1)', N: 3, Empty: undefined }]),
  'Name,Note,Formula,N,Empty\r\n"Smith & Associates, LLC","say ""hi""",\'=SUM(A1),3,',
);
console.log('csv ok');
