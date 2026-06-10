const CATEGORY_CONDITIONING = 'Кондиционирование';

const GROUPS = {
  inverterSplits: 'DC-инверторные сплит-системы',
  onOffSplits: 'Сплит-системы ON/OFF',
  householdMobiles: 'Бытовые мобильные кондиционеры',
  industrialMobiles: 'Промышленные мобильные кондиционеры',
};

const createProfile = ({ id, group, seriesName, code, aliases = [] }) => ({
  id,
  brand: 'Ballu',
  category: CATEGORY_CONDITIONING,
  group,
  seriesName,
  code,
  aliases,
  profileStatus: 'approved',
});

export const SERIES_PROFILES = [
  createProfile({
    id: 'ballu-2026-dc-boho-bsni',
    group: GROUPS.inverterSplits,
    seriesName: 'BOHO',
    code: 'BSNI',
    aliases: ['Бохо'],
  }),
  createProfile({
    id: 'ballu-2026-dc-ice-peak-bspki',
    group: GROUPS.inverterSplits,
    seriesName: 'ICE PEAK',
    code: 'BSPKI',
    aliases: ['IcePeak', 'ICEPEAK', 'Айс Пик'],
  }),
  createProfile({
    id: 'ballu-2026-dc-defender-bshi',
    group: GROUPS.inverterSplits,
    seriesName: 'DEFENDER',
    code: 'BSHI',
    aliases: ['Дефендер'],
  }),
  createProfile({
    id: 'ballu-2026-dc-platinum-black-bspi',
    group: GROUPS.inverterSplits,
    seriesName: 'PLATINUM BLACK',
    code: 'BSPI',
    aliases: ['PlatinumBlack', 'PLATINUMBLACK', 'Платинум Блэк'],
  }),
  createProfile({
    id: 'ballu-2026-dc-eco-smart-bsyi',
    group: GROUPS.inverterSplits,
    seriesName: 'ECO SMART',
    code: 'BSYI',
    aliases: ['EcoSmart', 'ECOSMART', 'Эко Смарт'],
  }),
  createProfile({
    id: 'ballu-2026-dc-odyssey-pro-bsoi',
    group: GROUPS.inverterSplits,
    seriesName: 'ODYSSEY PRO',
    code: 'BSOI',
    aliases: ['OdysseyPro', 'ODYSSEYPRO', 'Одиссей Про'],
  }),
  createProfile({
    id: 'ballu-2026-dc-tessey-bsti',
    group: GROUPS.inverterSplits,
    seriesName: 'TESSEY',
    code: 'BSTI',
    aliases: ['Тессей'],
  }),
  createProfile({
    id: 'ballu-2026-dc-lagoon-bsdi',
    group: GROUPS.inverterSplits,
    seriesName: 'LAGOON',
    code: 'BSDI',
    aliases: ['Лагун'],
  }),
  createProfile({
    id: 'ballu-2026-dc-discovery-bsvi',
    group: GROUPS.inverterSplits,
    seriesName: 'DISCOVERY',
    code: 'BSVI',
    aliases: ['Дискавери'],
  }),

  createProfile({
    id: 'ballu-2026-onoff-olympio-edge-bso',
    group: GROUPS.onOffSplits,
    seriesName: 'OLYMPIO EDGE',
    code: 'BSO',
    aliases: ['OlympioEdge', 'OLYMPIOEDGE', 'Олимпио Эдж'],
  }),
  createProfile({
    id: 'ballu-2026-onoff-olympio-pro-bso',
    group: GROUPS.onOffSplits,
    seriesName: 'OLYMPIO PRO',
    code: 'BSO',
    aliases: ['OlympioPro', 'OLYMPIOPRO', 'Олимпио Про'],
  }),
  createProfile({
    id: 'ballu-2026-onoff-olympio-legend-bsw',
    group: GROUPS.onOffSplits,
    seriesName: 'OLYMPIO LEGEND',
    code: 'BSW',
    aliases: ['OlympioLegend', 'OLYMPIOLEGEND', 'Олимпио Легенд'],
  }),
  createProfile({
    id: 'ballu-2026-onoff-tessey-bst',
    group: GROUPS.onOffSplits,
    seriesName: 'TESSEY',
    code: 'BST',
    aliases: ['Тессей'],
  }),
  createProfile({
    id: 'ballu-2026-onoff-lagoon-bsd',
    group: GROUPS.onOffSplits,
    seriesName: 'LAGOON',
    code: 'BSD',
    aliases: ['Лагун'],
  }),
  createProfile({
    id: 'ballu-2026-onoff-voyager-bsv',
    group: GROUPS.onOffSplits,
    seriesName: 'VOYAGER',
    code: 'BSV',
    aliases: ['Вояджер'],
  }),
  createProfile({
    id: 'ballu-2026-onoff-bravo-bsq',
    group: GROUPS.onOffSplits,
    seriesName: 'BRAVO',
    code: 'BSQ',
    aliases: ['Браво'],
  }),

  createProfile({
    id: 'ballu-2026-mobile-smart-inverter-bpac-in',
    group: GROUPS.householdMobiles,
    seriesName: 'Smart Inverter',
    code: 'BPAC-IN',
    aliases: ['SMART INVERTER', 'Смарт Инвертер'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-smart-inverter-evo-bpac-ie',
    group: GROUPS.householdMobiles,
    seriesName: 'Smart Inverter EVO',
    code: 'BPAC IE',
    aliases: ['SMART INVERTER EVO', 'BPAC-IE', 'Смарт Инвертер Эво'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-smart-pro-bpac-ce-20y',
    group: GROUPS.householdMobiles,
    seriesName: 'SMART PRO',
    code: 'BPAC-CE_20Y',
    aliases: ['Smart Pro', 'BPAC CE 20Y', 'BPAC-CE-20Y', 'Смарт Про'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-platinum-x4-bphs-hx',
    group: GROUPS.householdMobiles,
    seriesName: 'Platinum X4',
    code: 'BPHS-HX',
    aliases: ['PLATINUM X4', 'Платинум X4'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-velure-bpac-ew',
    group: GROUPS.householdMobiles,
    seriesName: 'Velure',
    code: 'BPAC-EW',
    aliases: ['VELURE', 'Велюр'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-twinkle-bpac-dwb-dwr',
    group: GROUPS.householdMobiles,
    seriesName: 'Twinkle',
    code: 'BPAC DWB / DWR',
    aliases: ['TWINKLE', 'BPAC-DWB', 'BPAC-DWR', 'BPAC DWB', 'BPAC DWR', 'Твинкл'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-eclipse-bpac-epb-epw',
    group: GROUPS.householdMobiles,
    seriesName: 'Eclipse',
    code: 'BPAC-EPB / EPW',
    aliases: ['ECLIPSE', 'BPAC-EPB', 'BPAC-EPW', 'BPAC EPB', 'BPAC EPW', 'Эклипс'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-aura-bpac-cp-24y',
    group: GROUPS.householdMobiles,
    seriesName: 'AURA',
    code: 'BPAC-CP_24Y',
    aliases: ['Aura', 'BPAC CP 24Y', 'BPAC-CP-24Y', 'Аура'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-orbis-bpac-or',
    group: GROUPS.householdMobiles,
    seriesName: 'Orbis',
    code: 'BPAC-OR',
    aliases: ['ORBIS', 'Орбис'],
  }),
  createProfile({
    id: 'ballu-2026-mobile-eco-cool-bpac-cc',
    group: GROUPS.householdMobiles,
    seriesName: 'ECO COOL',
    code: 'BPAC-CC',
    aliases: ['EcoCool', 'ECOCOOL', 'Эко Кул'],
  }),

  createProfile({
    id: 'ballu-2026-industrial-mobile-bgk5',
    group: GROUPS.industrialMobiles,
    seriesName: 'BGK5',
    code: 'BGK5',
  }),
  createProfile({
    id: 'ballu-2026-industrial-mobile-bgk9',
    group: GROUPS.industrialMobiles,
    seriesName: 'BGK9',
    code: 'BGK9',
  }),
  createProfile({
    id: 'ballu-2026-industrial-mobile-bgk8',
    group: GROUPS.industrialMobiles,
    seriesName: 'BGK8',
    code: 'BGK8',
  }),
  createProfile({
    id: 'ballu-2026-industrial-mobile-bgk15',
    group: GROUPS.industrialMobiles,
    seriesName: 'BGK15',
    code: 'BGK15',
  }),
  createProfile({
    id: 'ballu-2026-industrial-mobile-bgk25',
    group: GROUPS.industrialMobiles,
    seriesName: 'BGK25',
    code: 'BGK25',
  }),
];

const normalizeSeriesLookupText = (value = '') =>
  String(value)
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[\/]+/g, ' / ')
    .replace(/[_]+/g, '-')
    .replace(/[^0-9a-zа-я/]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeModelPrefix = (value = '') => normalizeSeriesLookupText(value).replace(/\s*\/\s*/g, ' / ');

const getCodePrefixes = (code = '') => {
  const normalizedCode = normalizeModelPrefix(code);
  const parts = normalizedCode.split(' / ').map((part) => part.trim()).filter(Boolean);

  if (parts.length <= 1) {
    return [normalizedCode].filter(Boolean);
  }

  const basePrefix = parts[0].split(' ')[0] || '';

  return parts
    .map((part, index) => (index === 0 || part.startsWith(basePrefix) ? part : `${basePrefix} ${part}`))
    .filter(Boolean);
};

const getProfileLookupValues = (profile) => [
  profile.id,
  profile.seriesName,
  profile.code,
  ...profile.aliases,
].filter(Boolean);

export const findSeriesProfile = (input = '') => {
  const normalizedInput = normalizeSeriesLookupText(input);

  if (!normalizedInput) {
    return null;
  }

  const exactMatch = SERIES_PROFILES.find((profile) =>
    getProfileLookupValues(profile).some((value) => normalizeSeriesLookupText(value) === normalizedInput),
  );

  if (exactMatch) {
    return exactMatch;
  }

  return SERIES_PROFILES.find((profile) =>
    getCodePrefixes(profile.code).some((prefix) => normalizedInput.startsWith(prefix)),
  ) || null;
};

export const getSeriesProfilesByGroup = (group) =>
  SERIES_PROFILES.filter((profile) => profile.group === group);
