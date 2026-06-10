import { SERIES_PROFILES, findSeriesProfile } from './data/seriesProfiles.js';

const FEATURE_RULES = [
  { label: 'Wi-Fi управление', patterns: [/\bwi\s*-?\s*fi\b/u, /\bwifi\b/u, /вай\s*-?\s*фай/u] },
  { label: '3D-контроль потока воздуха', patterns: [/\b3\s*d\b/u, /3d\s*-?\s*контрол/u, /3d[^\n.]{0,80}(?:поток|воздух)/u] },
  { label: 'I Feel', patterns: [/\bi\s*feel\b/u, /ай\s*фил/u] },
  { label: 'самоочистка со стерилизацией', patterns: [/самоочист[^\n.]{0,120}стерилизац/u, /стерилизац[^\n.]{0,120}самоочист/u] },
  { label: 'самоочистка', patterns: [/самоочист/u, /\bself\s*-?\s*clean/u] },
  { label: 'R32', patterns: [/\br\s*32\b/u] },
  { label: 'Full DC inverter', patterns: [/\bfull\s*dc\s*inverter\b/u, /полн(?:ый|ыи)\s+dc\s+инвертор/u] },
  { label: 'инвертор', patterns: [/инвертор/u, /\binverter\b/u] },
  { label: 'Golden Fin', patterns: [/\bgolden\s*fin\b/u, /голден\s*фин/u, /золот[а-я]+\s+покрыт/u] },
  { label: 'фильтрация воздуха', patterns: [/фильтрац/u, /фильтр[^\n.]{0,80}воздух/u, /air\s*filter/u] },
  { label: 'ионизация', patterns: [/ионизац/u, /ионизатор/u, /\bionizer\b/u, /\bioniser\b/u] },
  { label: 'УФ-обработка воздуха', patterns: [/\bуф\b/u, /\buv\b/u, /ультрафиолет/u, /уф\s*-?\s*ламп/u, /uv\s*-?\s*lamp/u] },
  { label: 'Gentle Breeze / мягкий обдув', patterns: [/\bgentle\s*breeze\b/u, /мягк[^\n.]{0,40}обдув/u] },
  { label: 'Health Guard', patterns: [/\bhealth\s*guard\b/u, /хелс\s*гард/u] },
  { label: 'Smart Sens', patterns: [/\bsmart\s*sens\b/u, /\bsmart\s*sense\b/u, /смарт\s*сенс/u] },
  { label: 'тепловой насос', patterns: [/теплов(?:ой|ои)\s+насос/u, /\bheat\s*pump\b/u] },
  { label: 'сменные тканевые панели', patterns: [/сменн[^\n.]{0,60}тканев[^\n.]{0,40}панел/u, /тканев[^\n.]{0,40}панел/u] },
  { label: 'поворот жалюзи 180°', patterns: [/180\s*°?[^\n.]{0,80}жалюз/u, /жалюз[^\n.]{0,80}180\s*°?/u] },
];

const FEATURE_PRIORITY = [
  'УФ-обработка воздуха',
  'Gentle Breeze / мягкий обдув',
  'самоочистка со стерилизацией',
  'Wi-Fi управление',
  'обогрев до -20°C',
  'обогрев до -30°C',
  'R32',
  '3D-контроль потока воздуха',
  'низкий уровень шума от 19 дБ',
  'Health Guard',
  'Smart Sens',
  'тепловой насос',
  'Full DC inverter',
  'инвертор',
  'Golden Fin',
  'фильтрация воздуха',
  'ионизация',
  'I Feel',
  'поворот жалюзи 180°',
  'сменные тканевые панели',
  'самоочистка',
];

const TECHNICAL_FEATURE_LABELS = new Set([
  'обогрев до -20°C',
  'обогрев до -30°C',
  'низкий уровень шума от 19 дБ',
  'R32',
]);

const isTechnicalFeature = (feature = '') =>
  TECHNICAL_FEATURE_LABELS.has(feature) || /^низкий уровень шума от \d+ дБ$/u.test(feature);

