import { SERIES_PROFILES } from './data/seriesProfiles.js';

export const normalizeSearchText = (value = '') =>
  String(value)
    .toLocaleLowerCase('ru-RU')
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[\-/\\_‐‑‒–—−]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const compactSearchText = (value = '') => normalizeSearchText(value).replace(/\s+/g, '');

export const getSearchTextForms = (value = '') => {
  const normalized = normalizeSearchText(value);

  return {
    normalized,
    compact: normalized.replace(/\s+/g, ''),
  };
};

const unique = (items) => [...new Set(items)];

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getNormalizedBoundaryPattern = (normalizedPhrase = '') =>
  new RegExp(`(^|[^0-9a-zа-яе])${escapeRegExp(normalizedPhrase)}([^0-9a-zа-яе]|$)`, 'iu');

const hasNormalizedPhrase = (normalizedText = '', normalizedPhrase = '') =>
  Boolean(normalizedPhrase) && getNormalizedBoundaryPattern(normalizedPhrase).test(normalizedText);

const includesNormalizedPhrase = (text = '', phrase = '') =>
  hasNormalizedPhrase(normalizeSearchText(text), normalizeSearchText(phrase));

const getCodeSuffixTokens = (code = '') => ['in', 'out'].flatMap((suffix) => [
  { value: `${code}/${suffix}`, kind: 'modelPrefix' },
  { value: `${code} ${suffix}`, kind: 'modelPrefix' },
  { value: `${code}-${suffix}`, kind: 'modelPrefix' },
  { value: `${code}_${suffix}`, kind: 'modelPrefix' },
]);

const getCodeConfirmationTokens = (profile) => {
  const normalizedSeriesName = normalizeSearchText(profile?.seriesName || '');
  const normalizedCode = normalizeSearchText(profile?.code || '');

  if (normalizedSeriesName === 'smart inverter' && normalizedCode === 'bpac in') {
    return [
      { value: 'BPAC-12 IN / N6', kind: 'modelPrefix' },
      { value: 'BPAC-12 IN/N6', kind: 'modelPrefix' },
      { value: 'BPAC 12 IN / N6', kind: 'modelPrefix' },
    ];
  }

  return [];
};

