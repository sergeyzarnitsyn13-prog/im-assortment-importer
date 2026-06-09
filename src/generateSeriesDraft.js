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

const normalizeLine = (line) => line.trim().replace(/^[-–—•*\d.)\s]+/, '').trim();

const hasFeatureKeyword = (line) => {
  const lowerLine = line.toLocaleLowerCase('ru-RU');

  return FEATURE_KEYWORDS.some((keyword) =>
    lowerLine.includes(keyword.toLocaleLowerCase('ru-RU')),
  );
};

const extractKeyFeatures = (rawText = '') => {
  const seen = new Set();

  return rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .filter(hasFeatureKeyword)
    .filter((line) => {
      const key = line.toLocaleLowerCase('ru-RU');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
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
