import { normalizeSearchText } from './seriesPageClassifier.js';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSmartInverterCodePatterns = () => [
  /BPAC\s*-?\s*IN/iu,
  /BPAC\s*-?\s*12\s+IN\s*\/\s*N6/iu,
  /BPAC\s*-?\s*12\s+IN\s*\/?\s*N6/iu,
];

const getGenericCodePatterns = (code = '') => {
  const normalizedCode = String(code || '').trim();

  if (!normalizedCode) {
    return [];
  }

  const flexibleCode = escapeRegExp(normalizedCode).replace(/[\s\-_]+/gu, '[\\s\\-_]*');
  const modelCode = flexibleCode.length >= 3 ? `${flexibleCode}[\\s\\-_]*\\d{2,3}` : flexibleCode;

  return [
    new RegExp(`(^|[^0-9a-zа-яё])${flexibleCode}(?=$|[^0-9a-zа-яё])`, 'iu'),
    new RegExp(`(^|[^0-9a-zа-яё])${modelCode}(?=$|[^0-9a-zа-яё])`, 'iu'),
  ];
};

export const getSeriesCodeConfirmationPatterns = ({ seriesName = '', code = '' } = {}) => {
  const normalizedSeriesName = normalizeSearchText(seriesName);
  const normalizedCode = normalizeSearchText(code);

  if (normalizedSeriesName === 'smart inverter' && normalizedCode === 'bpac in') {
    return getSmartInverterCodePatterns();
  }

  return getGenericCodePatterns(code);
};

export const hasSeriesCodeConfirmation = (text = '', profile = {}) =>
  getSeriesCodeConfirmationPatterns(profile).some((pattern) => pattern.test(String(text || '')));

export const getSeriesForbiddenBlockPatterns = ({ seriesName = '', code = '' } = {}) => {
  const normalizedSeriesName = normalizeSearchText(seriesName);
  const normalizedCode = normalizeSearchText(code);

  if (normalizedSeriesName === 'smart inverter' && normalizedCode === 'bpac in') {
    return [
      /\bEVO\b/iu,
      /HEAVY\s+PRO/iu,
      /HEAVY\s+INDUSTRIAL/iu,
      /Промышленные\s+мобильные\s+кондиционеры/iu,
      /Промышленные\s+мобильные\s+осушители/iu,
      /\bBGK\s*(?:15|18|25|32)\b/iu,
      /\bBDI\s*-?\s*(?:70|100)L\b/iu,
      /\bBPAC\s*-?\s*(?:12|14)\s+IE\s*\/?\s*N6\b/iu,
    ];
  }

  return [];
};

const findFirstPatternIndex = (text = '', patterns = [], fromIndex = 0) => {
  const source = String(text || '').slice(fromIndex);
  const matches = patterns
    .map((pattern) => {
      const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
      const globalPattern = new RegExp(pattern.source, flags);
      const match = globalPattern.exec(source);

      return match ? fromIndex + match.index : -1;
    })
    .filter((index) => index >= 0);

  return matches.length > 0 ? Math.min(...matches) : -1;
};

const findLastPatternIndex = (text = '', patterns = [], toIndex = text.length) => {
  const source = String(text || '').slice(0, toIndex);
  let lastIndex = -1;

  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const globalPattern = new RegExp(pattern.source, flags);
    let match = globalPattern.exec(source);

    while (match) {
      lastIndex = Math.max(lastIndex, match.index);
      match = globalPattern.exec(source);
    }
  }

  return lastIndex;
};

const BLOCK_START_PATTERNS = [
  /(?:^|\n)\s*(?:Бытовые\s+сплит-системы|DC-?\s*инверторные\s+сплит-системы|Инверторные\s+сплит-системы|Кондиционирование)\b/giu,
  /(?:^|\n)\s*(?:BOHO|ICE\s+PEAK|DEFENDER|PLATINUM\s+BLACK|ECO\s+SMART|ODYSSEY\s+PRO|TESSEY|LAGOON|DISCOVERY)\s+(?:BSNI|BSPKI|BSHI|BSPI|BSYI|BSOI|BSTI|BSDI|BSVI|BST|BSD|BSV)\b/giu,
  /(?:^|\n)\s*Бытовые\s+мобильные\s+кондиционеры\b/giu,
  /(?:^|\n)\s*Промышленные\s+мобильные\s+кондиционеры\b/giu,
  /(?:^|\n)\s*Промышленные\s+мобильные\s+осушители\b/giu,
  /(?:^|\n)\s*(?:SMART\s+INVERTER|Smart\s+Inverter)\b/giu,
];

