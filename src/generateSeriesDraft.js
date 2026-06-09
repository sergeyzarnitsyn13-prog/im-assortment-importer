const SALES_FEATURE_RULES = [
  { label: 'Wi-Fi', keywords: ['wi-fi', 'wifi', 'вай-фай'] },
  { label: 'Smart Sens', keywords: ['smart sens', 'smart sense', 'смарт сенс'] },
  { label: 'Health Guard', keywords: ['health guard', 'хелс гард'] },
  { label: 'Тепловой насос', keywords: ['тепловой насос', 'heat pump'] },
  { label: 'Обогрев до -30', keywords: ['-30', '−30', 'до минус 30'] },
  { label: 'Ионизация', keywords: ['ионизац', 'ionizer', 'ионизатор'] },
  { label: 'Самоочистка', keywords: ['самоочист', 'self clean', 'self-clean'] },
];

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
];

const ICE_PEAK_MAIN_SALES_IDEA = 'Не просто кондиционер, а тепловой насос для отопления и охлаждения.';

const ICE_PEAK_TARGET_CLIENT = [
  'владельцы частных домов',
  'дача круглогодичного проживания',
  'северные регионы',
];

const ICE_PEAK_WHEN_RECOMMEND = [
  'нужен обогрев зимой',
  'важна экономия на отоплении',
  'нужен тепловой насос',
];

const ICE_PEAK_WHEN_NOT_RECOMMEND = [
  'нужен самый дешевый кондиционер',
  'требуется только охлаждение летом',
];

const ICE_PEAK_POSITIONING = 'Климатическая серия ICE PEAK для отопления зимой и охлаждения летом.';

const normalizeLine = (line) => line.trim().replace(/^[-–—•*\d.)\s]+/, '').trim();

const normalizeText = (value = '') => value.toLocaleLowerCase('ru-RU');

const hasAnyKeyword = (text = '', keywords) => {
  const normalizedText = normalizeText(text);

  return keywords.some((keyword) => normalizedText.includes(normalizeText(keyword)));
};

const unique = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const normalizedItem = normalizeText(item);

    if (seen.has(normalizedItem)) {
      return false;
    }

    seen.add(normalizedItem);
    return true;
  });
};

const extractSalesFeatures = (rawText = '') =>
  SALES_FEATURE_RULES.filter((rule) => hasAnyKeyword(rawText, rule.keywords)).map((rule) => rule.label);

const extractKeyFeatures = (rawText = '') => extractSalesFeatures(rawText);

const extractTechnicalSpecs = (rawText = '') =>
  unique(
    rawText
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean)
      .filter((line) => hasAnyKeyword(line, TECHNICAL_SPEC_KEYWORDS)),
  );

const isIcePeakSource = (source) => normalizeText(source.brand || '').includes('ice peak');

const buildIcePeakShortDescription = (source, salesFeatures, positioning) => {
  const rawText = source.rawText || '';
  const productName = [source.brand || 'ICE PEAK', source.seriesName].filter(Boolean).join(' ');
  const category = source.category ? ` ${source.category}` : ' кондиционер';
  const featureSummary = salesFeatures.slice(0, 2).join(', ');

  if (featureSummary) {
    return `${productName || 'ICE PEAK'} —${category}. ${positioning} Ключевые преимущества: ${featureSummary}.`;
  }

  if (positioning) {
    return `${productName || 'ICE PEAK'} —${category}. ${positioning}`;
  }

  return rawText.slice(0, 350).trim();
};

export const generateIcePeakDraft = (source) => {
  const rawText = source.rawText || '';
  const detectedSalesFeatures = extractSalesFeatures(rawText);
  const salesFeatures = detectedSalesFeatures.length > 0
    ? detectedSalesFeatures
    : SALES_FEATURE_RULES.map((rule) => rule.label);

  return {
    brand: source.brand || 'ICE PEAK',
    category: source.category || '',
    seriesName: source.seriesName || '',
    shortDescription: buildIcePeakShortDescription(source, salesFeatures, ICE_PEAK_POSITIONING),
    positioning: ICE_PEAK_POSITIONING,
    targetClient: ICE_PEAK_TARGET_CLIENT,
    mainSalesIdea: ICE_PEAK_MAIN_SALES_IDEA,
    keyFeatures: salesFeatures,
    salesFeatures,
    salesArguments: [ICE_PEAK_MAIN_SALES_IDEA],
    clientSpeech: '',
    differences: '',
    whenRecommend: ICE_PEAK_WHEN_RECOMMEND,
    whenNotRecommend: ICE_PEAK_WHEN_NOT_RECOMMEND,
    objections: [],
    technicalSpecs: extractTechnicalSpecs(rawText),
    importantSpecs: [],
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  };
};

export const generateSeriesDraft = (source) => {
  if (isIcePeakSource(source)) {
    return generateIcePeakDraft(source);
  }

  const salesFeatures = extractSalesFeatures(source.rawText);

  return {
    brand: source.brand || '',
    category: source.category || '',
    seriesName: source.seriesName || '',
    shortDescription: (source.rawText || '').slice(0, 500),
    positioning: '',
    targetClient: [],
    mainSalesIdea: '',
    keyFeatures: extractKeyFeatures(source.rawText),
    salesFeatures,
    salesArguments: [],
    clientSpeech: '',
    differences: '',
    whenRecommend: [],
    whenNotRecommend: [],
    objections: [],
    technicalSpecs: extractTechnicalSpecs(source.rawText),
    importantSpecs: [],
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  };
};
