import assert from 'node:assert/strict';
import {
  buildAssortmentImportMergePayload,
  findManualAssortmentImportMatch,
  getManualAssortmentImportMatchDocId,
  MANUAL_ASSORTMENT_IMPORT_MATCHES,
} from '../src/assortmentImportDryRunMerge.js';

const manualCases = [
  ['Electrolux', 'Centurio IQ Inverter / Silver', 'split-centurio-iq-inverter'],
  ['Electrolux', 'Royal Flash Inverter / Silver', 'split-royal-flash-inverter'],
  ['Electrolux', 'Gladius Inverter / Grafit', 'split-gladius-inverter'],
  ['Electrolux', 'Centurio IQ 3.0 / Silver', 'split-centurio-iq-3-0'],
  ['Electrolux', 'Gladius 2.0 / Grafit', 'split-gladius-2-0'],
  ['Electrolux', 'Formax / Formax DL', 'split-formax'],
  ['Electrolux', 'Axiomatic / Axiomatic Slim', 'split-axiomatic'],
  ['Ballu', 'Cetrion Inox Inverter / Grafit', 'split-cetrion-inox-inverter'],
  ['Royal Thermo', 'Major Inverter / Major Inverter Grafit', 'split-major-inverter'],
  ['Royal Thermo', 'Smalto Inverter / Smalto Inverter Grafit', 'split-smalto-inverter'],
  ['Royal Thermo', 'Heatronic Slim Dryheat / Heatronic DL Slim Dryheat', 'split-heatronic-slim-dryheat'],
];

assert.equal(Object.keys(MANUAL_ASSORTMENT_IMPORT_MATCHES).length, manualCases.length);

for (const [brand, importSeries, expectedDocId] of manualCases) {
  assert.equal(getManualAssortmentImportMatchDocId({ brand, importSeries }), expectedDocId);

  const match = findManualAssortmentImportMatch({ brand, importSeries }, [{ id: expectedDocId, seriesName: importSeries }]);

  assert.deepEqual(match, {
    card: { id: expectedDocId, seriesName: importSeries },
    docId: expectedDocId,
    score: 999,
    matchType: 'manual',
  });
}

assert.equal(
  findManualAssortmentImportMatch(
    { brand: 'Electrolux', importSeries: 'Centurio IQ Inverter / Silver' },
    [{ id: 'another-doc' }],
  ),
  null,
);

assert.deepEqual(
  buildAssortmentImportMergePayload(
    { seriesName: 'Centurio IQ Inverter', dimensionsImagePath: '' },
    { dimensionsImagePath: '/existing/dimensions.png' },
  ),
  { seriesName: 'Centurio IQ Inverter' },
);

assert.deepEqual(
  buildAssortmentImportMergePayload(
    { seriesName: 'Centurio IQ Inverter', dimensionsImagePath: '/new/dimensions.png' },
    { dimensionsImagePath: '/existing/dimensions.png' },
  ),
  { seriesName: 'Centurio IQ Inverter', dimensionsImagePath: '/new/dimensions.png' },
);

console.log('assortment import dry-run/merge tests passed');
