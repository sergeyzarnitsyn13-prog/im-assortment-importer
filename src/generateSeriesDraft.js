import { SERIES_PROFILES, findSeriesProfile } from './data/seriesProfiles.js';

const featurePatterns = [
  { label: 'Wi-Fi управление', patterns: [/\bwi\s*-?\s*fi\b/u, /\bwifi\b/u, /вай\s*-?\s*фай/u, /\bhommyn\b/u, /работает\s+с\s+hommyn/u] },
  { label: 'управление со смартфона', patterns: [/управлен[а-яё\s]+(?:с\s+помощью\s+)?смартфон/u] },
  { label: 'инверторная технология', patterns: [/инверторн[а-яё]+\s+технолог/u] },
  { label: 'инверторный компрессор', patterns: [/инверторн[а-яё]+\s+компрессор/u] },
  { label: 'точное поддержание температуры', patterns: [/точн[а-яё\s]{0,80}поддержан[а-яё\s]{0,80}(?:комфортн[а-яё\s]+)?температур/u] },
  { label: 'экономичное поддержание температуры', patterns: [/экономичн[а-яё\s]{0,80}поддержан[а-яё\s]{0,80}(?:комфортн[а-яё\s]+)?температур/u] },
  { label: 'тихая работа', patterns: [/(?:исключительно\s+)?тих[а-яё]+\s+работ/u] },
  { label: 'низкий уровень шума 40 дБ', patterns: [/(?:уров[а-яё]+\s+шума[а-яё\s]+(?:всего\s+)?)?40\s*дб[а]?/u] },
  { label: 'дополнительная шумоизоляция', patterns: [/дополнительн[а-яё]+\s+шумоизоляц/u] },
  { label: 'тангенциальный вентилятор снижает шум', patterns: [/тангенциальн[а-яё]+\s+вентилятор[а-яё\s]{0,80}снижа[а-яё]+[а-яё\s]{0,40}шум/u] },
  { label: 'сенсорная Touch-панель', patterns: [/touch\s*-?\s*панел/u, /сенсорн[а-яё]+\s+панел[а-яё\s]*(?:с\s+дисплеем)?/u] },
  { label: 'пульт с подсветкой', patterns: [/пульт[а-яё\s]+(?:управлен[а-яё]+\s+)?с\s+подсветк/u] },
  { label: 'энергоэффективность A+', patterns: [/(?:класс\s+)?энергоэффективност[а-яё\s]+a\s*\+/u] },
  { label: 'энергопотребление менее 1 кВт/ч', patterns: [/энергопотреблен[а-яё\s]+менее\s+1\s*квт\s*\/\s*ч/u] },
  { label: 'R290 эко-фреон', patterns: [/r\s*290/u, /эко\s*-?\s*фреон/u] },
  { label: '4 режима работы', patterns: [/4\s+режим[а-яё\s]+работ/u] },
  { label: '24-часовой таймер', patterns: [/24\s*час[а-яё]*\s+таймер/u, /24\s*-\s*часов[а-яё]+\s+таймер/u] },
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
  { label: 'не требует профессионального монтажа', patterns: [/не\s+нужда[а-яё]*\s+в\s+профессиональн[а-яё]*\s+монтаж/u, /без\s+сложн[а-яё]*\s+монтаж/u, /не\s+требу[а-яё]*\s+профессиональн[а-яё]*\s+монтаж/u] },
  { label: 'работает сразу после включения в сеть', patterns: [/(?:пользоваться\s+можно|работа[а-яё]*|работает)[а-яё\s]{0,60}(?:сразу|после)[а-яё\s]{0,40}включен[а-яё\s]+в\s+сеть/u] },
  { label: 'можно перемещать между комнатами', patterns: [/перемеща[а-яё]*\s+(?:между|из\s+одн[а-яё]+)[а-яё\s]{0,40}(?:комнат|помещ)/u, /можно\s+перемещ/u] },
  { label: 'мобильное использование', patterns: [/мобильн[а-яё]*\s+(?:использован|решени|кондиционер)/u] },
  { label: 'мобильность между помещениями', patterns: [/перемеща[а-яё]*\s+между\s+помещ/u, /можно\s+перемещ/u, /мобильн[а-яё]*\s+решени/u] },
  { label: 'охлаждение, обогрев, вентиляция и осушение', patterns: [/охлажда[а-яё]*,?\s+обогрева[а-яё]*,?\s+вентилиру[а-яё]*\s+и\s+осуша/u] },
  { label: 'охлаждение', patterns: [/охлаждени/u] },
  { label: 'обогрев', patterns: [/обогрев/u] },
  { label: 'вентиляция', patterns: [/вентиляц/u] },
  { label: 'осушение', patterns: [/осушени/u] },
  { label: 'SMART-режим', patterns: [/smart\s*-?\s*режим/u, /смарт\s*-?\s*режим/u] },
  { label: 'TURBO', patterns: [/\bturbo\b/u, /турбо/u] },
  { label: 'Auto Swing', patterns: [/auto\s*swing/u, /авто(?:матическ[а-яё]*)?\s+качани/u] },
  { label: 'Touch-панель', patterns: [/touch\s*-?\s*панел/u, /сенсорн[а-яё]*\s+панел/u] },
  { label: 'пульт в комплекте', patterns: [/пульт[^\n.]{0,80}комплект/u, /пду/u] },
  { label: 'текстильная панель / дизайн', patterns: [/текстильн[а-яё]*\s+панел/u, /дизайн/u] },
  { label: 'без воздуховода', patterns: [/без\s+воздуховод/u] },
  { label: '2 независимых вентилятора', patterns: [/2\s+независим[а-яё]*\s+вентилятор/u, /два\s+независим[а-яё]*\s+вентилятор/u] },
  { label: 'накопительный водонагреватель', patterns: [/накопительн[а-яё]*\s+водонагревател/u] },
  { label: 'проточный водонагреватель', patterns: [/проточн[а-яё]*\s+водонагревател/u] },
  { label: 'сухой ТЭН', patterns: [/сух[а-яё]*\s+т[эе]н/u] },
  { label: 'защита от перегрева', patterns: [/защит[а-яё]*\s+от\s+перегрев/u] },
  { label: 'защита от включения без воды', patterns: [/защит[а-яё]*\s+от\s+включени[а-яё]*\s+без\s+вод/u] },
  { label: 'магниевый анод', patterns: [/магниев[а-яё]*\s+анод/u] },
  { label: 'универсальный монтаж', patterns: [/универсальн[а-яё]*\s+монтаж/u, /вертикальн[а-яё]*\s*\/?\s*горизонтальн[а-яё]*\s+монтаж/u] },
];

