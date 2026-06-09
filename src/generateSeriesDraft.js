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
  'частный дом',
  'коттедж',
  'круглогодичная дача',
  'северные регионы',
  'клиент, которому важен обогрев зимой',
];

const ICE_PEAK_MAIN_ADVANTAGES = [
  'обогрев до -30°C',
  'тепловой насос',
  'Smart Sens',
  'Health Guard',
  'Wi-Fi',
];

const ICE_PEAK_WHEN_RECOMMEND = [
  'нужен обогрев зимой',
  'дом или дача',
  'межсезонье',
  'экономия на отоплении',
];

const ICE_PEAK_WHEN_NOT_RECOMMEND = [
  'нужен самый дешёвый кондиционер',
  'требуется только охлаждение летом',
];

const ICE_PEAK_POSITIONING = 'Климатическая серия ICE PEAK для отопления зимой и охлаждения летом.';

const ICE_PEAK_SHORT_DESCRIPTION =
  'ICE PEAK — это тепловой насос для дома и дачи: он охлаждает летом и помогает отапливать помещение зимой при температуре до -30°C. Серия подходит для частных домов, коттеджей, круглогодичных дач и северных регионов. Smart Sens, Health Guard и Wi‑Fi делают управление комфортным, а работу — более полезной для ежедневного климата.';

const ICE_PEAK_CLIENT_SPEECH =
  'ICE PEAK стоит рассматривать не как обычный кондиционер, а как тепловой насос для круглогодичного комфорта. Летом он охлаждает помещение, а зимой помогает с отоплением даже при морозах до -30°C. Для дома, коттеджа или дачи это способ экономить на обогреве в межсезонье и холодный период. Smart Sens, Health Guard и Wi‑Fi делают использование простым и комфортным каждый день.';

const MAX_SHORT_DESCRIPTION_LENGTH = 500;

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

const isIcePeakSource = (source) =>
  [source.brand, source.seriesName, source.title, source.rawText].some((value) =>
    normalizeText(value || '').includes('ice peak'),
  );

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

const buildHumanShortDescription = (source, salesFeatures) => {
  const productName = [source.brand, source.seriesName].filter(Boolean).join(' ') || 'Серия';
  const category = source.category || 'климатическая техника';
  const featureSummary = salesFeatures.slice(0, 3).join(', ');
  const featureSentence = featureSummary
    ? ` В карточке стоит подсветить понятные клиенту преимущества: ${featureSummary}.`
    : ' Описание лучше дополнить ключевыми преимуществами из проверенного источника.';

  return trimToSentence(
    `${productName} — ${category} для клиентов, которым важно быстро понять назначение серии без лишних технических подробностей.${featureSentence} Текст можно использовать как основу для карточки и затем уточнить под конкретные модели.`,
  );
};

const buildIcePeakShortDescription = () => trimToSentence(ICE_PEAK_SHORT_DESCRIPTION);

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
    shortDescription: buildIcePeakShortDescription(),
    positioning: ICE_PEAK_POSITIONING,
    targetClient: ICE_PEAK_TARGET_CLIENT,
    mainSalesIdea: ICE_PEAK_MAIN_SALES_IDEA,
    keyFeatures: salesFeatures,
    salesFeatures,
    mainAdvantages: ICE_PEAK_MAIN_ADVANTAGES,
    salesArguments: [ICE_PEAK_MAIN_SALES_IDEA],
    clientSpeech: ICE_PEAK_CLIENT_SPEECH,
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
    shortDescription: buildHumanShortDescription(source, salesFeatures),
    positioning: '',
    targetClient: [],
    mainSalesIdea: '',
    keyFeatures: extractKeyFeatures(source.rawText),
    salesFeatures,
    mainAdvantages: [],
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