const TECHNICAL_SPEC_KEYWORDS = [
  'btu',
  'бте',
  'мощность',
  'квт',
  'шум',
  'дб',
  'размер',
  'габарит',
  'вес',
  'кг',
  'потребление',
  'энергопотребление',
  'температур',
  'диапазон',
  'охлаждение',
  'обогрев',
  'хладагент',
  'r32',
];

const LEGACY_SALES_PROFILES = {
  BOHO: {
    name: 'BOHO',
    seriesNames: ['boho', 'бохо'],
    meaningKeywords: [
      'дизайн',
      'интерьер',
      'сменные панели',
      'тканевые панели',
      'внешний вид',
      'премиум дизайн',
    ],
    defaultBrand: '',
    positioning: 'Дизайнерская климатическая серия BOHO для современного интерьера.',
    shortDescription:
      'BOHO — кондиционер для интерьера, где техника должна выглядеть как часть дизайн-проекта. Серия делает акцент не только на климате, но и на внешнем виде: сменные тканевые панели помогают вписать внутренний блок в современную премиум-квартиру, дизайнерский ремонт или продуманное коммерческое пространство.',
    mainSalesIdea: 'Кондиционер как элемент интерьера.',
    targetClient: ['дизайнерский ремонт', 'современный интерьер', 'премиум квартира'],
    mainAdvantages: ['сменные тканевые панели', 'внешний вид', 'дизайнерская концепция'],
    salesArguments: [
      'кондиционер не спорит с интерьером, а становится его частью',
      'сменные тканевые панели помогают подобрать внешний вид под проект',
      'подходит для клиентов, которым важны эстетика и премиальное ощущение техники',
    ],
    clientSpeech:
      'BOHO выбирают не только за климат, но и за возможность вписать кондиционер в интерьер.',
    whenRecommend: ['дизайнерский ремонт', 'современная квартира', 'клиенту важен внешний вид техники'],
    whenNotRecommend: [
      'клиент выбирает только по минимальной цене',
      'нужен исключительно технический подбор без требований к дизайну',
    ],
  },
  'ICE PEAK': {
    name: 'ICE PEAK',
    seriesNames: ['ice peak', 'айс пик'],
    meaningKeywords: ['тепловой насос', 'отопление', '-30', 'smart sens', 'health guard'],
    defaultBrand: 'ICE PEAK',
    positioning: 'Климатическая серия ICE PEAK для отопления зимой и охлаждения летом.',
    shortDescription:
      'ICE PEAK — это тепловой насос для дома и дачи: он охлаждает летом и помогает отапливать помещение зимой при температуре до -30°C. Серия подходит для частных домов, коттеджей, круглогодичных дач и северных регионов. Smart Sens, Health Guard и Wi‑Fi делают управление комфортным, а работу — более полезной для ежедневного климата.',
    mainSalesIdea: 'Не просто кондиционер, а тепловой насос для отопления и охлаждения.',
    targetClient: [
      'частный дом',
      'коттедж',
      'круглогодичная дача',
      'северные регионы',
      'клиент, которому важен обогрев зимой',
    ],
    mainAdvantages: ['обогрев до -30°C', 'тепловой насос', 'Smart Sens', 'Health Guard', 'Wi-Fi управление'],
    fallbackSalesFeatures: ['Wi-Fi управление', 'Smart Sens', 'Health Guard', 'тепловой насос', 'обогрев до -30°C', 'ионизация', 'самоочистка'],
    salesArguments: ['Не просто кондиционер, а тепловой насос для отопления и охлаждения.'],
    clientSpeech:
      'ICE PEAK стоит рассматривать не как обычный кондиционер, а как тепловой насос для круглогодичного комфорта. Летом он охлаждает помещение, а зимой помогает с отоплением даже при морозах до -30°C. Для дома, коттеджа или дачи это способ экономить на обогреве в межсезонье и холодный период. Smart Sens, Health Guard и Wi‑Fi делают использование простым и комфортным каждый день.',
    whenRecommend: ['нужен обогрев зимой', 'дом или дача', 'межсезонье', 'экономия на отоплении'],
    whenNotRecommend: ['нужен самый дешёвый кондиционер', 'требуется только охлаждение летом'],
  },
  DEFENDER: {
    name: 'DEFENDER',
    seriesNames: ['defender', 'дефендер'],
    meaningKeywords: ['уф', 'uv', 'здоровье', 'очистка воздуха', 'семьи с детьми'],
    defaultBrand: '',
    positioning: 'Климатическая серия DEFENDER с акцентом на чистый воздух и заботу о здоровье.',
    shortDescription:
      'DEFENDER — серия для клиентов, которым важны не только охлаждение и обогрев, но и качество воздуха дома. Профиль серии стоит строить вокруг УФ-технологий, очистки воздуха и заботы о здоровье, поэтому она особенно уместна для семей с детьми и покупателей, которые внимательно относятся к микроклимату.',
    mainSalesIdea: 'Кондиционер для климата, чистоты воздуха и заботы о здоровье семьи.',
    targetClient: ['семьи с детьми', 'клиенты, которым важна очистка воздуха', 'домашний микроклимат'],
    mainAdvantages: [
      'УФ-обработка воздуха',
      'Gentle Breeze / мягкий обдув',
      'самоочистка со стерилизацией',
      'Wi-Fi управление',
      'обогрев до -20°C',
      'R32',
      '3D-контроль потока воздуха',
      'низкий уровень шума от 19 дБ',
    ],
    salesArguments: [
      'серия помогает говорить с клиентом не только про температуру, но и про качество воздуха',
      'акцент на здоровье понятен семьям с детьми',
      'очистка воздуха усиливает ценность кондиционера для ежедневного использования',
    ],
    clientSpeech:
      'DEFENDER выбирают, когда кондиционер должен не только охлаждать, но и помогать поддерживать более чистый и здоровый воздух дома.',
    whenRecommend: ['семья с детьми', 'важна очистка воздуха', 'покупатель заботится о здоровье'],
    whenNotRecommend: [
      'клиент выбирает только самый базовый кондиционер',
      'не нужны дополнительные функции очистки воздуха',
    ],
  },
};

