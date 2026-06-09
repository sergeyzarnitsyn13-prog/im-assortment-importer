const FEATURE_KEYWORDS = [
  'Wi-Fi',
  'инвертор',
  'обогрев',
  'ионизация',
  'самоочистка',
  'фильтр',
  'шум',
  'R32',
  'датчик',
  '3D',
  'Golden Fin',
  'УФ',
  'тепловой насос',
  'Health Guard',
  'Smart Sens',
];

const ICE_PEAK_RULES = [
  {
    id: 'membrane',
    keywords: ['мембран', 'waterproof', 'водонепроница', 'водостой', 'water column', 'wp', 'w/proof'],
    feature: 'Мембранная защита от дождя и мокрого снега.',
    salesArgument: 'Помогает оставаться сухим в переменчивую погоду.',
    whenRecommend: 'Для дождя, мокрого снега и прогулок в нестабильную погоду.',
  },
  {
    id: 'breathability',
    keywords: ['дыша', 'breathable', 'breathability', 'mvp', 'паропроница'],
    feature: 'Дышащий материал отводит лишнюю влагу при активности.',
    salesArgument: 'Клиенту комфортнее двигаться без перегрева.',
    whenRecommend: 'Для активных прогулок, поездок и умеренной физической нагрузки.',
  },
  {
    id: 'windproof',
    keywords: ['ветрозащит', 'ветронепроница', 'windproof', 'wind proof', 'windblock'],
    feature: 'Ветрозащитный материал снижает продувание.',
    salesArgument: 'Подходит для ветреной погоды и открытых маршрутов.',
    whenRecommend: 'Когда нужна защита от ветра без лишнего объёма.',
  },
  {
    id: 'insulation',
    keywords: ['утепл', 'insulation', 'insulated', 'padding', 'пух', 'down', 'синтепон', 'вата'],
    feature: 'Утеплитель сохраняет тепло в прохладную погоду.',
    salesArgument: 'Даёт дополнительный комфорт без сложного подбора слоёв.',
    whenRecommend: 'Для прохладного сезона, зимних поездок и длительных прогулок.',
  },
  {
    id: 'stretch',
    keywords: ['stretch', 'эластич', 'стрейч', '4-way', '4 way'],
    feature: 'Эластичная ткань не сковывает движения.',
    salesArgument: 'Удобно садится по фигуре и подходит для активного дня.',
    whenRecommend: 'Для клиентов, которым важна свобода движения.',
  },
  {
    id: 'softshell',
    keywords: ['softshell', 'софтшелл', 'soft shell'],
    feature: 'Softshell сочетает защиту от ветра с комфортной посадкой.',
    salesArgument: 'Практичный вариант на каждый день и для лёгкого outdoor.',
    whenRecommend: 'Для межсезонья, города и прогулок на природе.',
  },
  {
    id: 'seams',
    keywords: ['проклеенн', 'герметичн', 'taped seams', 'seam sealed', 'sealed seams'],
    feature: 'Проклеенные швы усиливают защиту от влаги.',
    salesArgument: 'Меньше риск промокания в местах швов.',
    whenRecommend: 'Для длительного нахождения под дождём или снегом.',
  },
  {
    id: 'hood',
    keywords: ['капюшон', 'hood'],
    feature: 'Капюшон добавляет защиту головы и шеи от осадков.',
    salesArgument: 'Повышает практичность без дополнительных аксессуаров.',
    whenRecommend: 'Когда клиент ищет универсальную верхнюю одежду на непогоду.',
  },
  {
    id: 'pockets',
    keywords: ['карман', 'pocket'],
    feature: 'Функциональные карманы помогают держать мелочи под рукой.',
    salesArgument: 'Удобно для телефона, ключей и аксессуаров в дороге.',
    whenRecommend: 'Для повседневного использования и путешествий.',
  },
  {
    id: 'reflective',
    keywords: ['светоотраж', 'reflective', 'рефлектив'],
    feature: 'Светоотражающие детали повышают заметность в сумерках.',
    salesArgument: 'Полезно для прогулок вечером и в пасмурную погоду.',
    whenRecommend: 'Для клиентов, которые часто гуляют утром или вечером.',
  },
  {
    id: 'ski',
    keywords: ['ski', 'горнолыж', 'сноуборд', 'snowboard', 'лыж'],
    feature: 'Конструкция рассчитана на зимний outdoor и катание.',
    salesArgument: 'Закрывает базовые потребности для горнолыжного отдыха.',
    whenRecommend: 'Для поездок на склон, активной зимы и отдыха на снегу.',
  },
];

const ICE_PEAK_USE_CASE_RULES = [
  {
    keywords: ['ski', 'горнолыж', 'сноуборд', 'snowboard', 'лыж'],
    targetClient: 'Любители горнолыжного отдыха и активной зимы.',
    positioning: 'Функциональная outdoor-модель ICE PEAK для зимней активности и отдыха на снегу.',
  },
  {
    keywords: ['hiking', 'trekking', 'поход', 'треккинг', 'trail', 'outdoor'],
    targetClient: 'Покупатели, которым нужна практичная одежда для прогулок, поездок и лёгкого outdoor.',
    positioning: 'Практичная outdoor-модель ICE PEAK для прогулок, путешествий и переменчивой погоды.',
  },
  {
    keywords: ['city', 'город', 'casual', 'повседнев'],
    targetClient: 'Городские покупатели, которые хотят повседневную вещь с outdoor-защитой.',
    positioning: 'Повседневная модель ICE PEAK с outdoor-функциями для города и межсезонья.',
  },
];