const FEATURE_RULES = featurePatterns;

const FEATURE_PRIORITY = [
  'инверторная технология',
  'инверторный компрессор',
  'низкий уровень шума 40 дБ',
  'Wi-Fi управление',
  'управление со смартфона',
  'сенсорная Touch-панель',
  'точное поддержание температуры',
  'экономичное поддержание температуры',
  'тихая работа',
  'дополнительная шумоизоляция',
  'тангенциальный вентилятор снижает шум',
  'энергоэффективность A+',
  'энергопотребление менее 1 кВт/ч',
  'R290 эко-фреон',
  '4 режима работы',
  '24-часовой таймер',
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
  'не требует профессионального монтажа',
  'работает сразу после включения в сеть',
  'можно перемещать между комнатами',
  'мобильное использование',
  'мобильность между помещениями',
  'охлаждение, обогрев, вентиляция и осушение',
  'SMART-режим',
  'TURBO',
  'Auto Swing',
  'Touch-панель',
  'пульт в комплекте',
  'текстильная панель / дизайн',
  'без воздуховода',
  '2 независимых вентилятора',
  'накопительный водонагреватель',
  'проточный водонагреватель',
  'сухой ТЭН',
  'защита от перегрева',
  'защита от включения без воды',
  'магниевый анод',
  'универсальный монтаж',
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
  'площадь',
  'помещение',
  'холодопроизводительность',
  'производительность',
  'btu',
  'btu/h',
  'электропитание',
  'объем',
  'объём',
  'бак',
  'тэн',
  'тен',
  'анод',
  'защита',
  'ip',
  'давление',
  'монтаж',
  'подводка',
  'время нагрева',
  'водоразбор',
  'литр',
  'л',
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

const buildSourceTitle = (source = {}) => {
  const title = sanitizeAutoTextSegment(source.title, 160);

  if (title) {
    return title;
  }

  const brand = sanitizeAutoTextSegment(source.brand || 'Ballu', 80);
  const seriesName = sanitizeAutoTextSegment(source.seriesName, 90);

  return [brand, seriesName].filter(Boolean).join(' — ');
};

const buildSourceRef = (source) => [buildSourceTitle(source), sanitizeAutoTextSegment(source.sourceRef, 220)].filter(Boolean).join(' · ');

const formatPageRange = (pages = []) => {
  const numericPages = unique(pages.map((page) => Number(page)).filter((page) => Number.isFinite(page))).sort((a, b) => a - b);

  if (numericPages.length === 0) {
    return '';
  }

  const ranges = [];
  let start = numericPages[0];
  let previous = numericPages[0];

  for (const page of numericPages.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }

    ranges.push(start === previous ? String(start) : `${start}–${previous}`);
    start = page;
    previous = page;
  }

  ranges.push(start === previous ? String(start) : `${start}–${previous}`);
  return ranges.join(', ');
};

const buildTechnicalSourceRef = (source) => {
  const technicalPages = source?.technicalPages || source?.pageDiagnostics?.technicalPages || [];

  if (!technicalPages.length) {
    return '';
  }

  const pageRange = formatPageRange(technicalPages);
  const technicalPageRef = `PDF каталог ${source?.sourceDate || ''}, technicalPages: ${pageRange}`.replace(/\s+,/u, ',').trim();

  return [buildSourceTitle(source), technicalPageRef].filter(Boolean).join(' · ');
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

  return values.some((item) => isTechnicalFeature(String(item ?? '')) || hasAnyKeyword(String(item ?? ''), TECHNICAL_SPEC_KEYWORDS));
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
          ([field, value]) => !['sourceIds', 'sourceRefs', 'status', 'diagnostics'].includes(field) && hasDraftValue(value),
        )
        .map(([field, value]) => [field, shouldUseTechnicalSourceRef(field, value) && technicalSourceRef ? technicalSourceRef : sourceRef]),
    ),
  };
};


const getSourcePages = (source, field) => {
  const directPages = source?.[field];
  const diagnosticPages = source?.pageDiagnostics?.[field];

  return Array.isArray(directPages) ? directPages : Array.isArray(diagnosticPages) ? diagnosticPages : [];
};

const extractDiagnosticModelCodes = (source, draftCode = '') => {
  const rawText = [
    source?.exactSeriesRawText,
    source?.overviewRawText,
    source?.categorySummaryRawText,
    source?.summaryRawText,
    source?.serviceRawText,
    source?.technicalRawText,
    source?.rawText,
  ]
    .filter(Boolean)
    .join('\n');
  const matchedTokens = source?.pageDiagnostics?.matchedTokens || [];
  const normalizedDraftCode = normalizeSearchText(draftCode);
  const diagnosticCodes = (rawText.match(/\b[A-ZА-Я]{2,}[A-Z0-9А-Я/_-]{1,}(?:\s*\/\s*[A-ZА-Я]{2,}[A-Z0-9А-Я/_-]{1,})?\b/giu) || [])
    .filter((code) => {
      const normalizedCode = normalizeSearchText(code);

      return (
        normalizedDraftCode &&
        normalizedCode.startsWith(normalizedDraftCode) &&
        (normalizedCode.length === normalizedDraftCode.length || /[0-9\s/_-]/u.test(normalizedCode.at(normalizedDraftCode.length)))
      );
    });

  return unique([draftCode, ...matchedTokens, ...diagnosticCodes]
    .map((item) => String(item ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean));
};

const getDiagnosticsWarnings = ({ diagnostics, draft }) => [
  diagnostics.seriesName ? '' : 'Не определена серия.',
  diagnostics.brand ? '' : 'Не определён бренд.',
  diagnostics.descriptionPages.length > 0 || diagnostics.descriptionRawTextLength > 0 ? '' : 'Страницы описания серии не найдены.',
  diagnostics.technicalPages.length > 0 ? '' : 'technicalPages не найдены.',
  diagnostics.technicalRawTextLength > 0 ? '' : 'technicalRawText пустой.',
  diagnostics.modelCodes.length > 0 ? '' : 'Модели/коды не найдены.',
  diagnostics.salesFeatures.length > 0 ? '' : 'Продажные особенности не найдены.',
  diagnostics.technicalSpecs.length > 0 ? '' : 'Технические характеристики не найдены.',
  draft.shortDescription ? '' : 'Краткое описание не заполнено.',
  draft.positioning ? '' : 'Позиционирование не заполнено.',
].filter(Boolean);

const buildDraftDiagnostics = (source, draft) => {
  const technicalText = String(source?.technicalText ?? source?.technicalRawText ?? '');
  const descriptionRawText = String(source?.exactSeriesRawText ?? source?.exactSeriesText ?? source?.overviewRawText ?? source?.categorySummaryRawText ?? source?.summaryRawText ?? source?.summaryText ?? '');
  const descriptionPages = unique([
    ...getSourcePages(source, 'exactSeriesPages'),
    ...getSourcePages(source, 'overviewPages'),
    ...getSourcePages(source, 'categorySummaryPages'),
  ]);
  const diagnostics = {
    seriesName: draft.seriesName || source?.seriesName || '',
    brand: draft.brand || source?.brand || '',
    descriptionPages,
    technicalPages: getSourcePages(source, 'technicalPages'),
    technicalRawTextLength: technicalText.length,
    descriptionRawTextLength: descriptionRawText.length,
    modelCodes: extractDiagnosticModelCodes(source, draft.code || source?.code || ''),
    salesFeatures: draft.salesFeatures || [],
    technicalSpecs: draft.technicalSpecs || [],
  };

  return {
    ...diagnostics,
    warnings: unique([
      ...(source?.pageDiagnostics?.warnings || []),
      ...getDiagnosticsWarnings({ diagnostics, draft }),
    ]),
  };
};

const normalizeLine = (line = '') => String(line ?? '').trim().replace(/^[-–—•*\d.)\s]+/, '').trim();