const MAX_SHORT_DESCRIPTION_LENGTH = 500;
const MAX_MAIN_ADVANTAGES = 8;
const MIN_MAIN_ADVANTAGES = 5;

const buildSourceRef = (source) => [source.title, source.sourceRef].filter(Boolean).join(' · ');

const hasDraftValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
};

const attachSourceRefs = (draft, source) => {
  const sourceRef = buildSourceRef(source);

  if (!sourceRef) {
    return { ...draft, sourceRefs: {} };
  }

  return {
    ...draft,
    sourceRefs: Object.fromEntries(
      Object.entries(draft)
        .filter(
          ([field, value]) => !['sourceIds', 'sourceRefs', 'status'].includes(field) && hasDraftValue(value),
        )
        .map(([field]) => [field, sourceRef]),
    ),
  };
};

const normalizeLine = (line) => line.trim().replace(/^[-–—•*\d.)\s]+/, '').trim();

const normalizeText = (value = '') => value.toLocaleLowerCase('ru-RU');

const normalizeSearchText = (value = '') =>
  normalizeText(value)
    .replace(/ё/g, 'е')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/°\s*c/g, '°c')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasExactPhrase = (text = '', phrase = '') => {
  const trimmedPhrase = phrase.trim();

  if (!trimmedPhrase) {
    return false;
  }

  return new RegExp(`(^|[^0-9a-zа-яё])${escapeRegExp(trimmedPhrase)}([^0-9a-zа-яё]|$)`, 'i').test(text);
};

const getProfileMarkers = (profile) => [profile?.seriesName, profile?.code, ...(profile?.aliases || [])].filter(Boolean);

const getOtherSeriesMarkers = (text = '', selectedProfile) =>
  SERIES_PROFILES.filter((profile) => profile.id !== selectedProfile?.id)
    .flatMap(getProfileMarkers)
    .filter((marker) => hasExactPhrase(text, marker));

const assertRawTextBelongsToSelectedSeries = (source, profile) => {
  const rawText = source?.exactSeriesRawText || source?.overviewRawText || source?.rawText || '';

  if (!profile || !rawText) {
    return;
  }

  const otherMarkers = getOtherSeriesMarkers(rawText, profile);

  if (otherMarkers.length > 0 && !hasExactPhrase(rawText, profile.code)) {
    throw new Error('Найден текст другой серии. Карточка не создана.');
  }
};