const ICE_PEAK_FALLBACK_FEATURES = [
  'Практичный крой для повседневного использования.',
  'Outdoor-стиль ICE PEAK для города, поездок и прогулок.',
];

const ICE_PEAK_FALLBACK_TARGET_CLIENT = [
  'Покупатели, которым нужна понятная функциональная вещь без лишней сложности.',
];

const ICE_PEAK_FALLBACK_SALES_ARGUMENTS = [
  'Легко объяснить клиенту через практичность, комфорт и универсальность.',
];

const ICE_PEAK_FALLBACK_RECOMMEND = [
  'Когда клиент ищет универсальную outdoor-вещь для повседневных сценариев.',
];

const ICE_PEAK_NOT_RECOMMEND_RULES = [
  {
    keywords: ['waterproof', 'водонепроница', 'мембран', 'water column', 'проклеенн', 'taped seams'],
    text: 'Если клиенту нужна профессиональная штормовая защита, проверьте точные показатели мембраны и швов.',
  },
  {
    keywords: ['утепл', 'insulation', 'down', 'пух'],
    text: 'Если клиент ищет вещь для экстремального мороза, уточните температурный режим и слои.',
  },
  {
    keywords: ['ski', 'горнолыж', 'сноуборд', 'snowboard'],
    text: 'Если клиенту нужна профессиональная экипировка для интенсивного катания, проверьте наличие специализированных деталей.',
  },
];

const normalizeLine = (line) => line.trim().replace(/^[-–—•*\d.)\s]+/, '').trim();

const normalizeText = (value = '') => value.toLocaleLowerCase('ru-RU');

const hasAnyKeyword = (text, keywords) => {
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

const hasFeatureKeyword = (line) => hasAnyKeyword(line, FEATURE_KEYWORDS);

const extractKeyFeatures = (rawText = '') => {
  const seen = new Set();

  return rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .filter(hasFeatureKeyword)
    .filter((line) => {
      const key = normalizeText(line);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const buildIcePeakShortDescription = (source, keyFeatures, positioning) => {
  const rawText = source.rawText || '';
  const productName = [source.brand || 'ICE PEAK', source.seriesName].filter(Boolean).join(' ');
  const category = source.category ? ` ${source.category}` : ' модель';
  const featureSummary = keyFeatures.slice(0, 2).join(' ');

  if (featureSummary) {
    return `${productName || 'ICE PEAK'} —${category} для повседневного использования и outdoor-сценариев. ${featureSummary}`;
  }

  if (positioning) {
    return `${productName || 'ICE PEAK'} —${category}. ${positioning}`;
  }

  return rawText.slice(0, 350).trim();
};

const detectIcePeakUseCase = (rawText) =>
  ICE_PEAK_USE_CASE_RULES.find((rule) => hasAnyKeyword(rawText, rule.keywords));

const collectIcePeakRuleValues = (rawText, fieldName) =>
  ICE_PEAK_RULES.filter((rule) => hasAnyKeyword(rawText, rule.keywords)).map((rule) => rule[fieldName]);

const buildIcePeakWhenNotRecommend = (rawText) => {
  const matchedWarnings = ICE_PEAK_NOT_RECOMMEND_RULES.filter((rule) =>
    hasAnyKeyword(rawText, rule.keywords),
  ).map((rule) => rule.text);

  return unique([
    ...matchedWarnings,
    'Если клиенту нужны подтверждённые технические показатели, сначала сверить их с официальной спецификацией товара.',
  ]);
};

export const generateIcePeakDraft = (source) => {
  const rawText = source.rawText || '';
  const useCase = detectIcePeakUseCase(rawText);
  const keyFeatures = unique([
    ...collectIcePeakRuleValues(rawText, 'feature'),
    ...extractKeyFeatures(rawText),
    ...(rawText ? [] : ICE_PEAK_FALLBACK_FEATURES),
  ]);
  const positioning =
    useCase?.positioning || 'Практичная outdoor-модель ICE PEAK для города, поездок и активного отдыха.';

  return {
    brand: source.brand || 'ICE PEAK',
    category: source.category || '',
    seriesName: source.seriesName || '',
    shortDescription: buildIcePeakShortDescription(source, keyFeatures, positioning),
    positioning,
    targetClient: unique([
      useCase?.targetClient,
      ...ICE_PEAK_FALLBACK_TARGET_CLIENT,
    ].filter(Boolean)),
    keyFeatures: keyFeatures.length > 0 ? keyFeatures : ICE_PEAK_FALLBACK_FEATURES,
    salesArguments: unique([
      ...collectIcePeakRuleValues(rawText, 'salesArgument'),
      ...ICE_PEAK_FALLBACK_SALES_ARGUMENTS,
    ]),
    clientSpeech: '',
    differences: '',
    whenRecommend: unique([
      ...collectIcePeakRuleValues(rawText, 'whenRecommend'),
      ...ICE_PEAK_FALLBACK_RECOMMEND,
    ]),
    whenNotRecommend: buildIcePeakWhenNotRecommend(rawText),
    objections: [],
    importantSpecs: [],
    sourceIds: source.id ? [source.id] : [],
    status: 'draft',
  };
};

export const generateSeriesDraft = (source) => ({
  brand: source.brand || '',
  category: source.category || '',
  seriesName: source.seriesName || '',
  shortDescription: (source.rawText || '').slice(0, 500),
  positioning: '',
  targetClient: [],
  keyFeatures: extractKeyFeatures(source.rawText),
  salesArguments: [],
  clientSpeech: '',
  differences: '',
  whenRecommend: [],
  whenNotRecommend: [],
  objections: [],
  importantSpecs: [],
  sourceIds: source.id ? [source.id] : [],
  status: 'draft',
});
