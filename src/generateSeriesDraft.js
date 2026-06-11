import { SERIES_PROFILES, findSeriesProfile } from './data/seriesProfiles.js';

const featurePatterns = [
  { label: 'Wi-Fi управление', patterns: [/\bwi\s*-?\s*fi\b/u, /\bwifi\b/u, /вай\s*-?\s*фай/u, /\bhommyn\b/u, /работает\s+с\s+hommyn/u] },
  { label: '3D-контроль потока воздуха', patterns: [/3d\s*-?\s*контрол/u, /3d\s+контрол/u, /\b3d\s*airflow\b/u, /3d[^\n.]{0,80}(?:поток|воздух)/u] },
  { label: 'i-FEEL', patterns: [/\bi\s*-?\s*feel\b/u, /\bifeel\b/u, /климат\s*-?\s*контрол/u, /ай\s*фил/u] },
  { label: '7 скоростей вентилятора', patterns: [/7\s+скорост/u, /скорост[а-яё]*\s+вентилятор/u] },
  { label: 'стабильная работа на обогрев', patterns: [/стабильн[а-яё]*\s+работ[а-яё]*\s+на\s+обогрев/u, /работ[а-яё]*\s+на\s+обогрев/u] },
  { label: 'самоочистка со стерилизацией', patterns: [/самоочист[а-яё\s-]{0,120}стерилизац/u, /стерилизац[а-яё\s-]{0,120}самоочист/u, /самоочистка\s+со\s+стерилизацией/u, /стерилизац(?:ия|ией|иеи|ию|ии|ией|иеи|ие)/u] },
  { label: 'самоочистка', patterns: [/самоочист/u, /\bself\s*-?\s*clean/u] },
  { label: 'R32', patterns: [/\br\s*32\b/u] },
  { label: 'Full DC inverter', patterns: [/\bfull\s*dc\s*inverter\b/u, /полн(?:ый|ыи)\s+dc\s+инвертор/u] },
  { label: 'инвертор', patterns: [/инвертор/u, /\binverter\b/u] },
  { label: 'Golden Fin', patterns: [/\bgolden\s*fin\b/u, /голден\s*фин/u, /защитн[а-яё]*\s+покрыт/u] },
  { label: 'фильтрация воздуха', patterns: [/фильтрац/u, /фильтр[^\n.]{0,80}воздух/u, /air\s*filter/u] },
  { label: 'ионизация', patterns: [/ионизац/u, /\bion\s*air\b/u, /ионизатор/u, /\bionizer\b/u, /\bioniser\b/u] },
  { label: 'ION COMBO-4', patterns: [/\bion\s*combo-?4\b/u, /комбо\s*-?\s*фильтр\s+4\s+в\s+1/u] },
  { label: 'УФ-обработка воздуха', patterns: [/уф\s*-?\s*обработ/u, /uv\s*-?\s*фильтр/u, /ультрафиолет/u, /уф\s*-?\s*ламп/u, /uv\s*-?\s*lamp/u] },
  { label: 'Gentle Breeze / мягкий обдув', patterns: [/\bgentle\s*breeze\b/u, /мягк[^\n.]{0,40}обдув/u] },
  { label: 'Health Guard', patterns: [/\bhealth\s*guard\b/u, /хелс\s*гард/u] },
  { label: 'Smart Sens', patterns: [/\bsmart\s*sens\b/u, /\bsmart\s*sense\b/u, /смарт\s*сенс/u, /датчик\s+присутств/u] },
  { label: 'тепловой насос', patterns: [/теплов(?:ой|ои)\s+насос/u, /\bheat\s*pump\b/u] },
  { label: 'сменные тканевые панели', patterns: [/сменн[^\n.]{0,60}тканев[^\n.]{0,40}панел/u, /тканев[^\n.]{0,40}панел/u] },
  { label: 'поворот жалюзи 180°', patterns: [/180\s*°?[^\n.]{0,80}жалюз/u, /жалюз[^\n.]{0,80}180\s*°?/u] },
];

const FEATURE_RULES = featurePatterns;