const normalizeSeriesName = (seriesName = '') => normalizeText(seriesName.trim());

const hasAnyKeyword = (text = '', keywords) => {
  const normalizedText = normalizeSearchText(text);

  return keywords.some((keyword) => normalizedText.includes(normalizeSearchText(keyword)));
};

const hasAnyPattern = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const unique = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const normalizedItem = normalizeSearchText(item);

    if (seen.has(normalizedItem)) {
      return false;
    }

    seen.add(normalizedItem);
    return true;
  });
};

const sortFeaturesByPriority = (features) => {
  const priorityIndex = new Map(FEATURE_PRIORITY.map((feature, index) => [normalizeSearchText(feature), index]));

  return [...features].sort((left, right) => {
    const leftPriority = priorityIndex.get(normalizeSearchText(left)) ?? FEATURE_PRIORITY.length;
    const rightPriority = priorityIndex.get(normalizeSearchText(right)) ?? FEATURE_PRIORITY.length;

    return leftPriority - rightPriority;
  });
};

const extractNoiseFeature = (normalizedText = '') => {
  const noiseValues = [];
  const noiseText = normalizedText.includes('шум') || normalizedText.includes('дб');

  if (!noiseText) {
    return [];
  }

  for (const match of normalizedText.matchAll(/(?:от\s*)?(1[5-9]|2\d|30)\s*дб/gu)) {
    noiseValues.push(Number(match[1]));
  }

  for (const match of normalizedText.matchAll(/\b(1[5-9]|2\d|30)\s*\/\s*\d{2}\b/gu)) {
    noiseValues.push(Number(match[1]));
  }

  if (noiseValues.length === 0) {
    return [];
  }

  const minNoise = Math.min(...noiseValues);

  return [`низкий уровень шума от ${minNoise} дБ`];
};

const extractHeatingFeatures = (normalizedText = '') => {
  const hasHeatingContext = /обогрев|отоплен|нагрев|heat|heating|теплов(?:ой|ои)\s+насос/u.test(normalizedText);

  if (!hasHeatingContext) {
    return [];
  }

  return [
    /(?:-|минус\s*)30\s*(?:°?c|с|град)?/u.test(normalizedText) ? 'обогрев до -30°C' : null,
    /(?:-|минус\s*)20\s*(?:°?c|с|град)?/u.test(normalizedText) ? 'обогрев до -20°C' : null,
  ].filter(Boolean);
};

export const extractFeatureList = (rawText = '', seriesName = '') => {
  const normalizedText = normalizeSearchText(rawText);
  const normalizedSeriesName = normalizeSeriesName(seriesName);
  const features = [
    ...FEATURE_RULES.filter((rule) => hasAnyPattern(normalizedText, rule.patterns)).map((rule) => rule.label),
    ...extractHeatingFeatures(normalizedText),
    ...extractNoiseFeature(normalizedText),
  ];

  const uniqueFeatures = unique(features);
  const normalizedUniqueFeatures = uniqueFeatures.map(normalizeSearchText);
  const containsSterileSelfClean = normalizedUniqueFeatures.includes('самоочистка со стерилизацией');
  const containsFullDcInverter = normalizedUniqueFeatures.includes('full dc inverter');
  const normalizedFeatures = uniqueFeatures.filter((feature) => {
    const normalizedFeature = normalizeSearchText(feature);

    if (containsSterileSelfClean && normalizedFeature === 'самоочистка') {
      return false;
    }

    if (containsFullDcInverter && normalizedFeature === 'инвертор') {
      return false;
    }

    if (normalizedSeriesName !== 'defender') {
      return true;
    }

    return !['здоровье', 'очистка воздуха'].includes(normalizedFeature);
  });

  return sortFeaturesByPriority(normalizedFeatures);
};

