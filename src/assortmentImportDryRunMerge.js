export const MANUAL_ASSORTMENT_IMPORT_MATCHES = Object.freeze({
  'Electrolux|Centurio IQ Inverter / Silver': 'split-centurio-iq-inverter',
  'Electrolux|Royal Flash Inverter / Silver': 'split-royal-flash-inverter',
  'Electrolux|Gladius Inverter / Grafit': 'split-gladius-inverter',
  'Electrolux|Centurio IQ 3.0 / Silver': 'split-centurio-iq-3-0',
  'Electrolux|Gladius 2.0 / Grafit': 'split-gladius-2-0',
  'Electrolux|Formax / Formax DL': 'split-formax',
  'Electrolux|Axiomatic / Axiomatic Slim': 'split-axiomatic',
  'Ballu|Cetrion Inox Inverter / Grafit': 'split-cetrion-inox-inverter',
  'Royal Thermo|Major Inverter / Major Inverter Grafit': 'split-major-inverter',
  'Royal Thermo|Smalto Inverter / Smalto Inverter Grafit': 'split-smalto-inverter',
  'Royal Thermo|Heatronic Slim Dryheat / Heatronic DL Slim Dryheat': 'split-heatronic-slim-dryheat',
});

const normalizeManualMatchPart = (value) => String(value || '').trim();

export const getManualAssortmentImportMatchKey = ({ brand, importSeries }) =>
  `${normalizeManualMatchPart(brand)}|${normalizeManualMatchPart(importSeries)}`;

export const getManualAssortmentImportMatchDocId = (importItem) =>
  MANUAL_ASSORTMENT_IMPORT_MATCHES[getManualAssortmentImportMatchKey(importItem)] || '';

export const findManualAssortmentImportMatch = (importItem, existingCards = []) => {
  const docId = getManualAssortmentImportMatchDocId(importItem);

  if (!docId) {
    return null;
  }

  const card = existingCards.find((item) => item?.id === docId);

  if (!card) {
    return null;
  }

  return {
    card,
    docId,
    score: 999,
    matchType: 'manual',
  };
};

const shouldPreserveExistingValue = (field, value) => field === 'dimensionsImagePath' && !value;

export const buildAssortmentImportMergePayload = (importPayload = {}, existingCard = {}) =>
  Object.fromEntries(
    Object.entries(importPayload).filter(([field, value]) => !shouldPreserveExistingValue(field, value) || !existingCard[field]),
  );