const normalizeText = (value = '') => String(value ?? '').toLocaleLowerCase('ru-RU');

const normalizeSearchText = (value = '') =>
  normalizeText(value)
    .replace(/ё/g, 'е')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/°\s*c/g, '°c')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value = '') => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasExactPhrase = (text = '', phrase = '') => {
  const trimmedPhrase = String(phrase ?? '').trim();

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
  const rawText = String(source?.exactSeriesRawText ?? source?.overviewRawText ?? source?.rawText ?? '');

  if (!profile || !rawText) {
    return;
  }

  const otherMarkers = getOtherSeriesMarkers(rawText, profile);

  if (otherMarkers.length > 0 && !hasExactPhrase(rawText, profile.code)) {
    throw new Error('Найден текст другой серии. Карточка не создана.');
  }
};

const normalizeSeriesName = (seriesName = '') => normalizeText(String(seriesName ?? '').trim());

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


const CATEGORY_EXTRACTION_PROFILES = {
  inverterSplit: {
    id: 'inverterSplit',
    categoryMatchers: [/dc-?инверторн[а-яё\s-]*сплит-систем/u, /инверторн[а-яё\s-]*сплит-систем/u],
    codeMatchers: [/\b(?:BSPKI|BSNI|BSHI|BSPI|BSYI|BSOI|BSTI|BSDI|BSVI)\b/iu],
    featureAllow: [
      /inverter|инвертор/u, /seer|scop|eer|cop|энергоэффектив/u, /шум/u, /обогрев\s+до|теплов[а-яё\s]*насос/u,
      /wi-?fi|hommyn|голосов/u, /3d/u, /i-?feel/u, /smart\s*sens/u, /самоочист/u, /фильтр|uv|уф|health|ионизац/u,
      /r\s*32/u, /golden|blue\s*fin|покрыт/u, /гарант/u, /скорост/u, /стабильн[а-яё\s]*работ[а-яё\s]*на\s+обогрев/u,
    ],
    importantSpecKeywords: ['производительность', 'охлаждение', 'обогрев', 'класс энергоэффективности', 'seer', 'scop', 'eer', 'cop', 'расход воздуха', 'уровень шума', 'потребляемая мощность', 'габарит', 'размер', 'вес', 'хладагент', 'температур', 'длина трассы', 'перепад высот'],
    arguments: [
      { text: 'экономия электроэнергии за счёт инверторного управления', requires: [/инвертор|inverter/u] },
      { text: 'точное поддержание температуры без резких перепадов', requires: [/инвертор|inverter/u] },
      { text: 'низкий уровень шума для комфортного ежедневного использования', requires: [/шум/u] },
      { text: 'работа на обогрев зимой или в межсезонье', requires: [/обогрев/u] },
      { text: 'удалённое управление через Wi‑Fi / Hommyn', requires: [/wi-?fi|hommyn/u] },
      { text: 'дополнительная забота о чистоте воздуха за счёт фильтрации или самоочистки', requires: [/фильтр|самоочист|uv|уф|ионизац|health/u] },
    ],
  },
  onOffSplit: {
    id: 'onOffSplit',
    categoryMatchers: [/сплит-системы\s+on\/?off/u],
    codeMatchers: [/\b(?:BSO|BSW|BST|BSD|BSV|BSQ)\b/iu],
    featureAllow: [/on\/?off/u, /энергоэффектив|eer|cop|класс/u, /wi-?fi|hommyn/u, /3d/u, /i-?feel/u, /golden|blue\s*fin|покрыт/u, /утечк[а-яё]*\s+фреон/u, /памят/u, /шум/u, /обогрев/u, /r\s*32|хладагент/u],
    importantSpecKeywords: ['производительность', 'охлаждение', 'обогрев', 'класс энергоэффективности', 'расход воздуха', 'уровень шума', 'потребляемая мощность', 'габарит', 'размер', 'вес', 'хладагент', 'температур', 'длина трассы', 'перепад высот'],
    arguments: [
      { text: 'доступное решение для охлаждения квартиры, офиса или дачи' },
      { text: 'простая и понятная ON/OFF-конструкция', requires: [/on\/?off/u] },
      { text: 'базовая энергоэффективность класса A', requires: [/энергоэффектив|\bа\b|\ba\b/u] },
      { text: 'полезные комфортные функции: Wi‑Fi, i-FEEL, 3D-поток или защитное покрытие — если они есть в выбранной модели', requires: [/wi-?fi|i-?feel|3d|golden|blue/u] },
      { text: 'хороший вариант для квартиры, офиса или дачи' },
    ],
  },
  mobileAirConditioner: {
    id: 'mobileAirConditioner',
    categoryMatchers: [/бытов[а-яё\s]*мобильн[а-яё\s]*кондиционер/u, /мобильн[а-яё\s]*кондиционер/u],
    codeMatchers: [/\b(?:BPAC|BPHS)(?:[\s_-]*[A-Z0-9]+)*\b/iu],
    featureAllow: [/инвертор|компрессор/u, /точн[а-яё]*\s+поддержан|экономичн[а-яё]*\s+поддержан/u, /тих|шумоизоляц|шум|40\s*дб|тангенциальн/u, /управлен|смартфон|wi-?fi|touch|сенсорн|пульт/u, /энергоэффектив|класс|энергопотреблен/u, /хладагент|r\s*32|r\s*290|эко-?фреон/u, /режим|таймер/u, /мобильн|монтаж|перемещ|установк|включен/u, /охлажд/u, /обогрев/u, /вентиляц/u, /осуш/u, /площад/u, /холодопроизводительность|btu/u, /smart/u, /turbo/u, /auto\s*swing/u, /текстильн|дизайн/u, /без\s+воздуховод/u, /температур/u, /2\s+независим/u, /расход воздуха/u],
    importantSpecKeywords: ['холодопроизводительность', 'btu', 'класс энергоэффективности', 'хладагент', 'r290', 'r32', 'расход воздуха', 'уровень шума', 'потребляемая мощность', 'номинальный ток', 'электропитание', 'напряжение питания', 'габарит', 'размер', 'вес', 'нетто', 'брутто', 'площадь'],
    arguments: [
      { text: 'не требует профессионального монтажа', requires: [/монтаж/u] },
      { text: 'можно перемещать между комнатами', requires: [/перемещ|мобильн/u] },
      { text: 'подходит для аренды, дачи или временного офиса' },
      { text: 'быстрое охлаждение помещения', requires: [/охлажд/u] },
      { text: 'дополнительные режимы обогрева, осушения или вентиляции расширяют сценарии использования', requires: [/обогрев|осуш|вентиляц/u] },
      { text: 'пульт, Auto Swing, SMART/TURBO или Wi‑Fi делают управление удобнее', requires: [/пульт|auto\s*swing|smart|turbo|wi-?fi/u] },
    ],
  },
  waterHeater: {
    id: 'waterHeater',
    categoryMatchers: [/водонагревател/u, /горяч[а-яё\s]*водоснабжен/u],
    codeMatchers: [],
    featureAllow: [/накопительн|проточн/u, /объ[её]м|литр|\bл\b/u, /мощность|квт/u, /время\s+нагрев/u, /водоразбор|пользовател/u, /т[эе]н/u, /бак|покрыти/u, /анод|антикорроз/u, /защит/u, /узо/u, /ip/u, /давлен/u, /режим/u, /управлен|wi-?fi/u, /монтаж|вертикальн|горизонтальн/u, /подводк/u, /габарит|вес/u, /гарант/u],
    importantSpecKeywords: ['объем', 'объём', 'л', 'мощность', 'квт', 'время нагрева', 'тэн', 'тен', 'бак', 'покрытие', 'анод', 'защита', 'узо', 'ip', 'давление', 'режим', 'управление', 'монтаж', 'подводка', 'габарит', 'размер', 'вес', 'гарантия'],
    arguments: [
      { text: 'горячая вода независимо от сезонных отключений' },
      { text: 'понятный подбор по объёму под количество пользователей', requires: [/объ[её]м|литр|\bл\b/u] },
      { text: 'защитные функции повышают безопасность эксплуатации', requires: [/защит|узо|ip/u] },
      { text: 'защита бака помогает продлить срок службы', requires: [/бак|анод|антикорроз/u] },
      { text: 'варианты монтажа упрощают установку в квартире, доме или на даче', requires: [/монтаж|вертикальн|горизонтальн/u] },
      { text: 'режимы мощности помогают управлять энергопотреблением', requires: [/режим|мощность/u] },
    ],
  },
};

