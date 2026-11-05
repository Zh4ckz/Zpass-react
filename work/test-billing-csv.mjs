import assert from 'node:assert/strict';
import {invoiceCsv} from '../public/resources/js/billing-api.mjs';
const text=invoiceCsv([{number:' =HYPERLINK("bad")',created:1,currency:'usd',subtotal:499,paid:549,status:'paid'}]);
assert(text.includes("' =HYPERLINK"));assert(text.includes('4.99'));assert(text.includes('5.49'));assert(text.includes('1970-01-01'));assert(text.startsWith('\uFEFF'));console.log('PASS: invoice CSV escapes formula injection, preserves currency amounts and UTC dates.');