const FEATURE_PRIORITY = [
  'Wi-Fi управление',
  '3D-контроль потока воздуха',
  'i-FEEL',
  '7 скоростей вентилятора',
  'стабильная работа на обогрев',
  'низкий уровень шума от 19 дБ',
  'низкий уровень шума от 20 дБ',
  'низкий уровень шума от 21 дБ',
  'низкий уровень шума от 23 дБ',
  'УФ-обработка воздуха',
  'Gentle Breeze / мягкий обдув',
  'самоочистка со стерилизацией',
  'обогрев до -30°C',
  'обогрев до -20°C',
  'обогрев до -15°C',
  'Health Guard',
  'Smart Sens',
  'тепловой насос',
  'Golden Fin',
  'ионизация',
  'ION COMBO-4',
  'фильтрация воздуха',
  'поворот жалюзи 180°',
  'сменные тканевые панели',
  'самоочистка',
  'Full DC inverter',
  'инвертор',
  'R32',
  'A/A → A++/A+',
];

const TECHNICAL_FEATURE_LABELS = new Set([
  'обогрев до -20°C',
  'обогрев до -15°C',
  'обогрев до -30°C',
  'низкий уровень шума от 19 дБ',
  'низкий уровень шума от 20 дБ',
  'низкий уровень шума от 21 дБ',
  'низкий уровень шума от 23 дБ',
  'R32',
]);

const isTechnicalFeature = (feature = '') => {
  const normalizedFeature = normalizeSearchText(feature);

  return (
    TECHNICAL_FEATURE_LABELS.has(feature) ||
    /^низкий уровень шума от \d+ дб$/u.test(normalizedFeature) ||
    /^обогрев до -\d+°c$/u.test(normalizedFeature) ||
    isEnergyClassFeature(feature)
  );
};

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

const buildTechnicalSourceRef = (source) => {
  const technicalPages = source?.technicalPages || source?.pageDiagnostics?.technicalPages || [];

  if (!technicalPages.length) {
    return '';
  }

  const technicalPageRef = `PDF каталог ${source?.sourceDate || ''}, technicalPages ${technicalPages.join(', ')}`.replace(/\s+,/u, ',').trim();

  return [source?.title, technicalPageRef].filter(Boolean).join(' · ');
};

const TECHNICAL_ONLY_REF_FIELDS = new Set(['technicalSpecs']);
const MIXED_TECHNICAL_REF_FIELDS = new Set(['keyFeatures', 'salesFeatures', 'mainAdvantages', 'importantSpecs']);

const shouldUseTechnicalSourceRef = (field, value) => {
  if (TECHNICAL_ONLY_REF_FIELDS.has(field)) {
    return true;
  }

  if (!MIXED_TECHNICAL_REF_FIELDS.has(field)) {
    return false;
  }

  const values = Array.isArray(value) ? value : [value];

  return values.some((item) => isTechnicalFeature(String(item || '')) || hasAnyKeyword(String(item || ''), TECHNICAL_SPEC_KEYWORDS));
};

const hasDraftValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
};