const NEXT_FOREIGN_PATTERNS = [
  /(?:^|\n)\s*(?:Бытовые\s+сплит-системы|DC-?\s*инверторные\s+сплит-системы|Инверторные\s+сплит-системы|Кондиционирование)\b/giu,
  /(?:^|\n)\s*(?:BOHO|ICE\s+PEAK|DEFENDER|PLATINUM\s+BLACK|ECO\s+SMART|ODYSSEY\s+PRO|TESSEY|LAGOON|DISCOVERY|OLYMPIO\s+\w+)\s+(?:BSNI|BSPKI|BSHI|BSPI|BSYI|BSOI|BSTI|BSDI|BSVI|BSO|BSW|BST|BSD|BSV|BSQ)\b/giu,
  /(?:^|\n)\s*Технические\s+характеристики\s+(?:BSNI|BSPKI|BSHI|BSPI|BSYI|BSOI|BSTI|BSDI|BSVI|BSO|BSW|BST|BSD|BSV|BSQ)\b/giu,
  /(?:^|\n)\s*Бытовые\s+мобильные\s+кондиционеры\b/giu,
  /(?:^|\n)\s*Промышленные\s+мобильные\s+кондиционеры\b/giu,
  /(?:^|\n)\s*Промышленные\s+мобильные\s+осушители\b/giu,
  /(?:^|\n)\s*Параметр\s*\/\s*Модель\b/giu,
  /\bINVERTER\s+EVO\b/giu,
  /\bHEAVY\s+(?:PRO|INDUSTRIAL)\b/giu,
  /\bBPAC\s*-?\s*(?:12|14)\s+IE\s*\/?\s*N6\b/giu,
  /\bBGK\s*(?:15|18|25|32)\b/giu,
  /\bBDI\s*-?\s*(?:70|100)L\b/giu,
];

const getFirstCodeIndex = (rawText = '', profile = {}) => findFirstPatternIndex(rawText, getSeriesCodeConfirmationPatterns(profile));

export const extractRelevantSeriesBlock = (rawText = '', profile = {}) => {
  const text = String(rawText || '');

  if (!text.trim()) {
    return '';
  }

  const codeIndex = getFirstCodeIndex(text, profile);

  if (codeIndex < 0) {
    return text;
  }

  const ownHeaderPatterns = [
    profile.seriesName && profile.code ? new RegExp(`(?:^|\\n)\\s*${escapeRegExp(profile.seriesName).replace(/\s+/gu, '\\s+')}\\s+${escapeRegExp(profile.code)}\\b`, 'giu') : null,
    profile.code ? new RegExp(`(?:^|\\n)\\s*(?:Технические\\s+характеристики|Параметр\\s*\\/\\s*Модель)[^\\n]{0,80}\\b${escapeRegExp(profile.code)}\\b`, 'giu') : null,
  ].filter(Boolean);
  const startHeaderIndex = findLastPatternIndex(text, [...BLOCK_START_PATTERNS, ...ownHeaderPatterns], Math.min(codeIndex + String(profile.code || '').length + 120, text.length));
  const windowStart = Math.max(codeIndex - 2000, 0);
  const lineStartBeforeCode = text.lastIndexOf('\n', codeIndex);
  const ownLineStart = lineStartBeforeCode >= 0 ? lineStartBeforeCode + 1 : 0;
  const isSplitCode = /^BS[A-Z]+$/iu.test(String(profile.code || '').trim());
  const start = isSplitCode ? ownLineStart : startHeaderIndex >= 0 ? startHeaderIndex : windowStart;
  const searchEndFrom = codeIndex + 1;
  const nextForeignIndex = findFirstPatternIndex(text, NEXT_FOREIGN_PATTERNS, searchEndFrom);
  const windowEnd = Math.min(codeIndex + 2500, text.length);
  const end = nextForeignIndex > codeIndex ? Math.min(nextForeignIndex, windowEnd) : windowEnd;

  return text.slice(start, Math.max(end, codeIndex)).trim() || text;
};
