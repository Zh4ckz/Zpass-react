import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maskEmail} from '../public/js/account-privacy.mjs';
test('keeps first/last local letters and the domain', () => {
  assert.equal(maskEmail('tomsyex@example.com'), 't*****x@example.com');
  assert.equal(maskEmail(' alice@example.com '), 'a***e@example.com');
});
test('short addresses still mask; invalid values do not disclose input', () => {
  assert.equal(maskEmail('a@example.com'), 'a*@example.com');
  assert.equal(maskEmail('ab@example.com'), 'a*b@example.com');
  for (const value of ['', null, 'not-an-email', '@example.com', 'a@', 'a@b@c', 'a b@example.com']) assert.equal(maskEmail(value), '—');
});