const attachSourceRefs = (draft, source) => {
  const sourceRef = buildSourceRef(source);
  const technicalSourceRef = buildTechnicalSourceRef(source);

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
        .map(([field, value]) => [field, shouldUseTechnicalSourceRef(field, value) && technicalSourceRef ? technicalSourceRef : sourceRef]),
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

const getFeaturePriorityKey = (feature = '') => {
  const normalizedFeature = normalizeSearchText(feature);

  if (/^низкий уровень шума от \d+ дб$/u.test(normalizedFeature)) {
    return normalizeSearchText('низкий уровень шума от 19 дБ');
  }

  if (isEnergyClassFeature(feature)) {
    return normalizeSearchText('A/A → A++/A+');
  }

  return normalizedFeature;
};

const sortFeaturesByPriority = (features) => {
  const priorityIndex = new Map(FEATURE_PRIORITY.map((feature, index) => [normalizeSearchText(feature), index]));

  return [...features].sort((left, right) => {
    const leftPriority = priorityIndex.get(getFeaturePriorityKey(left)) ?? FEATURE_PRIORITY.length;
    const rightPriority = priorityIndex.get(getFeaturePriorityKey(right)) ?? FEATURE_PRIORITY.length;

    return leftPriority - rightPriority;
  });
};

const getTechnicalValueSegment = (text = '', markerPattern, maxLength = 360) => {
  const normalizedText = String(text || '').replace(/[‐‑‒–—−]/gu, '-');
  const match = markerPattern.exec(normalizedText);

  if (!match) {
    return '';
  }

  const afterMarker = normalizedText.slice(match.index);
  const lineEnd = afterMarker.search(/\r?\n/u);

  if (lineEnd > 0) {
    const currentLine = afterMarker.slice(0, lineEnd);
    const nextLine = afterMarker.slice(lineEnd + 1).split(/\r?\n/u)[0] || '';

    return `${currentLine} ${nextLine}`.slice(0, maxLength);
  }

  return afterMarker.slice(0, maxLength);
};

const collectIndoorNoiseValues = (text = '') => {
  const values = [];
  const normalizedText = String(text || '').replace(/,/gu, '.');

  for (const match of normalizedText.matchAll(/\b(1[5-9]|2\d|3\d)\s*\/\s*\d{2}(?:\.\d+)?\b/gu)) {
    values.push(Number(match[1]));
  }

  if (values.length > 0) {
    return values;
  }

  for (const match of normalizedText.matchAll(/(?:от\s*)?(1[5-9]|2\d|3\d)\s*дб/giu)) {
    values.push(Number(match[1]));
  }

  return values;
};

export const extractNoiseLevel = (technicalText = '') => {
  const segment = getTechnicalValueSegment(technicalText, /уровень\s+шума/iu);

  if (!segment) {
    return '';
  }

  const noiseValues = collectIndoorNoiseValues(segment);

  if (noiseValues.length === 0) {
    return '';
  }

  return `низкий уровень шума от ${Math.min(...noiseValues)} дБ`;
};

const extractNoiseFeature = (technicalText = '') => {
  const noiseLevel = extractNoiseLevel(technicalText);

  return noiseLevel ? [noiseLevel] : [];
};

export const extractHeatingRange = (technicalText = '') => {
  const segment = getTechnicalValueSegment(technicalText, /диапазон\s+рабочих\s+температур/iu);

  if (!segment) {
    return '';
  }

  const heatingMinimums = [];
  const compactSegment = segment.replace(/\s+/gu, ' ');

  for (const match of compactSegment.matchAll(/\/\s*(-\s*\d{1,2})\s*(?:…|\.\.|\.\.\.|-)\s*\+?\s*\d{1,2}\s*(?:°\s*c|°с|c|с)?/giu)) {
    heatingMinimums.push(Number(match[1].replace(/\s+/gu, '')));
  }

  if (heatingMinimums.length === 0) {
    const slashIndex = compactSegment.indexOf('/');
    const heatingPart = slashIndex >= 0 ? compactSegment.slice(slashIndex + 1) : '';

    for (const match of heatingPart.matchAll(/-\s*(\d{1,2})\s*(?:°\s*c|°с|c|с)?/giu)) {
      heatingMinimums.push(-Number(match[1]));
    }
  }

  if (heatingMinimums.length === 0) {
    return '';
  }

  return `обогрев до ${Math.min(...heatingMinimums)}°C`;
};

const extractHeatingFeatures = (technicalText = '') => {
  const heatingRange = extractHeatingRange(technicalText);

  return heatingRange ? [heatingRange] : [];
};

const getEnergyClassComparisonKey = (value = '') =>
  String(value || '')
    .toLocaleUpperCase('ru-RU')
    .replace(/[А]/gu, 'A')
    .replace(/\\/gu, '/')
    .replace(/\s+/gu, '');

const isEnergyClassValue = (value = '') => {
  const normalizedValue = getEnergyClassComparisonKey(value);
  const parts = normalizedValue.split('/');

  return parts.length === 2 && parts.every((part) => /^A\+*$/u.test(part));
};

const normalizeEnergyClassDisplayValue = (value = '') =>
  String(value || '')
    .replace(/\\/gu, '/')
    .replace(/\s+/gu, '');

const uniqueEnergyClassValues = (values = []) => {
  const seen = new Set();

  return values.filter((value) => {
    const normalizedValue = getEnergyClassComparisonKey(value);

    if (seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

const collectEnergyClassValues = (text = '') => {
  const values = [];
  const sourceText = String(text || '');

  for (const match of sourceText.matchAll(/(?:^|[^A-ZА-ЯЁ])([AА]\s*\+*\s*[/\\]\s*[AА]\s*\+*)(?=$|[^A-ZА-ЯЁ+])/giu)) {
    const value = normalizeEnergyClassDisplayValue(match[1]);

    if (isEnergyClassValue(value)) {
      values.push(value);
    }
  }

  return uniqueEnergyClassValues(values);
};

const collectStandaloneEnergyClassValues = (text = '') => {
  const values = [];
  const sourceText = String(text || '');

  for (const match of sourceText.matchAll(/(?:^|[^A-ZА-ЯЁ\/])([AА]\s*\+{1,3})(?=$|[^A-ZА-ЯЁ+\/])/giu)) {
    const value = normalizeEnergyClassDisplayValue(match[1]);

    if (/^A\+{1,3}$/u.test(getEnergyClassComparisonKey(value))) {
      values.push(value);
    }
  }

  return uniqueEnergyClassValues(values);
};

const formatEnergyClassFeature = (values = []) => {
  if (values.length === 0 || values.length > 2) {
    return '';
  }

  return values.length === 1 ? values[0] : `${values[0]} → ${values[1]}`;
};

const ENERGY_CLASS_ROW_MARKER = /класс\s+энергоэффективности(?:\s*\(?\s*eer\s*\/\s*cop\s*\)?)?/iu;
const ENERGY_CLASS_SEGMENT_MAX_LENGTH = 240;
const ENERGY_CLASS_NEXT_ROW_MARKER = /\bSEER\b|\bSCOP\b|сезонн(?:ый|ого|ые|ых)?\s+коэффициент|мощность|потребляемая|потребление|коэффициент|уровень\s+шума|расход\s+воздуха|диапазон\s+рабочих\s+температур|размер|габарит|вес|хладагент|электропитание|класс\s+пылевлагозащиты/iu;

const buildEnergyClassDecision = (values = [], reasonPrefix = 'accepted') => {
  const valueCount = values.length;

  if (valueCount === 0) {
    return { value: '', reason: `${reasonPrefix}: no energy class values`, ambiguous: false };
  }

  if (valueCount > 2) {
    return { value: '', reason: 'rejected: ambiguous energy class segment has more than 2 distinct values', ambiguous: true };
  }

  return { value: formatEnergyClassFeature(values), reason: `${reasonPrefix}: ${valueCount} distinct value(s) in strict energy row`, ambiguous: false };
};

export const diagnoseEnergyClass = (technicalText = '') => {
  const normalizedText = String(technicalText || '').replace(/[‐‑‒–—−]/gu, '-');
  const lines = normalizedText.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const sourceSegment = lines.length > 1
    ? lines.find((line) => ENERGY_CLASS_ROW_MARKER.test(line)) || ''
    : normalizedText;
  const markerMatch = ENERGY_CLASS_ROW_MARKER.exec(sourceSegment);

  if (!markerMatch) {
    return {
      markerFound: false,
      rawSegment: '',
      segment: '',
      stopMarker: '',
      values: [],
      value: '',
      reason: 'rejected: energy class row marker not found',
      ambiguous: false,
    };
  }

  const rawSegment = sourceSegment.slice(markerMatch.index, markerMatch.index + ENERGY_CLASS_SEGMENT_MAX_LENGTH).trim();
  const stopSearchStart = markerMatch[0].length;
  const stopMatch = ENERGY_CLASS_NEXT_ROW_MARKER.exec(rawSegment.slice(stopSearchStart));
  const segment = stopMatch
    ? rawSegment.slice(0, stopSearchStart + stopMatch.index).trim()
    : rawSegment;
  const values = collectEnergyClassValues(segment);
  const decision = buildEnergyClassDecision(values);

  return {
    markerFound: true,
    rawSegment,
    segment,
    stopMarker: stopMatch ? stopMatch[0] : '',
    values,
    ...decision,
  };
};

const maybeLogEnergyClassDiagnostic = (diagnostic) => {
  if (typeof process === 'undefined' || process.env?.DEBUG_ENERGY_CLASS !== '1') {
    return;
  }

  console.log('[energy-class]', JSON.stringify(diagnostic));
};

const limitEnergyClassSegment = (text = '') => diagnoseEnergyClass(text).segment;

const extractEnergyClassFeatureValues = (feature = '') => {
  const normalizedFeature = String(feature || '')
    .replace(/[‐‑‒–—−]/gu, '→')
    .replace(/\\/gu, '/')
    .replace(/\s*(?:→|->|—|–|-|to)\s*/giu, ' → ')
    .trim();

  const rangeParts = normalizedFeature.split(/\s+→\s+/u).filter(Boolean);

  if (rangeParts.length > 1 && rangeParts.every((part) => isEnergyClassValue(part))) {
    return uniqueEnergyClassValues(rangeParts.map(normalizeEnergyClassDisplayValue));
  }

  return uniqueEnergyClassValues([
    ...collectEnergyClassValues(normalizedFeature),
    ...collectStandaloneEnergyClassValues(normalizedFeature),
  ]);
};

const containsEnergyClassReference = (feature = '') => {
  const normalizedFeature = normalizeSearchText(feature);

  return (
    /энергоэффективност/u.test(normalizedFeature) ||
    /класс[а-яё\s]*(?:eer|cop|энерго)/u.test(normalizedFeature) ||
    extractEnergyClassFeatureValues(feature).length > 0
  );
};

export const isEnergyClassFeature = (feature = '') => {
  const values = extractEnergyClassFeatureValues(feature);

  if (values.length === 0) {
    return false;
  }

  const normalizedFeature = String(feature || '')
    .replace(/[‐‑‒–—−]/gu, '→')
    .replace(/\\/gu, '/')
    .replace(/\s*(?:→|->|—|–|-|to)\s*/giu, ' → ')
    .trim();

  return (
    values.every((part) => isEnergyClassValue(part)) ||
    values.every((part) => /^A\+{1,3}$/u.test(getEnergyClassComparisonKey(part))) ||
    /энергоэффективност|класс/iu.test(normalizedFeature)
  );
};

export const extractEnergyClass = (technicalText = '') => {
  const diagnostic = diagnoseEnergyClass(technicalText);

  maybeLogEnergyClassDiagnostic(diagnostic);
  return diagnostic.value;
};

export const sanitizeEnergyClasses = (features = [], technicalText = '') => {
  const sourceFeatures = Array.isArray(features) ? features : [];
  const energyClass = extractEnergyClass(technicalText);
  const nonEnergyFeatures = sourceFeatures.filter((feature) => !containsEnergyClassReference(feature));

  return energyClass ? unique([...nonEnergyFeatures, energyClass]) : nonEnergyFeatures;
};

export const sanitizeEnergyClass = sanitizeEnergyClasses;

const extractEnergyClassFeatures = (technicalText = '') => {
  const feature = extractEnergyClass(technicalText);

  return feature ? [feature] : [];
};

export const extractFeatureList = (rawText = '', seriesName = '') => {
  const normalizedText = normalizeSearchText(rawText);
  const normalizedSeriesName = normalizeSeriesName(seriesName);
  const features = [
    ...FEATURE_RULES.filter((rule) => hasAnyPattern(normalizedText, rule.patterns)).map((rule) => rule.label),
    ...extractHeatingFeatures(rawText),
    ...extractNoiseFeature(rawText),
    ...extractEnergyClassFeatures(rawText),
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

const WIFI_PATTERNS = FEATURE_RULES.find((rule) => rule.label === 'Wi-Fi управление').patterns;
const COMMON_SALES_FEATURES = new Set(['Full DC inverter', 'инвертор', 'R32'].map(normalizeSearchText));

const hasSeriesReference = (normalizedText = '', seriesName = '', code = '') => {
  const normalizedSeriesName = normalizeSeriesName(seriesName);
  const normalizedCode = normalizeSearchText(code);

  return [normalizedSeriesName, normalizedCode]
    .filter(Boolean)
    .some((marker) => new RegExp(`(^|[^0-9a-zа-яё])${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^0-9a-zа-яё]|$)`, 'u').test(normalizedText));
};

const extractAuxiliaryWifiFeature = (rawText = '', seriesName = '', code = '') => {
  const normalizedText = normalizeSearchText(rawText);

  if (!normalizedText || !hasAnyPattern(normalizedText, WIFI_PATTERNS)) {
    return [];
  }

  return hasSeriesReference(normalizedText, seriesName, code) ? ['Wi-Fi управление'] : [];
};

const sortSalesFeatures = (features = []) => {
  const priorityIndex = new Map(FEATURE_PRIORITY.map((feature, index) => [normalizeSearchText(feature), index]));

  return [...features].sort((left, right) => {
    const leftNormalized = normalizeSearchText(left);
    const rightNormalized = normalizeSearchText(right);
    const leftCommon = COMMON_SALES_FEATURES.has(leftNormalized);
    const rightCommon = COMMON_SALES_FEATURES.has(rightNormalized);

    if (leftCommon !== rightCommon) {
      return leftCommon ? 1 : -1;
    }

    const leftPriority = priorityIndex.get(getFeaturePriorityKey(left)) ?? FEATURE_PRIORITY.length;
    const rightPriority = priorityIndex.get(getFeaturePriorityKey(right)) ?? FEATURE_PRIORITY.length;

    return leftPriority - rightPriority;
  });
};

const buildSalesFeatureList = ({ exactSeriesText = '', technicalText = '', summaryText = '', serviceText = '', seriesName = '', code = '', hasExactSeriesPages = false, hasTechnicalTable = false }) => {
  if (!hasExactSeriesPages) {
    return [];
  }

  const exactSeriesFeatures = extractFeatureList(exactSeriesText, seriesName).filter((feature) => !isTechnicalFeature(feature));
  const auxiliaryWifiFeatures = [
    ...extractAuxiliaryWifiFeature(summaryText, seriesName, code),
    ...extractAuxiliaryWifiFeature(serviceText, seriesName, code),
  ];
  const technicalFeatures = hasTechnicalTable
    ? extractFeatureList(technicalText, seriesName).filter(isTechnicalFeature)
    : [];

  return sanitizeEnergyClasses(
    sortSalesFeatures(unique([...exactSeriesFeatures, ...auxiliaryWifiFeatures, ...technicalFeatures])),
    technicalText,
  );
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

const normalizeTechnicalSpecLine = (line = '') => {
  const normalizedLine = normalizeLine(line);

  return ENERGY_CLASS_ROW_MARKER.test(normalizedLine) ? limitEnergyClassSegment(normalizedLine) : normalizedLine;
};

const extractTechnicalSpecs = (rawText = '') =>
  unique(
    rawText
      .split(/\r?\n/)
      .map(normalizeTechnicalSpecLine)
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
    hasTechnicalTable ? '' : 'Техническая таблица выбранной серии не найдена. Числовые характеристики не заполнены.',
  ].filter(Boolean);

  return warnings.join(' ');
};

const getIsolatedSourceTexts = (source) => {
  const exactSeriesText = source.exactSeriesText || source.exactSeriesRawText || source.overviewRawText || '';
  const technicalText = source.technicalText || source.technicalRawText || '';
  const summaryText = source.summaryText || source.summaryRawText || '';
  const serviceText = source.serviceText || source.serviceRawText || '';

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
  const { exactSeriesText, technicalText, summaryText, serviceText, hasExactSeriesPages, hasTechnicalTable } = getIsolatedSourceTexts(source);
  const seriesName = approvedProfile.seriesName;
  const salesFeatures = buildSalesFeatureList({
    exactSeriesText,
    technicalText,
    summaryText,
    serviceText,
    seriesName,
    code: approvedProfile.code,
    hasExactSeriesPages,
    hasTechnicalTable,
  });
  const technicalFeatures = sanitizeEnergyClasses(
    hasTechnicalTable ? extractFeatureList(technicalText, seriesName).filter(isTechnicalFeature) : [],
    technicalText,
  );
  const keyFeatures = sanitizeEnergyClasses(sortFeaturesByPriority(unique([...salesFeatures, ...technicalFeatures])), technicalText);
  const mainAdvantages = pickMainAdvantages(
    salesFeatures.filter((feature) => !isEnergyClassFeature(feature)),
    legacyProfile?.mainAdvantages?.filter((feature) => !isEnergyClassFeature(feature)) || [],
  ).filter((feature) => !isEnergyClassFeature(feature));
  const technicalSpecs = hasTechnicalTable ? extractTechnicalSpecs(technicalText) : [];
  const importantSpecs = sanitizeEnergyClasses(unique([...salesFeatures, ...technicalSpecs]), technicalText);
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

  const { exactSeriesText, technicalText, summaryText, serviceText, hasExactSeriesPages, hasTechnicalTable } = getIsolatedSourceTexts(source);
  const salesFeatures = buildSalesFeatureList({
    exactSeriesText,
    technicalText,
    summaryText,
    serviceText,
    seriesName: source.seriesName,
    code: source.code,
    hasExactSeriesPages,
    hasTechnicalTable,
  });
  const technicalFeatures = sanitizeEnergyClasses(
    hasTechnicalTable ? extractFeatureList(technicalText, source.seriesName).filter(isTechnicalFeature) : [],
    technicalText,
  );
  const keyFeatures = sanitizeEnergyClasses(sortFeaturesByPriority(unique([...salesFeatures, ...technicalFeatures])), technicalText);
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
    importantSpecs: sanitizeEnergyClasses(unique([...salesFeatures, ...technicalSpecs]), technicalText),
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  }, source);
};