const getCategoryProfile = ({ approvedProfile = {}, source = {}, sourceText = '' } = {}) => {
  const haystack = normalizeSearchText([
    approvedProfile.category, approvedProfile.group, approvedProfile.code, approvedProfile.seriesName,
    source.category, source.group, source.code, source.seriesName, sourceText,
  ].filter(Boolean).join(' '));

  return Object.values(CATEGORY_EXTRACTION_PROFILES).find((profile) =>
    [...profile.categoryMatchers, ...profile.codeMatchers].some((pattern) => pattern.test(haystack)),
  ) || null;
};

export const getCategoryExtractionProfile = (input = {}) => getCategoryProfile({
  approvedProfile: input.approvedProfile || input.profile || input,
  source: input.source || input,
  sourceText: input.sourceText || input.rawText || '',
});

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
  const normalizedText = String(text ?? '').replace(/[‐‑‒–—−]/gu, '-');
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
  const normalizedText = String(text ?? '').replace(/,/gu, '.');

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
  String(value ?? '')
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
  String(value ?? '')
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
  const sourceText = String(text ?? '');

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
  const sourceText = String(text ?? '');

  for (const match of sourceText.matchAll(/(?:^|[^A-ZА-ЯЁ\/])([AА]\s*\+{1,3})(?=$|[^A-ZА-ЯЁ+\/])/giu)) {
    const value = normalizeEnergyClassDisplayValue(match[1]);

    if (/^A\+{1,3}$/u.test(getEnergyClassComparisonKey(value))) {
      values.push(value);
    }
  }

  return uniqueEnergyClassValues(values);
};

const formatEnergyClassFeature = (values = []) => {
  if (values.length === 0) {
    return '';
  }

  return values.length === 1 ? values[0] : `${values[0]} → ${values[values.length - 1]}`;
};

const ENERGY_CLASS_ROW_MARKER = /класс\s+энергоэффективности\s*\(\s*eer\s*\/\s*cop\s*\)/iu;
const ENERGY_CLASS_SEGMENT_MAX_LENGTH = 360;
const ENERGY_CLASS_NEXT_ROW_MARKERS = [
  'Расход воздуха',
  'Уровень шума',
  'Напряжение питания',
  'Потребляемая мощность',
  'Номинальный ток',
  'Размер',
  'Вес',
  'Диаметр труб',
  'Максимальная длина',
  'Хладагент',
  'Диапазон рабочих температур',
  'Марка компрессора',
  'SEER',
  'SCOP',
];
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const ENERGY_CLASS_NEXT_ROW_MARKER = new RegExp(
  ENERGY_CLASS_NEXT_ROW_MARKERS.map((marker) => escapeRegex(marker).replace(/\s+/gu, '\\s+')).join('|'),
  'iu',
);