const extractProfileKeyFeatures = (profile, rawText = '', technicalRawText = '') => {
  const salesFeatureList = extractFeatureList(rawText, profile.name).filter((feature) => !isTechnicalFeature(feature));
  const technicalFeatureList = extractFeatureList(technicalRawText, profile.name).filter(isTechnicalFeature);
  const featureList = unique([...salesFeatureList, ...technicalFeatureList]);

  if (featureList.length === 0) {
    const fallbackFeatures = profile.fallbackSalesFeatures || profile.mainAdvantages || [];

    return technicalRawText.trim()
      ? fallbackFeatures
      : fallbackFeatures.filter((feature) => !isTechnicalFeature(feature));
  }

  return sortFeaturesByPriority(featureList);
};

const extractKeyFeatures = (rawText = '', seriesName = '', technicalRawText = '') => {
  const salesFeatureList = extractFeatureList(rawText, seriesName).filter((feature) => !isTechnicalFeature(feature));
  const technicalFeatureList = extractFeatureList(technicalRawText, seriesName).filter(isTechnicalFeature);

  return sortFeaturesByPriority(unique([...salesFeatureList, ...technicalFeatureList]));
};

const pickMainAdvantages = (features = [], fallback = []) => {
  const normalizedFeatures = unique(features);

  if (normalizedFeatures.length >= MIN_MAIN_ADVANTAGES) {
    return normalizedFeatures.slice(0, MAX_MAIN_ADVANTAGES);
  }

  return unique([...normalizedFeatures, ...fallback]).slice(0, MAX_MAIN_ADVANTAGES);
};

const extractTechnicalSpecs = (rawText = '') =>
  unique(
    rawText
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean)
      .filter((line) => hasAnyKeyword(line, TECHNICAL_SPEC_KEYWORDS)),
  );

export const getSeriesProfileByName = (seriesName = '') => {
  const normalizedSeriesName = normalizeSeriesName(seriesName);

  if (!normalizedSeriesName) {
    return null;
  }

  return (
    Object.values(LEGACY_SALES_PROFILES).find((profile) => {
      const profileNames = [profile.name, ...profile.seriesNames].filter(Boolean).map(normalizeSeriesName);

      return profileNames.includes(normalizedSeriesName);
    }) || null
  );
};

const doesProfileMatchDraftSeriesName = (draft, profile) => {
  const normalizedDraftSeriesName = normalizeSeriesName(draft.seriesName);
  const profileNames = [profile.name, ...profile.seriesNames].filter(Boolean).map(normalizeSeriesName);

  return profileNames.includes(normalizedDraftSeriesName);
};

const trimToSentence = (text, maxLength = MAX_SHORT_DESCRIPTION_LENGTH) => {
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  const clipped = normalizedText.slice(0, maxLength + 1);
  const lastSentenceEnd = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('!'), clipped.lastIndexOf('?'));

  if (lastSentenceEnd >= 220) {
    return clipped.slice(0, lastSentenceEnd + 1).trim();
  }

  return `${normalizedText.slice(0, maxLength - 1).trim()}…`;
};

const getApprovedProfileSeed = (source) => findSeriesProfile(source.profileId || source.code || source.seriesName);

const buildDraftWarning = ({ hasExactSeriesPages, hasTechnicalTable, prefix = '' }) => {
  const warnings = [
    prefix,
    hasExactSeriesPages ? '' : 'Точные страницы серии не найдены.',
    hasTechnicalTable ? '' : 'Техническая таблица серии не найдена.',
  ].filter(Boolean);

  return warnings.join(' ');
};

const getIsolatedSourceTexts = (source) => {
  const exactSeriesText = source.exactSeriesRawText || source.overviewRawText || '';
  const technicalText = source.technicalRawText || '';
  const summaryText = source.summaryRawText || '';
  const serviceText = source.serviceRawText || '';

  return {
    exactSeriesText,
    technicalText,
    summaryText,
    serviceText,
    hasExactSeriesPages: exactSeriesText.trim().length > 0,
    hasTechnicalTable: technicalText.trim().length > 0,
  };
};