const buildSearchTokens = (profile) => {
  if (!profile) {
    return [];
  }

  const baseTokens = [
    { value: profile.seriesName, kind: 'seriesName' },
    { value: profile.code, kind: 'code' },
    ...(profile.aliases || []).map((alias) => ({ value: alias, kind: 'alias' })),
    { value: compactSearchText(profile.seriesName), kind: 'compactSeriesName' },
    { value: compactSearchText(profile.code), kind: 'compactCode' },
  ];
  const prefixTokens = [...getCodeSuffixTokens(profile.code), ...getCodeConfirmationTokens(profile)];
  const seen = new Set();

  return [...baseTokens, ...prefixTokens]
    .filter(({ value }) => Boolean(String(value || '').trim()))
    .map((token) => {
      const forms = getSearchTextForms(token.value);

      return {
        ...token,
        normalized: forms.normalized,
        compact: forms.compact,
        label: String(token.value).trim(),
      };
    })
    .filter((token) => {
      const key = `${token.kind}:${token.normalized}:${token.compact}`;

      if (!token.normalized && !token.compact) {
        return false;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const isServicePage = (page) => {
  const text = normalizeSearchText(page?.text || '');

  return (
    text.includes('hommyn') ||
    text.includes('алиса') ||
    text.includes('маруся') ||
    text.includes('сбер') ||
    text.includes('совместим') ||
    text.includes('соединительный кабель') ||
    text.includes('usb')
  );
};

const tokenMatchesPage = ({ normalizedText, compactText }, token) => {
  if (!token?.normalized && !token?.compact) {
    return false;
  }

  if (token.normalized && hasNormalizedPhrase(normalizedText, token.normalized)) {
    return true;
  }

  return Boolean(token.compact && token.compact.length >= 4 && compactText.includes(token.compact));
};

export const getProfileSearchTokens = (profile) => buildSearchTokens(profile);

const getDiagnosticTokenLabels = (matchedTokenObjects = []) => {
  const hasSeriesName = matchedTokenObjects.some((token) => token.kind === 'seriesName');
  const hasCode = matchedTokenObjects.some((token) => token.kind === 'code');
  const seriesNameCompact = matchedTokenObjects.find((token) => token.kind === 'seriesName')?.compact;

  return unique(
    matchedTokenObjects
      .filter((token) => {
        if (token.kind === 'compactCode' && hasCode) {
          return false;
        }

        if (token.kind === 'compactSeriesName' && hasSeriesName) {
          return false;
        }

        if (token.kind === 'alias' && hasSeriesName && token.compact === seriesNameCompact) {
          return false;
        }

        return true;
      })
      .map((token) => token.label),
  );
};

export const getMatchedTokens = (text = '', profile) => {
  const forms = getSearchTextForms(text);
  const pageForms = { normalizedText: forms.normalized, compactText: forms.compact };
  const matchedTokenObjects = getProfileSearchTokens(profile)
    .filter((token) => tokenMatchesPage(pageForms, token));

  return getDiagnosticTokenLabels(matchedTokenObjects);
};

const getMatchedTokenObjects = (text = '', profile) => {
  const forms = getSearchTextForms(text);
  const pageForms = { normalizedText: forms.normalized, compactText: forms.compact };

  return getProfileSearchTokens(profile).filter((token) => tokenMatchesPage(pageForms, token));
};

export const hasProfileCodeMatch = (text = '', profile) =>
  getMatchedTokenObjects(text, profile).some((token) => ['code', 'compactCode', 'modelPrefix'].includes(token.kind));

export const getOtherSeriesMatches = (text = '', selectedProfile, allProfiles = SERIES_PROFILES) =>
  allProfiles
    .filter((profile) => profile.id !== selectedProfile?.id)
    .map((profile) => ({
      profile,
      matchedTokens: getMatchedTokens(text, profile),
      hasCode: hasProfileCodeMatch(text, profile),
    }))
    .filter((match) => match.matchedTokens.length > 0);

const hasTechnicalMarker = (text = '') =>
  includesNormalizedPhrase(text, 'Технические характеристики') || includesNormalizedPhrase(text, 'Параметр / Модель');

const profileRequiresCodeConfirmation = (profile, allProfiles = SERIES_PROFILES) => {
  const selectedName = normalizeSearchText(profile?.seriesName || '');

  if (!selectedName) {
    return false;
  }

  return allProfiles.some((otherProfile) => {
    if (otherProfile.id === profile?.id) {
      return false;
    }

    const otherName = normalizeSearchText(otherProfile.seriesName || '');
    return otherName !== selectedName && otherName.includes(selectedName);
  });
};

const hasForbiddenSmartInverterText = (text = '', profile = {}) => {
  if (normalizeSearchText(profile.seriesName) !== 'smart inverter' || normalizeSearchText(profile.code) !== 'bpac in') {
    return false;
  }

  return /\bEVO\b|HEAVY\s+PRO|HEAVY\s+INDUSTRIAL|Промышленные\s+мобильные\s+(?:кондиционеры|осушители)|\bBGK\s*(?:15|18|25|32)\b|\bBDI\s*-?\s*(?:70|100)L\b|\bBPAC\s*-?\s*(?:12|14)\s+IE\s*\/?\s*N6\b/iu.test(text);
};

const getTechnicalPageReasons = ({ matchedTokenObjects = [], hasTechnicalTableMarker = false }) => {
  const reasons = [];
  const modelPrefixes = unique(
    matchedTokenObjects
      .filter((token) => token.kind === 'modelPrefix')
      .map((token) => token.label),
  );

  if (hasTechnicalTableMarker) {
    reasons.push('technicalTable: Параметр / Модель или Технические характеристики');
  }

  if (modelPrefixes.length > 0) {
    reasons.push(`modelPrefix: ${modelPrefixes.join(', ')}`);
  }

  return reasons;
};

const PAGE_CLASSES = {
  exactSeriesPage: 'exactSeriesPage',
  servicePage: 'servicePage',
  summaryPage: 'summaryPage',
  otherSeriesPage: 'otherSeriesPage',
  categoryPage: 'categoryPage',
};

const PAGE_CLASS_LABELS = {
  [PAGE_CLASSES.exactSeriesPage]: 'точная страница серии',
  [PAGE_CLASSES.servicePage]: 'servicePage: HOMMYN/совместимость',
  [PAGE_CLASSES.summaryPage]: 'summaryPage: сводная страница нескольких серий',
  [PAGE_CLASSES.otherSeriesPage]: 'otherSeriesPage: другая серия',
  [PAGE_CLASSES.categoryPage]: 'categoryPage: общая страница категории',
};

function scoreSeriesPage(page, profile, allProfiles = []) {
  const text = page?.text || '';
  const selectedTokens = getMatchedTokenObjects(text, profile);
  const otherSeriesMatches = getOtherSeriesMatches(text, profile, allProfiles);

  let score = 0;

  for (const token of selectedTokens) {
    if (token.kind === 'seriesName' || token.kind === 'compactSeriesName') score += 10;
    else if (token.kind === 'code' || token.kind === 'compactCode' || token.kind === 'modelPrefix') score += 8;
    else score += 4;
  }

  if (hasTechnicalMarker(text)) score += 3;

  if (otherSeriesMatches.length >= 4) score -= 10;

  if (isServicePage(page)) {
    score -= 8;
  }

  return score;
}

const getPageClass = ({ text, profile, allProfiles, matchedTokens, matchedOtherSeries, hasSelectedCode, isHommynPage, hasTechnicalTableMarker, reasonTechnicalPage }) => {
  const hasSelectedSeries = matchedTokens.length > 0;
  const hasManyOtherSeries = matchedOtherSeries.length >= 4;
  const requiresCodeConfirmation = profileRequiresCodeConfirmation(profile, allProfiles);

  if (hasSelectedSeries && requiresCodeConfirmation && !hasSelectedCode) {
    return hasForbiddenSmartInverterText(text, profile) || matchedOtherSeries.length > 0
      ? PAGE_CLASSES.otherSeriesPage
      : PAGE_CLASSES.categoryPage;
  }

  if (hasSelectedSeries && hasForbiddenSmartInverterText(text, profile) && !hasSelectedCode) {
    return PAGE_CLASSES.otherSeriesPage;
  }

  if (hasSelectedSeries && reasonTechnicalPage.length > 0) {
    return PAGE_CLASSES.exactSeriesPage;
  }

  if (hasSelectedSeries && hasManyOtherSeries) {
    return PAGE_CLASSES.summaryPage;
  }

  if (isHommynPage) {
    return PAGE_CLASSES.servicePage;
  }

  if (hasSelectedSeries && (!hasManyOtherSeries || hasSelectedCode || hasTechnicalTableMarker)) {
    return PAGE_CLASSES.exactSeriesPage;
  }

  if (matchedOtherSeries.length > 0) {
    return PAGE_CLASSES.otherSeriesPage;
  }

  return PAGE_CLASSES.categoryPage;
};

const buildExcludeReason = ({ profile, pageClass, matchedOtherSeries }) => {
  if (pageClass === PAGE_CLASSES.servicePage) {
    return 'servicePage: страница HOMMYN/совместимости используется только для Wi‑Fi/HOMMYN';
  }

  if (pageClass === PAGE_CLASSES.summaryPage) {
    return 'summaryPage: сводная страница используется только для обнаружения серии';
  }

  if (pageClass === PAGE_CLASSES.otherSeriesPage) {
    const otherCodes = unique(matchedOtherSeries.filter((match) => match.hasCode).map((match) => match.profile.code));
    const otherNames = unique(matchedOtherSeries.map((match) => match.profile.seriesName));
    const markers = otherCodes.length > 0 ? otherCodes : otherNames;

    return `otherSeriesPage: страница другой серии${markers.length > 0 ? ` (${markers.join(' / ')})` : ''}`;
  }

  if (pageClass === PAGE_CLASSES.categoryPage) {
    return `categoryPage: общая страница без точного токена ${profile.seriesName} / ${profile.code}`;
  }

  return '';
};

export const classifyPageForSeries = (page, profile, allProfiles = SERIES_PROFILES) => {
  const text = page?.text || '';
  const matchedTokenObjects = getMatchedTokenObjects(text, profile);
  const matchedTokens = getDiagnosticTokenLabels(matchedTokenObjects);
  const matchedOtherSeries = getOtherSeriesMatches(text, profile, allProfiles);
  const hasSelectedCode = matchedTokenObjects.some((token) => ['code', 'compactCode', 'modelPrefix'].includes(token.kind));
  const isHommynPage = isServicePage(page);
  const hasTechnicalTableMarker = hasTechnicalMarker(text);
  const reasonTechnicalPage = getTechnicalPageReasons({ matchedTokenObjects, hasTechnicalTableMarker });
  const pageClass = getPageClass({
    text,
    profile,
    allProfiles,
    matchedTokens,
    matchedOtherSeries,
    hasSelectedCode,
    isHommynPage,
    hasTechnicalTableMarker,
    reasonTechnicalPage,
  });
  const belongsToSeries = pageClass === PAGE_CLASSES.exactSeriesPage;
  const isMultiSeriesSummaryPage = pageClass === PAGE_CLASSES.summaryPage;
  const isTechnicalPage = belongsToSeries && reasonTechnicalPage.length > 0;
  const isOverviewPage = belongsToSeries && !isTechnicalPage;
  const excluded = pageClass !== PAGE_CLASSES.exactSeriesPage;
  let score = scoreSeriesPage(page, profile, allProfiles);

  if (hasSelectedCode) {
    score += 10;
  } else if (matchedTokens.length > 0) {
    score += 6;
  }

  if (isTechnicalPage) {
    score += 5;
  }

  if (excluded) {
    score = Math.min(score, -1);
  }

  return {
    pageNumber: page?.pageNumber,
    pageClass,
    pageClassLabel: PAGE_CLASS_LABELS[pageClass],
    score,
    belongsToSeries,
    isTechnicalPage,
    isOverviewPage,
    isServicePage: pageClass === PAGE_CLASSES.servicePage,
    isSummaryPage: pageClass === PAGE_CLASSES.summaryPage,
    isOtherSeriesPage: pageClass === PAGE_CLASSES.otherSeriesPage,
    isCategoryPage: pageClass === PAGE_CLASSES.categoryPage,
    excluded,
    excludeReason: excluded
      ? buildExcludeReason({ profile, pageClass, matchedOtherSeries })
      : '',
    matchedTokens,
    matchedOtherSeries: matchedOtherSeries.map((match) => ({
      seriesName: match.profile.seriesName,
      code: match.profile.code,
      matchedTokens: unique(match.matchedTokens),
      hasCode: match.hasCode,
    })),
    isMultiSeriesSummaryPage,
    hasSelectedCode,
    reasonTechnicalPage,
  };
};
