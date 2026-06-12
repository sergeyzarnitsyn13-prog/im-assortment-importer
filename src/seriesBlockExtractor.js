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

  return [new RegExp(escapeRegExp(normalizedCode).replace(/[\s\-_]+/gu, '[\\s\\-_]*'), 'iu')];
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
  /(?:^|\n)\s*Бытовые\s+мобильные\s+кондиционеры\b/giu,
  /(?:^|\n)\s*Промышленные\s+мобильные\s+кондиционеры\b/giu,
  /(?:^|\n)\s*Промышленные\s+мобильные\s+осушители\b/giu,
  /(?:^|\n)\s*(?:SMART\s+INVERTER|Smart\s+Inverter)\b/giu,
];

const NEXT_FOREIGN_PATTERNS = [
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

  const startHeaderIndex = findLastPatternIndex(text, BLOCK_START_PATTERNS, codeIndex);
  const windowStart = Math.max(codeIndex - 2000, 0);
  const start = startHeaderIndex >= 0 ? startHeaderIndex : windowStart;
  const searchEndFrom = codeIndex + 1;
  const nextForeignIndex = findFirstPatternIndex(text, NEXT_FOREIGN_PATTERNS, searchEndFrom);
  const windowEnd = Math.min(codeIndex + 2500, text.length);
  const end = nextForeignIndex > codeIndex ? Math.min(nextForeignIndex, windowEnd) : windowEnd;

  return text.slice(start, Math.max(end, codeIndex)).trim() || text;
};