const buildProfileDraft = (source, approvedProfile, legacyProfile = null) => {
  const { exactSeriesText, technicalText, hasExactSeriesPages, hasTechnicalTable } = getIsolatedSourceTexts(source);
  const seriesName = approvedProfile.seriesName;
  const salesFeatures = hasExactSeriesPages
    ? extractFeatureList(exactSeriesText, seriesName).filter((feature) => !isTechnicalFeature(feature))
    : [];
  const technicalFeatures = hasTechnicalTable
    ? extractFeatureList(technicalText, seriesName).filter(isTechnicalFeature)
    : [];
  const keyFeatures = sortFeaturesByPriority(unique([...salesFeatures, ...technicalFeatures]));
  const mainAdvantages = pickMainAdvantages(salesFeatures);
  const technicalSpecs = hasTechnicalTable ? extractTechnicalSpecs(technicalText) : [];
  const importantSpecs = unique([...salesFeatures, ...technicalSpecs]);
  const draftWarning = buildDraftWarning({ hasExactSeriesPages, hasTechnicalTable });

  return attachSourceRefs({
    profileId: approvedProfile.id,
    profileStatus: approvedProfile.profileStatus,
    draftWarning,
    brand: approvedProfile.brand,
    category: approvedProfile.category,
    group: approvedProfile.group,
    code: approvedProfile.code,
    seriesName,
    shortDescription: hasExactSeriesPages && legacyProfile ? trimToSentence(legacyProfile.shortDescription) : '',
    positioning: hasExactSeriesPages ? legacyProfile?.positioning || '' : '',
    targetClient: legacyProfile?.targetClient || [],
    mainSalesIdea: legacyProfile?.mainSalesIdea || '',
    keyFeatures,
    salesFeatures,
    mainAdvantages,
    salesArguments: legacyProfile?.salesArguments || [],
    clientSpeech: legacyProfile?.clientSpeech || '',
    differences: '',
    whenRecommend: legacyProfile?.whenRecommend || [],
    whenNotRecommend: legacyProfile?.whenNotRecommend || [],
    objections: [],
    technicalSpecs,
    importantSpecs,
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  }, source);
};

export const generateIcePeakDraft = (source) => {
  const approvedProfile = findSeriesProfile('ICE PEAK');

  return buildProfileDraft(source, approvedProfile, LEGACY_SALES_PROFILES['ICE PEAK']);
};

export const generateSeriesDraft = (source) => {
  const approvedProfile = getApprovedProfileSeed(source);

  if (approvedProfile) {
    const legacyProfile = getSeriesProfileByName(approvedProfile.seriesName);

    return buildProfileDraft(source, approvedProfile, legacyProfile);
  }

  const { exactSeriesText, technicalText, hasExactSeriesPages, hasTechnicalTable } = getIsolatedSourceTexts(source);
  const salesFeatures = hasExactSeriesPages
    ? extractFeatureList(exactSeriesText, source.seriesName).filter((feature) => !isTechnicalFeature(feature))
    : [];
  const technicalFeatures = hasTechnicalTable
    ? extractFeatureList(technicalText, source.seriesName).filter(isTechnicalFeature)
    : [];
  const keyFeatures = sortFeaturesByPriority(unique([...salesFeatures, ...technicalFeatures]));
  const technicalSpecs = hasTechnicalTable ? extractTechnicalSpecs(technicalText) : [];

  return attachSourceRefs({
    profileId: source.profileId || '',
    profileStatus: 'unknown',
    draftWarning: buildDraftWarning({
      hasExactSeriesPages,
      hasTechnicalTable,
      prefix: 'Серия не найдена в утверждённом справочнике Ballu 2026. Проверьте серию вручную: продажное позиционирование не заполнено автоматически.',
    }),
    brand: source.brand || '',
    category: source.category || '',
    group: source.group || '',
    code: source.code || '',
    seriesName: source.seriesName || '',
    shortDescription: '',
    positioning: '',
    targetClient: [],
    mainSalesIdea: '',
    keyFeatures,
    salesFeatures,
    mainAdvantages: [],
    salesArguments: [],
    clientSpeech: '',
    differences: '',
    whenRecommend: [],
    whenNotRecommend: [],
    objections: [],
    technicalSpecs,
    importantSpecs: unique([...salesFeatures, ...technicalSpecs]),
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  }, source);
};
