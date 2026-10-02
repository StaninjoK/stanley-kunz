import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../../scripts/content/privacy-scan.mjs';

const rules = (text, deny = []) => scanText(text, 't', deny).map((f) => f.rule);

test('blocks contact data, keys and IDs', () => {
  assert.ok(rules('Schreib an max.mustermann@gmail.com').includes('email'));
  assert.ok(rules('Ruf an: +598 92 123 456').includes('phone-international'));
  assert.ok(rules('Handy 099 123 456').includes('phone-uruguay-mobile'));
  assert.ok(rules('Tel. 0621 1234567').includes('phone-germany'));
  assert.ok(rules('key=ghp_abcdefghijklmnopqrstuvwxyz0123456789').includes('api-key'));
  assert.ok(rules('IBAN DE89 3704 0044 0532 0130 00').includes('iban'));
  assert.ok(rules('RUT 220451740014').includes('tax-or-id-number'));
  assert.ok(rules('-34.12345, -56.78901').includes('gps'));
});

test('allows the published contact address and ordinary numbers', () => {
  assert.deepEqual(rules('E-Mail: stan@kunzglobal.com'), []);
  assert.deepEqual(rules('Ein Kalb hat 280 Dollar gekostet, 2022 mit 19 Jahren, 100.000 Dollar.'), []);
  assert.deepEqual(rules('Um 12:30 Uhr, Kapitel 4:32'), []);
});

test('flags plates and addresses for review, denylisted names as blocking', () => {
  assert.ok(rules('Kennzeichen SAB 1234').includes('number-plate'));
  assert.ok(rules('Wir wohnen Calle Rivera 1234').includes('street-address'));
  assert.ok(rules('Der Lieferant Beispielfirma liefert', ['Beispielfirma']).includes('denylist'));
});