const buildEnergyClassDecision = (values = [], reasonPrefix = 'accepted') => {
  const valueCount = values.length;

  if (valueCount === 0) {
    return { value: '', reason: `${reasonPrefix}: no energy class values`, ambiguous: false };
  }

  return { value: formatEnergyClassFeature(values), reason: `${reasonPrefix}: ${valueCount} distinct value(s) in strict energy row`, ambiguous: false };
};

export const diagnoseEnergyClass = (technicalText = '') => {
  const normalizedText = String(technicalText ?? '').replace(/[‐‑‒–—−]/gu, '-');
  const sourceSegment = normalizedText;
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

export const getEnergyClassSegment = (text = '') => diagnoseEnergyClass(text).segment;

const limitEnergyClassSegment = getEnergyClassSegment;

const extractEnergyClassFeatureValues = (feature = '') => {
  const normalizedFeature = String(feature ?? '')
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

  const normalizedFeature = String(feature ?? '')
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

const isMobileAirConditionerProfile = (categoryProfile = null) => categoryProfile?.id === 'mobileAirConditioner';

const shouldKeepDescriptionFeature = (feature = '', categoryProfile = null) => (
  !isTechnicalFeature(feature) ||
  (isMobileAirConditionerProfile(categoryProfile) && /энергоэффектив|r\s*290|эко-?фреон|40\s*дб/u.test(normalizeSearchText(feature)))
);

const sanitizeCategoryFeatureClasses = (features = [], technicalText = '', categoryProfile = null) => {
  if (isMobileAirConditionerProfile(categoryProfile)) {
    return unique(features);
  }

  return sanitizeEnergyClasses(features, technicalText);
};

const buildSalesFeatureList = ({ exactSeriesText = '', technicalText = '', summaryText = '', serviceText = '', seriesName = '', code = '', hasExactSeriesPages = false, hasTechnicalTable = false, categoryProfile = null }) => {
  const isCategorySummaryAllowed = categoryProfile?.id === 'mobileAirConditioner' || categoryProfile?.id === 'waterHeater';

  if (!hasExactSeriesPages && !isCategorySummaryAllowed) {
    return [];
  }

  const exactSeriesFeatures = hasExactSeriesPages
    ? extractFeatureList(exactSeriesText, seriesName).filter((feature) => shouldKeepDescriptionFeature(feature, categoryProfile))
    : [];
  const summaryFeatures = isCategorySummaryAllowed
    ? extractFeatureList(summaryText, seriesName).filter((feature) => shouldKeepDescriptionFeature(feature, categoryProfile))
    : [];
  const auxiliaryWifiFeatures = [
    ...extractAuxiliaryWifiFeature(summaryText, seriesName, code),
    ...extractAuxiliaryWifiFeature(serviceText, seriesName, code),
  ];
  const technicalFeatures = hasTechnicalTable
    ? extractFeatureList(technicalText, seriesName).filter((feature) => isMobileAirConditionerProfile(categoryProfile) ? false : isTechnicalFeature(feature))
    : [];

  return sanitizeCategoryFeatureClasses(
    filterCategoryFeatures(sortSalesFeatures(unique([...exactSeriesFeatures, ...summaryFeatures, ...auxiliaryWifiFeatures, ...technicalFeatures])), categoryProfile),
    technicalText,
    categoryProfile,
  );
};

const extractProfileKeyFeatures = (profile, rawText = '', technicalRawText = '') => {
  const salesFeatureList = extractFeatureList(rawText, profile.name).filter((feature) => !isTechnicalFeature(feature));
  const technicalFeatureList = extractFeatureList(technicalRawText, profile.name).filter(isTechnicalFeature);
  const featureList = unique([...salesFeatureList, ...technicalFeatureList]);

  if (featureList.length === 0) {
    const fallbackFeatures = profile.fallbackSalesFeatures || profile.mainAdvantages || [];

    return String(technicalRawText ?? '').trim()
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

const hasFeatureMatching = (features = [], pattern) => features.some((feature) => pattern.test(normalizeSearchText(feature)));

const pickMobileAirConditionerMainAdvantages = (features = []) => {
  const featureList = unique(features);
  const selected = [];

  if (hasFeatureMatching(featureList, /инверторн[а-я]*\s+технолог|инвертор/u)) {
    selected.push('инверторная технология');
  }

  if (hasFeatureMatching(featureList, /40\s*дб|низк[а-я]*\s+уров[а-я]*\s+шума\s+40/u)) {
    selected.push('низкий уровень шума 40 дБ');
  }

  if (hasFeatureMatching(featureList, /wi-?fi|смартфон/u)) {
    selected.push('Wi-Fi управление со смартфона');
  }

  if (hasFeatureMatching(featureList, /энергоэффективност[а-я]*\s*a\+|\ba\+\b/u)) {
    selected.push('энергоэффективность A+');
  }

  if (hasFeatureMatching(featureList, /r\s*290|эко-?фреон/u)) {
    selected.push('R290 эко-фреон');
  }

  if (hasFeatureMatching(featureList, /монтаж|установк/u)) {
    selected.push('не требует профессионального монтажа');
  }

  if (hasFeatureMatching(featureList, /перемещ|мобильн/u)) {
    selected.push('можно перемещать между комнатами');
  }

  if (hasFeatureMatching(featureList, /4\s+режим/u)) {
    selected.push('4 режима работы');
  }

  if (hasFeatureMatching(featureList, /24-?час|24\s+час|таймер/u)) {
    selected.push('24-часовой таймер');
  }

  const advantages = unique([...selected, ...featureList.filter((feature) => !/touch|сенсорн|охлаждение$/u.test(normalizeSearchText(feature)))]);

  if (advantages.length > MAX_MAIN_ADVANTAGES && advantages.includes('24-часовой таймер') && advantages.includes('4 режима работы')) {
    return advantages.filter((feature) => feature !== '4 режима работы').slice(0, MAX_MAIN_ADVANTAGES);
  }

  return advantages.slice(0, MAX_MAIN_ADVANTAGES);
};

const pickCategoryMainAdvantages = (features = [], fallback = [], categoryProfile = null) => {
  if (isMobileAirConditionerProfile(categoryProfile)) {
    return pickMobileAirConditionerMainAdvantages(features);
  }

  return pickMainAdvantages(features, fallback);
};

const normalizeTechnicalSpecLine = (line = '') => {
  const normalizedLine = normalizeLine(line);

  return ENERGY_CLASS_ROW_MARKER.test(normalizedLine) ? limitEnergyClassSegment(normalizedLine) : normalizedLine;
};

const extractTechnicalSpecs = (rawText = '') =>
  unique(
    String(rawText ?? '')
      .split(/\r?\n/)
      .map(normalizeTechnicalSpecLine)
      .filter(Boolean)
      .filter((line) => hasAnyKeyword(line, TECHNICAL_SPEC_KEYWORDS)),
  );


const matchesAnyProfilePattern = (value = '', patterns = []) => {
  const normalizedValue = normalizeSearchText(value);

  return patterns.some((pattern) => pattern.test(normalizedValue));
};

const filterCategoryFeatures = (features = [], categoryProfile = null) => {
  if (!categoryProfile) {
    return features;
  }

  return features.filter((feature) => matchesAnyProfilePattern(feature, categoryProfile.featureAllow) || isTechnicalFeature(feature));
};

const extractCategoryImportantSpecs = (rawText = '', categoryProfile = null) => {
  if (!categoryProfile) {
    return extractTechnicalSpecs(rawText);
  }

  return unique(
    String(rawText ?? '')
      .split(/\r?\n/)
      .map(normalizeTechnicalSpecLine)
      .filter(Boolean)
      .filter((line) => hasAnyKeyword(line, categoryProfile.importantSpecKeywords || TECHNICAL_SPEC_KEYWORDS)),
  );
};

const buildCategorySalesArguments = ({ categoryProfile = null, salesFeatures = [], importantSpecs = [], sourceText = '' } = {}) => {
  if (!categoryProfile) {
    return [];
  }

  const haystack = normalizeSearchText([...salesFeatures, ...importantSpecs, sourceText].join(' '));

  return categoryProfile.arguments
    .filter((argument) => !argument.requires || argument.requires.some((pattern) => pattern.test(haystack)))
    .map((argument) => argument.text)
    .slice(0, 6);
};

const buildCategoryPositioning = ({ categoryProfile = null, approvedProfile = {}, seriesName = '' } = {}) => {
  const cleanSeriesName = sanitizeAutoTextSegment(seriesName || approvedProfile.seriesName, 90);

  if (!categoryProfile || !cleanSeriesName) {
    return '';
  }

  if (categoryProfile.id === 'mobileAirConditioner') {
    const hasInverter = hasFeatureMatching([...(approvedProfile?.salesFeatures || []), cleanSeriesName], /инвертор|inverter/u);
    const solution = hasInverter ? 'мобильное инверторное решение' : 'мобильное решение';
    const conditioner = hasInverter ? 'тихий кондиционер' : 'кондиционер';

    return `${cleanSeriesName} — ${solution} для квартиры, дома, офиса или дачи, когда нужен ${conditioner} без установки классической сплит-системы.`;
  }

  if (categoryProfile.id === 'waterHeater') {
    return `${cleanSeriesName} — решение для резервного или постоянного горячего водоснабжения, когда важны надёжность, безопасность и понятный подбор по объёму.`;
  }

  return '';
};

const buildCategoryShortDescription = ({ categoryProfile = null, approvedProfile = {}, seriesName = '', salesFeatures = [], keyFeatures = [], importantSpecs = [] } = {}) => {
  const cleanSeriesName = sanitizeAutoTextSegment(seriesName || approvedProfile.seriesName, 90);
  const allFeatures = getAutoFeatureCandidates({ salesFeatures, keyFeatures });
  const features = allFeatures.slice(0, 5);

  if (!categoryProfile || !cleanSeriesName) {
    return '';
  }

  if (categoryProfile.id === 'mobileAirConditioner') {
    if (allFeatures.length === 0) return '';

    const hasInverter = hasFeatureMatching(allFeatures, /инвертор/u);
    const hasNoise40 = hasFeatureMatching(allFeatures, /40\s*дб/u);
    const hasSmartphone = hasFeatureMatching(allFeatures, /wi-?fi|смартфон/u);
    const hasEnergyAPlus = hasFeatureMatching(allFeatures, /энергоэффективност[а-я]*\s*a\+/u);
    const hasR290 = hasFeatureMatching(allFeatures, /r\s*290|эко-?фреон/u);
    const hasModes = hasFeatureMatching(allFeatures, /режим|таймер|охлажд|обогрев|вентиляц|осуш/u);
    const intro = hasInverter
      ? `${cleanSeriesName} — мобильный инверторный кондиционер Ballu для точного и экономичного поддержания комфортной температуры без сложного монтажа.`
      : `${cleanSeriesName} — мобильный кондиционер Ballu для быстрого создания комфорта без сложного монтажа.`;
    const accents = [
      hasNoise40 ? 'тихой работе до 40 дБ' : '',
      hasSmartphone ? 'управлении со смартфона' : '',
      hasEnergyAPlus ? 'энергоэффективности A+' : '',
      hasR290 ? 'R290' : '',
      hasModes ? 'удобных режимах работы' : '',
    ].filter(Boolean);

    if (accents.length > 0) {
      return trimToSentence(`${intro} Серия делает акцент на ${joinRussianList(accents)}.`);
    }

    return trimToSentence(`${intro} Ключевые особенности: ${joinRussianList(features)}.`);
  }

  if (categoryProfile.id === 'waterHeater') {
    const accents = unique([...features, ...importantSpecs.map((line) => sanitizeAutoTextSegment(line, 80)).filter(Boolean)]).slice(0, 4);
    if (accents.length === 0) return '';
    return trimToSentence(`${cleanSeriesName} — водонагреватель Ballu для стабильного горячего водоснабжения в квартире, доме или на даче. Серия делает акцент на ${joinRussianList(accents)}.`);
  }

  return '';
};

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
  const normalizedText = String(text ?? '').replace(/\s+/g, ' ').trim();

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
  const exactSeriesText = String(source.exactSeriesRawText ?? source.exactSeriesText ?? source.overviewRawText ?? '');
  const categorySummaryText = String(source.categorySummaryRawText ?? source.categorySummaryText ?? source.summaryRawText ?? source.summaryText ?? '');
  const technicalText = String(source.technicalRawText ?? source.technicalText ?? '');
  const serviceText = String(source.serviceRawText ?? source.serviceText ?? '');

  return {
    exactSeriesText,
    exactSeriesRawText: exactSeriesText,
    categorySummaryText,
    categorySummaryRawText: categorySummaryText,
    summaryText: categorySummaryText,
    technicalText,
    technicalRawText: technicalText,
    serviceText,
    serviceRawText: serviceText,
    hasExactSeriesPages: exactSeriesText.trim().length > 0,
    hasTechnicalTable: technicalText.trim().length > 0,
  };
};


const MAX_AUTO_FEATURE_LENGTH = 70;
const MAX_AUTO_POSITIONING_FEATURES = 3;
const MAX_AUTO_DESCRIPTION_FEATURES = 6;
const MIN_AUTO_DESCRIPTION_FEATURES = 4;

const sanitizeAutoTextSegment = (value = '', maxLength = MAX_AUTO_FEATURE_LENGTH) => {
  if (value === null || value === undefined || typeof value === 'object') {
    return '';
  }

  const normalizedValue = String(value)
    .replace(/\s+/g, ' ')
    .replace(/^[,;:—–\-\s]+|[,;:—–\-\s]+$/gu, '')
    .trim();

  if (!normalizedValue || /^\[object\s+object\]$/iu.test(normalizedValue)) {
    return '';
  }

  return normalizedValue.length <= maxLength ? normalizedValue : '';
};

const getAutoFeatureCandidates = ({ salesFeatures = [], technicalFeatures = [], keyFeatures = [] }, { includeEnergy = true } = {}) => {
  const orderedFeatures = [
    ...keyFeatures,
    ...salesFeatures,
    ...technicalFeatures,
  ];

  return unique(
    orderedFeatures
      .map((feature) => sanitizeAutoTextSegment(feature))
      .filter(Boolean)
      .filter((feature) => includeEnergy || !isEnergyClassFeature(feature)),
  );
};

const getAutoProfileGroup = (approvedProfile = {}) => {
  const group = sanitizeAutoTextSegment(approvedProfile.group, 90);
  const category = sanitizeAutoTextSegment(approvedProfile.category, 90);
  const normalizedGroup = normalizeSearchText(group);

  if (/сплит-системы\s+on\/off/u.test(normalizedGroup)) {
    return 'сплит-систем Ballu ON/OFF';
  }

  if (/dc-инверторные\s+сплит-системы/u.test(normalizedGroup)) {
    return 'DC-инверторных сплит-систем Ballu';
  }

  if (/бытовые\s+мобильные\s+кондиционеры/u.test(normalizedGroup)) {
    return 'бытовых мобильных кондиционеров Ballu';
  }

  if (/промышленные\s+мобильные\s+кондиционеры/u.test(normalizedGroup)) {
    return 'промышленных мобильных кондиционеров Ballu';
  }

  if (group) {
    return `${group.toLocaleLowerCase('ru-RU')} Ballu`;
  }

  return category ? `${category.toLocaleLowerCase('ru-RU')} Ballu` : 'климатической техники Ballu';
};

const joinRussianList = (items = []) => {
  const cleanItems = items.map((item) => sanitizeAutoTextSegment(item)).filter(Boolean);

  if (cleanItems.length <= 2) {
    return cleanItems.join(' и ');
  }

  return `${cleanItems.slice(0, -1).join(', ')} и ${cleanItems.at(-1)}`;
};

const buildAutoPositioning = ({ approvedProfile, salesFeatures = [], technicalFeatures = [], keyFeatures = [] }) => {
  const seriesName = sanitizeAutoTextSegment(approvedProfile?.seriesName, 90);
  const features = getAutoFeatureCandidates(
    { salesFeatures, technicalFeatures, keyFeatures },
    { includeEnergy: false },
  ).slice(0, MAX_AUTO_POSITIONING_FEATURES);

  if (!seriesName || features.length === 0) {
    return '';
  }

  return trimToSentence(
    `${seriesName} — серия ${getAutoProfileGroup(approvedProfile)} для бытового комфорта с акцентом на ${joinRussianList(features)}.`,
    260,
  );
};

const buildAutoShortDescription = ({ approvedProfile, salesFeatures = [], technicalFeatures = [], keyFeatures = [] }) => {
  const seriesName = sanitizeAutoTextSegment(approvedProfile?.seriesName, 90);
  const group = getAutoProfileGroup(approvedProfile);
  const features = getAutoFeatureCandidates({ salesFeatures, technicalFeatures, keyFeatures })
    .sort((left, right) => Number(isEnergyClassFeature(left)) - Number(isEnergyClassFeature(right)))
    .slice(0, MAX_AUTO_DESCRIPTION_FEATURES);

  if (!seriesName || features.length === 0) {
    return '';
  }

  const featureLimit = Math.max(Math.min(features.length, MAX_AUTO_DESCRIPTION_FEATURES), Math.min(features.length, MIN_AUTO_DESCRIPTION_FEATURES));
  const selectedFeatures = features.slice(0, featureLimit);

  return trimToSentence(
    `${seriesName} — серия ${group} для квартиры, дома или офиса. Серия делает акцент на ежедневном охлаждении и обогреве, удобном управлении и комфорте: ${joinRussianList(selectedFeatures)}.`,
  );
};

const buildProfileDraft = (source, approvedProfile, legacyProfile = null) => {
  const { exactSeriesText, technicalText, summaryText, serviceText, hasExactSeriesPages, hasTechnicalTable } = getIsolatedSourceTexts(source);
  const seriesName = approvedProfile.seriesName;
  const categoryProfile = getCategoryProfile({ approvedProfile, source, sourceText: [exactSeriesText, summaryText, technicalText].join(' ') });
  const hasEnoughDescriptionSource = hasExactSeriesPages || ((categoryProfile?.id === 'mobileAirConditioner' || categoryProfile?.id === 'waterHeater') && (summaryText.trim() || technicalText.trim()));
  const salesFeatures = buildSalesFeatureList({
    exactSeriesText,
    technicalText,
    summaryText,
    serviceText,
    seriesName,
    code: approvedProfile.code,
    hasExactSeriesPages,
    hasTechnicalTable,
    categoryProfile,
  });
  const technicalFeatures = sanitizeEnergyClasses(
    hasTechnicalTable ? extractFeatureList(technicalText, seriesName).filter(isTechnicalFeature) : [],
    technicalText,
  );
  const keyFeatures = sanitizeCategoryFeatureClasses(sortFeaturesByPriority(unique([...salesFeatures, ...technicalFeatures])), technicalText, categoryProfile);
  const mainAdvantages = pickCategoryMainAdvantages(
    isMobileAirConditionerProfile(categoryProfile) ? salesFeatures : salesFeatures.filter((feature) => !isEnergyClassFeature(feature)),
    legacyProfile?.mainAdvantages?.filter((feature) => !isEnergyClassFeature(feature)) || [],
    categoryProfile,
  ).filter((feature) => isMobileAirConditionerProfile(categoryProfile) || !isEnergyClassFeature(feature));
  const technicalSpecs = hasTechnicalTable ? extractCategoryImportantSpecs(technicalText, categoryProfile) : [];
  const importantSpecs = sanitizeCategoryFeatureClasses(unique([...salesFeatures, ...technicalSpecs]), technicalText, categoryProfile);
  const draftWarning = buildDraftWarning({
    hasExactSeriesPages: hasEnoughDescriptionSource,
    hasTechnicalTable,
  });
  const legacyShortDescription = trimToSentence(legacyProfile?.shortDescription);
  const legacyPositioning = sanitizeAutoTextSegment(legacyProfile?.positioning, 260);
  const autoDescriptionContext = { approvedProfile, salesFeatures, technicalFeatures, keyFeatures };
  const categoryDescriptionContext = { categoryProfile, approvedProfile, seriesName, salesFeatures, keyFeatures, importantSpecs };
  const categoryShortDescription = buildCategoryShortDescription(categoryDescriptionContext);
  const categoryPositioning = buildCategoryPositioning(categoryDescriptionContext);
  const categorySalesArguments = buildCategorySalesArguments({ categoryProfile, salesFeatures, importantSpecs, sourceText: [exactSeriesText, summaryText, technicalText].join(' ') });

  const draft = {
    profileId: approvedProfile.id,
    profileStatus: approvedProfile.profileStatus,
    draftWarning,
    brand: approvedProfile.brand,
    category: approvedProfile.category,
    group: approvedProfile.group,
    code: approvedProfile.code,
    seriesName,
    shortDescription: legacyShortDescription || categoryShortDescription || (hasEnoughDescriptionSource ? buildAutoShortDescription(autoDescriptionContext) : ''),
    positioning: legacyPositioning || categoryPositioning || (hasEnoughDescriptionSource ? buildAutoPositioning(autoDescriptionContext) : ''),
    targetClient: legacyProfile?.targetClient || [],
    mainSalesIdea: legacyProfile?.mainSalesIdea || '',
    keyFeatures,
    salesFeatures,
    mainAdvantages,
    salesArguments: legacyProfile?.salesArguments || categorySalesArguments,
    clientSpeech: legacyProfile?.clientSpeech || '',
    differences: '',
    whenRecommend: legacyProfile?.whenRecommend || [],
    whenNotRecommend: legacyProfile?.whenNotRecommend || [],
    objections: [],
    technicalSpecs,
    importantSpecs,
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  };

  return attachSourceRefs({
    ...draft,
    diagnostics: buildDraftDiagnostics(source, draft),
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
  const categoryProfile = getCategoryProfile({ approvedProfile: source, source, sourceText: [exactSeriesText, summaryText, technicalText].join(' ') });
  const hasEnoughDescriptionSource = hasExactSeriesPages || ((categoryProfile?.id === 'mobileAirConditioner' || categoryProfile?.id === 'waterHeater') && (summaryText.trim() || technicalText.trim()));
  const salesFeatures = buildSalesFeatureList({
    exactSeriesText,
    technicalText,
    summaryText,
    serviceText,
    seriesName: source.seriesName,
    code: source.code,
    hasExactSeriesPages,
    hasTechnicalTable,
    categoryProfile,
  });
  const technicalFeatures = sanitizeEnergyClasses(
    hasTechnicalTable ? extractFeatureList(technicalText, source.seriesName).filter(isTechnicalFeature) : [],
    technicalText,
  );
  const keyFeatures = sanitizeCategoryFeatureClasses(sortFeaturesByPriority(unique([...salesFeatures, ...technicalFeatures])), technicalText, categoryProfile);
  const technicalSpecs = hasTechnicalTable ? extractCategoryImportantSpecs(technicalText, categoryProfile) : [];
  const importantSpecs = sanitizeCategoryFeatureClasses(unique([...salesFeatures, ...technicalSpecs]), technicalText, categoryProfile);
  const categoryDescriptionContext = { categoryProfile, approvedProfile: source, seriesName: source.seriesName, salesFeatures, keyFeatures, importantSpecs };
  const categorySalesArguments = buildCategorySalesArguments({ categoryProfile, salesFeatures, importantSpecs, sourceText: [exactSeriesText, summaryText, technicalText].join(' ') });

  const draft = {
    profileId: source.profileId || '',
    profileStatus: 'unknown',
    draftWarning: buildDraftWarning({
      hasExactSeriesPages: hasEnoughDescriptionSource,
      hasTechnicalTable,
      prefix: 'Серия не найдена в утверждённом справочнике Ballu 2026. Проверьте серию вручную: продажное позиционирование не заполнено автоматически.',
    }),
    brand: source.brand || '',
    category: source.category || '',
    group: source.group || '',
    code: source.code || '',
    seriesName: source.seriesName || '',
    shortDescription: buildCategoryShortDescription(categoryDescriptionContext),
    positioning: buildCategoryPositioning(categoryDescriptionContext),
    targetClient: [],
    mainSalesIdea: '',
    keyFeatures,
    salesFeatures,
    mainAdvantages: pickCategoryMainAdvantages(
      isMobileAirConditionerProfile(categoryProfile) ? salesFeatures : salesFeatures.filter((feature) => !isEnergyClassFeature(feature)),
      [],
      categoryProfile,
    ),
    salesArguments: categorySalesArguments,
    clientSpeech: '',
    differences: '',
    whenRecommend: [],
    whenNotRecommend: [],
    objections: [],
    technicalSpecs,
    importantSpecs,
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  };

  return attachSourceRefs({
    ...draft,
    diagnostics: buildDraftDiagnostics(source, draft),
  }, source);
};
