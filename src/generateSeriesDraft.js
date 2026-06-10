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

const SERIES_PROFILES = {
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
    mainAdvantages: ['обогрев до -30°C', 'тепловой насос', 'Smart Sens', 'Health Guard', 'Wi-Fi'],
    fallbackSalesFeatures: ['Wi-Fi', 'Smart Sens', 'Health Guard', 'Тепловой насос', 'Обогрев до -30', 'Ионизация', 'Самоочистка'],
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
    mainAdvantages: ['УФ', 'здоровье', 'очистка воздуха'],
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

const normalizeSeriesName = (seriesName = '') => normalizeText(seriesName.trim());

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

const extractProfileKeyFeatures = (profile, rawText = '') => {
  const sourceFeatures = [
    ...profile.meaningKeywords.filter((keyword) => hasAnyKeyword(rawText, [keyword])),
    ...extractSalesFeatures(rawText),
  ];

  if (sourceFeatures.length === 0) {
    return profile.fallbackSalesFeatures || profile.mainAdvantages;
  }

  return unique([...profile.mainAdvantages, ...sourceFeatures]);
};

const extractKeyFeatures = (rawText = '') => extractSalesFeatures(rawText);

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
    Object.values(SERIES_PROFILES).find((profile) => {
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

const buildProfileDraft = (source, profile) => {
  const rawText = source.rawText || '';
  const keyFeatures = extractProfileKeyFeatures(profile, rawText);
  const salesFeatures = profile.fallbackSalesFeatures || profile.mainAdvantages;

  return attachSourceRefs({
    brand: source.brand || profile.defaultBrand,
    category: source.category || '',
    seriesName: source.seriesName || '',
    shortDescription: trimToSentence(profile.shortDescription),
    positioning: profile.positioning,
    targetClient: profile.targetClient,
    mainSalesIdea: profile.mainSalesIdea,
    keyFeatures,
    salesFeatures,
    mainAdvantages: profile.mainAdvantages,
    salesArguments: profile.salesArguments,
    clientSpeech: profile.clientSpeech,
    differences: '',
    whenRecommend: profile.whenRecommend,
    whenNotRecommend: profile.whenNotRecommend,
    objections: [],
    technicalSpecs: extractTechnicalSpecs(rawText),
    importantSpecs: [],
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  }, source);
};

export const generateIcePeakDraft = (source) => buildProfileDraft(source, SERIES_PROFILES['ICE PEAK']);

export const generateSeriesDraft = (source) => {
  const profile = getSeriesProfileByName(source.seriesName);

  if (profile) {
    const profileDraft = buildProfileDraft(source, profile);

    if (doesProfileMatchDraftSeriesName(profileDraft, profile)) {
      return profileDraft;
    }
  }

  return attachSourceRefs({
    brand: source.brand || '',
    category: source.category || '',
    seriesName: source.seriesName || '',
    shortDescription: '',
    positioning: '',
    targetClient: [],
    mainSalesIdea: '',
    keyFeatures: extractKeyFeatures(source.rawText),
    salesFeatures: [],
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
  }, source);
};
