import assert from 'node:assert/strict';
import { diagnoseEnergyClass, extractEnergyClass, generateSeriesDraft, getCategoryExtractionProfile, isEnergyClassFeature, sanitizeEnergyClasses } from '../src/generateSeriesDraft.js';
import { SERIES_PROFILES } from '../src/data/seriesProfiles.js';
import { classifyPageForSeries, getMatchedTokens } from '../src/seriesPageClassifier.js';

const forbiddenByOwner = [
  { owner: 'ICE PEAK', patterns: [/тепловой насос/iu, /обогрев до -30°C/iu, /обогрев до -30°c/iu] },
  { owner: 'DEFENDER', patterns: [/УФ-обработка воздуха/iu] },
  { owner: 'BOHO', patterns: [/сменные тканевые панели/iu, /поворот 180°/iu, /поворот жалюзи 180°/iu] },
  { owner: 'ICE PEAK', patterns: [/Smart Sens/iu, /Health Guard/iu] },
];

const otherSeriesContamination = `
ICE PEAK BSPKI тепловой насос обогрев до -30°C Smart Sens Health Guard.
DEFENDER BSHI УФ-обработка воздуха.
BOHO BSBI сменные тканевые панели поворот 180°.
LAGOON BSDI Golden Fin.
`;

const stringifyDraft = (draft) => JSON.stringify(draft, null, 2);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasExactToken = (text, token) =>
  new RegExp(`(^|[^0-9a-zа-яё])${escapeRegExp(token)}([^0-9a-zа-яё]|$)`, 'iu').test(text);


const emptySalesTextsDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Тестовая категория без профиля',
  group: 'Тестовая группа',
  code: 'MTT',
  seriesName: 'MANUAL TEXT TEST',
  exactSeriesRawText: 'MANUAL TEXT TEST MTT описание серии без автоматического профиля.',
  technicalRawText: 'Технические характеристики MTT\nМощность охлаждения 2.5 кВт\nУровень шума 24 дБ',
  exactSeriesPages: [1],
  technicalPages: [2],
});
assert.equal(emptySalesTextsDraft.shortDescription, '', 'draft without manual/legacy profile may keep shortDescription empty');
assert.equal(emptySalesTextsDraft.positioning, '', 'draft without manual/legacy profile may keep positioning empty');
assert.deepEqual(emptySalesTextsDraft.salesArguments, [], 'draft without manual/legacy profile may keep salesArguments empty');
assert.ok(emptySalesTextsDraft.catalogExtract, 'draft must include catalogExtract');
assert.ok(Array.isArray(emptySalesTextsDraft.catalogExtract.factualFeatures), 'catalogExtract.factualFeatures must be an array');
assert.ok(Array.isArray(emptySalesTextsDraft.catalogExtract.importantSpecs), 'catalogExtract.importantSpecs must be an array');
assert.equal(
  emptySalesTextsDraft.diagnostics.warnings.includes('Краткое описание не заполнено.'),
  false,
  'empty shortDescription must not add critical diagnostic warning',
);
assert.equal(
  emptySalesTextsDraft.diagnostics.warnings.includes('Позиционирование не заполнено.'),
  false,
  'empty positioning must not add critical diagnostic warning',
);
assert.ok(
  emptySalesTextsDraft.diagnostics.notes.includes('Продажные тексты не генерируются автоматически. Заполните вручную при необходимости.'),
  'empty sales texts should add a soft diagnostic note',
);

const manualSalesProfileDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Тестовая категория без профиля',
  group: 'Тестовая группа',
  code: 'MSP',
  seriesName: 'MANUAL SALES PROFILE TEST',
  exactSeriesRawText: 'MANUAL SALES PROFILE TEST MSP описание из каталога.',
  technicalRawText: 'Технические характеристики MSP\nМощность охлаждения 2.5 кВт',
  salesProfile: {
    status: 'approved',
    shortDescription: 'Ручное краткое описание.',
    positioning: 'Ручное позиционирование.',
    salesArguments: ['Ручной аргумент продаж.'],
  },
});
assert.equal(manualSalesProfileDraft.shortDescription, 'Ручное краткое описание.', 'approved salesProfile shortDescription must be used as-is');
assert.equal(manualSalesProfileDraft.positioning, 'Ручное позиционирование.', 'approved salesProfile positioning must be used as-is');
assert.deepEqual(manualSalesProfileDraft.salesArguments, ['Ручной аргумент продаж.'], 'approved salesProfile salesArguments must be used as-is');

for (const profile of SERIES_PROFILES) {
  const draft = generateSeriesDraft({
    title: `Тест ${profile.seriesName}`,
    sourceRef: 'isolation test',
    profileId: profile.id,
    brand: profile.brand,
    category: profile.category,
    group: profile.group,
    code: profile.code,
    seriesName: profile.seriesName,
    rawText: `${profile.seriesName} ${profile.code}\n${otherSeriesContamination}`,
    exactSeriesRawText: `${profile.seriesName} ${profile.code} Wi-Fi управление самоочистка.`,
    technicalRawText: `Технические характеристики ${profile.code}\nУровень шума 24 дБ\nМощность охлаждения 2.5 кВт`,
  });
  const text = stringifyDraft(draft);

  for (const otherProfile of SERIES_PROFILES) {
    if (otherProfile.id === profile.id || otherProfile.code === profile.code) continue;

    assert.equal(
      hasExactToken(text, otherProfile.code),
      false,
      `${profile.seriesName} draft leaked foreign code ${otherProfile.code}`,
    );
  }

  for (const { owner, patterns } of forbiddenByOwner) {
    if (profile.seriesName === owner) continue;

    for (const pattern of patterns) {
      assert.equal(
        pattern.test(text),
        false,
        `${profile.seriesName} draft leaked forbidden ${pattern}`,
      );
    }
  }

  if (profile.seriesName !== 'LAGOON') {
    assert.equal(/Golden Fin/iu.test(text), false, `${profile.seriesName} draft leaked Golden Fin`);
  }
}

const lagoonProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'LAGOON');
const lagoonWithoutExactGoldenFin = generateSeriesDraft({
  profileId: lagoonProfile.id,
  seriesName: lagoonProfile.seriesName,
  code: lagoonProfile.code,
  rawText: `${lagoonProfile.seriesName} ${lagoonProfile.code} Golden Fin`,
  exactSeriesRawText: `${lagoonProfile.seriesName} ${lagoonProfile.code} Wi-Fi управление.`,
  technicalRawText: `Технические характеристики ${lagoonProfile.code}\nМощность охлаждения 2.5 кВт`,
});
assert.equal(/Golden Fin/iu.test(stringifyDraft(lagoonWithoutExactGoldenFin)), false, 'LAGOON leaked Golden Fin from rawText');

const noExactPagesDraft = generateSeriesDraft({
  profileId: lagoonProfile.id,
  seriesName: lagoonProfile.seriesName,
  code: lagoonProfile.code,
  rawText: `${lagoonProfile.seriesName} ${lagoonProfile.code} Wi-Fi управление`,
  technicalRawText: `Технические характеристики ${lagoonProfile.code}\nМощность охлаждения 2.5 кВт`,
});
assert.deepEqual(noExactPagesDraft.salesFeatures, [], 'features must stay empty without exactSeriesPages');
assert.match(noExactPagesDraft.draftWarning, /Точные страницы серии не найдены/u);

const noTechnicalPagesDraft = generateSeriesDraft({
  profileId: lagoonProfile.id,
  seriesName: lagoonProfile.seriesName,
  code: lagoonProfile.code,
  rawText: `${lagoonProfile.seriesName} ${lagoonProfile.code}`,
  exactSeriesRawText: `${lagoonProfile.seriesName} ${lagoonProfile.code} Wi-Fi управление.`,
});
assert.deepEqual(noTechnicalPagesDraft.technicalSpecs, [], 'technicalSpecs must stay empty without technicalPages');
assert.match(noTechnicalPagesDraft.draftWarning, /Техническая таблица выбранной серии не найдена/u);

const discoveryProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'DISCOVERY');
const discoveryDraft = generateSeriesDraft({
  profileId: discoveryProfile.id,
  seriesName: discoveryProfile.seriesName,
  code: discoveryProfile.code,
  exactSeriesRawText: `
    ${discoveryProfile.seriesName} ${discoveryProfile.code}
    3D-контроль потока воздуха
    i-FEEL
    7 скоростей вентилятора
    стабильная работа на обогрев
    инвертор
  `,
  technicalRawText: `
    Технические характеристики ${discoveryProfile.code}
    Уровень шума внутреннего блока 23/35/41 дБ
    Уровень шума наружного блока 52 дБ
  `,
  summaryRawText: `${discoveryProfile.seriesName} ${discoveryProfile.code} Health Guard УФ-обработка воздуха`,
  serviceRawText: `Модуль HOMMYN работает с Hommyn для ${discoveryProfile.seriesName} ${discoveryProfile.code}`,
});
assert.deepEqual(
  discoveryDraft.salesFeatures,
  [
    'Wi-Fi управление',
    '3D-контроль потока воздуха',
    'i-FEEL',
    '7 скоростей вентилятора',
    'стабильная работа на обогрев',
    'низкий уровень шума от 23 дБ',
    'инвертор',
  ],
  'DISCOVERY must collect exact page icon captions, service HOMMYN and technical noise in priority order',
);
assert.equal(/Health Guard|УФ-обработка воздуха/iu.test(stringifyDraft(discoveryDraft)), false, 'summary/service pages must not add non-Wi-Fi features');

const discoveryServiceWithoutSeries = generateSeriesDraft({
  profileId: discoveryProfile.id,
  seriesName: discoveryProfile.seriesName,
  code: discoveryProfile.code,
  exactSeriesRawText: `${discoveryProfile.seriesName} ${discoveryProfile.code} 3D-контроль потока воздуха`,
  serviceRawText: 'Модуль HOMMYN для другой серии',
});
assert.deepEqual(
  discoveryServiceWithoutSeries.salesFeatures,
  ['3D-контроль потока воздуха'],
  'service HOMMYN must reference the selected series before adding Wi-Fi',
);


const olympioLegendProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'OLYMPIO LEGEND');
const olympioLegendNumericPagesDraft = generateSeriesDraft({
  profileId: olympioLegendProfile.id,
  seriesName: 'OLYMPIO LEGEND',
  code: 'BSW',
  exactSeriesRawText: 'OLYMPIO LEGEND BSW Wi-Fi управление',
  technicalRawText: 'Технические характеристики BSW\nУровень шума 24/50\nМощность охлаждения 2.5 кВт',
  exactSeriesPages: [31],
  technicalPages: [31],
  summaryPages: [4, 28],
  servicePages: [3, 8, 9],
  excludedPages: [{ pageNumber: 1, reason: 'foreign series' }, 2],
  pageDiagnostics: {
    exactSeriesPages: [31],
    technicalPages: [31],
    summaryPages: [4, 28],
    servicePages: [3, 8, 9],
    excludedPages: [{ pageNumber: 1, reason: 'foreign series' }, 2],
  },
});
assert.equal(olympioLegendNumericPagesDraft.seriesName, 'OLYMPIO LEGEND', 'OLYMPIO LEGEND draft must be generated with numeric page arrays');
assert.deepEqual(
  olympioLegendNumericPagesDraft.diagnostics.descriptionPages,
  [31],
  'draft diagnostics must safely normalize numeric exactSeriesPages',
);

const olympioLegendAutoDescriptionDraft = generateSeriesDraft({
  profileId: olympioLegendProfile.id,
  seriesName: 'OLYMPIO LEGEND',
  code: 'BSW',
  exactSeriesRawText: `
    OLYMPIO LEGEND BSW
    Wi-Fi управление
    3D-контроль потока воздуха
    i-FEEL
    самоочистка
  `,
  technicalRawText: `
    Технические характеристики BSW
    Уровень шума внутреннего блока 23/35/41 дБ
    Диапазон рабочих температур -15…+50°C/-7…+24°C
  `,
  exactSeriesPages: [31],
  technicalPages: [31],
});
assert.equal(olympioLegendAutoDescriptionDraft.shortDescription, '', 'OLYMPIO LEGEND without manual/legacy profile may keep shortDescription empty');
assert.equal(olympioLegendAutoDescriptionDraft.positioning, '', 'OLYMPIO LEGEND without manual/legacy profile may keep positioning empty');
assert.equal(
  olympioLegendAutoDescriptionDraft.diagnostics.warnings.includes('Краткое описание не заполнено.'),
  false,
  'empty shortDescription must not add missing-description diagnostic warning',
);
assert.equal(
  olympioLegendAutoDescriptionDraft.diagnostics.warnings.includes('Позиционирование не заполнено.'),
  false,
  'empty positioning must not add missing-positioning diagnostic warning',
);

const buildTechnicalOnlyDraft = ({ seriesName, technicalRawText, rawText = '', exactSeriesRawText = '' }) => {
  const profile = SERIES_PROFILES.find((item) => item.seriesName === seriesName);

  return generateSeriesDraft({
    profileId: profile.id,
    seriesName: profile.seriesName,
    code: profile.code,
    rawText,
    exactSeriesRawText: exactSeriesRawText || `${profile.seriesName} ${profile.code} Wi-Fi управление`,
    technicalRawText,
    technicalPages: [42],
    sourceRef: 'PDF каталог 2026, страницы 3, 4, 42',
    sourceDate: '2026',
  });
};

const discoveryTechnicalDraft = buildTechnicalOnlyDraft({
  seriesName: 'DISCOVERY',
  rawText: 'Чужая сводная таблица: Уровень шума 19/50 21/50 29/54 31/62',
  technicalRawText: 'Технические характеристики BSVI\nУровень шума (внутренний / наружный блок) 23/49 23/49 23/49',
});
assert.ok(discoveryTechnicalDraft.salesFeatures.includes('низкий уровень шума от 23 дБ'), 'DISCOVERY noise must come from BSVI technical table');
assert.equal(/низкий уровень шума от 19 дБ/iu.test(stringifyDraft(discoveryTechnicalDraft)), false, 'DISCOVERY must not use 19 dB from foreign rawText');
assert.match(discoveryTechnicalDraft.sourceRefs.salesFeatures, /technicalPages:? 42/u, 'numeric salesFeatures sourceRef must point to technicalPages only');
assert.equal(/страницы 3, 4/iu.test(discoveryTechnicalDraft.sourceRefs.salesFeatures), false, 'numeric salesFeatures sourceRef must not point to selected summary/service pages');

const icePeakTechnicalDraft = buildTechnicalOnlyDraft({
  seriesName: 'ICE PEAK',
  technicalRawText: 'Технические характеристики BSPKI\nУровень шума (внутренний / наружный блок) 19/50 21/50 29/54 31/62\nДиапазон рабочих температур -15…+50°C/-30…+24°C',
});
assert.ok(icePeakTechnicalDraft.salesFeatures.includes('низкий уровень шума от 19 дБ'), 'ICE PEAK noise must be 19 dB');
assert.ok(icePeakTechnicalDraft.salesFeatures.includes('обогрев до -30°C'), 'ICE PEAK heating must be -30°C');

const defenderTechnicalDraft = buildTechnicalOnlyDraft({
  seriesName: 'DEFENDER',
  technicalRawText: 'Технические характеристики BSHI\nУровень шума (внутренний / наружный блок) 19/50 21/50 29/54 31/62\nДиапазон рабочих температур -15…+50°C/-20…+32°C',
});
assert.ok(defenderTechnicalDraft.salesFeatures.includes('низкий уровень шума от 19 дБ'), 'DEFENDER noise must be 19 dB');
assert.ok(defenderTechnicalDraft.salesFeatures.includes('обогрев до -20°C'), 'DEFENDER heating must be -20°C');

const platinumBlackTechnicalDraft = buildTechnicalOnlyDraft({
  seriesName: 'PLATINUM BLACK',
  technicalRawText: 'Технические характеристики BSPI\nУровень шума (внутренний / наружный блок) 21/42 23/48,5',
});
assert.ok(platinumBlackTechnicalDraft.salesFeatures.includes('низкий уровень шума от 21 дБ'), 'PLATINUM BLACK noise must be 21 dB');

const ecoSmartTechnicalDraft = buildTechnicalOnlyDraft({
  seriesName: 'ECO SMART',
  rawText: 'Чужая таблица ICE PEAK: Диапазон рабочих температур -15…+50°C/-30…+24°C',
  technicalRawText: 'Технические характеристики BSYI\nУровень шума (внутренний / наружный блок) 20/45 22/47\nДиапазон рабочих температур -15…+50°C/-15…+24°C',
});
assert.ok(ecoSmartTechnicalDraft.salesFeatures.includes('низкий уровень шума от 20 дБ'), 'ECO SMART noise must be 20 dB');
assert.equal(/обогрев до -30°C/iu.test(stringifyDraft(ecoSmartTechnicalDraft)), false, 'ECO SMART must not use -30°C from foreign rawText');

const lagoonEnergyDraft = buildTechnicalOnlyDraft({
  seriesName: 'LAGOON',
  technicalRawText: 'Технические характеристики BSDI\nКласс энергоэффективности (EER/COP) A/A A/A A/A A++/A+++ A++/A+++ Расход воздуха 480/1300 520/1800',
});
assert.equal(lagoonEnergyDraft.salesFeatures.includes('A/A → A++/A+++'), false, 'LAGOON salesFeatures must not include technical EER/COP energy range');
assert.equal(lagoonEnergyDraft.keyFeatures.includes('A/A → A++/A+++'), false, 'LAGOON keyFeatures must not include technical EER/COP energy range');
assert.ok(lagoonEnergyDraft.importantSpecs.includes('класс энергоэффективности EER/COP A/A → A++/A+++'), 'LAGOON importantSpecs must include confident EER/COP energy range with label');

const lagoonMainAdvantagesEnergyDraft = buildTechnicalOnlyDraft({
  seriesName: 'LAGOON',
  exactSeriesRawText: `
    LAGOON BSDI
    обогрев до -15°C
    Golden Fin
    фильтрация воздуха
    инвертор
    R32
  `,
  technicalRawText: 'Технические характеристики BSDI\nКласс энергоэффективности (EER/COP) A/A A++/A+++\nУровень шума 23/49',
});
const lagoonMainAdvantagesText = JSON.stringify(lagoonMainAdvantagesEnergyDraft.mainAdvantages);
assert.equal(/A\/A/u.test(lagoonMainAdvantagesText), false, 'LAGOON mainAdvantages must not contain A/A energy class');
assert.equal(/A\+\+/u.test(lagoonMainAdvantagesText), false, 'LAGOON mainAdvantages must not contain A++ energy class');
assert.equal(/A\+\+\+/u.test(lagoonMainAdvantagesText), false, 'LAGOON mainAdvantages must not contain A+++ energy class');
assert.equal(
  lagoonMainAdvantagesEnergyDraft.mainAdvantages.some((feature) => isEnergyClassFeature(feature)),
  false,
  'LAGOON mainAdvantages must not contain any energy class feature',
);
assert.equal(
  lagoonMainAdvantagesText.includes('A/A → A++/A+++'),
  false,
  'LAGOON mainAdvantages JSON must not contain the extracted energy class range',
);

const lagoonFlatPdfTechnicalRawText = 'Технические характеристики BSDI Класс энергоэффективности (EER/COP) A/A A/A A++/A+ Расход воздуха 480/1300 SEER A++/A+++ SCOP A++/A+++ Уровень шума 23/49';
assert.equal(
  extractEnergyClass(lagoonFlatPdfTechnicalRawText),
  'A/A → A++/A+',
  'flat PDF text energy extractor must stop before neighboring rows',
);
assert.equal(
  /A\+\+\/A\+\+\+/u.test(extractEnergyClass(lagoonFlatPdfTechnicalRawText)),
  false,
  'flat PDF text energy extractor must not include SEER/SCOP A++/A+++ values after Расход воздуха',
);

const lagoonFlatPdfEnergyDiagnostic = diagnoseEnergyClass(lagoonFlatPdfTechnicalRawText);
assert.equal(
  lagoonFlatPdfEnergyDiagnostic.stopMarker,
  'Расход воздуха',
  'energy diagnostic must expose the nearest technical marker that cut off neighboring values',
);
assert.deepEqual(
  lagoonFlatPdfEnergyDiagnostic.values,
  ['A/A', 'A++/A+'],
  'energy diagnostic must expose strict values collected before SEER/SCOP rows',
);
assert.match(
  lagoonFlatPdfEnergyDiagnostic.rawSegment,
  /A\+\+\/A\+\+\+/u,
  'energy diagnostic must expose the original segment where the SEER/SCOP A+++ value appeared',
);

assert.equal(
  extractEnergyClass('Класс энергоэффективности (EER/COP) A/A'),
  'A/A',
  'single-row energy extractor must return one confident value',
);
assert.equal(
  extractEnergyClass('Класс энергоэффективности (EER/COP) A/A A++/A+'),
  'A/A → A++/A+',
  'two-value energy extractor must return a two-point range',
);
assert.equal(
  extractEnergyClass('Класс энергоэффективности (EER/COP) A/A A/A A/A A++/A+ A++/A+ A++/A+++'),
  'A/A → A++/A+++',
  'energy extractor must format several distinct row values as first-to-last range',
);

const lagoonFlatPdfEnergyDraft = buildTechnicalOnlyDraft({
  seriesName: 'LAGOON',
  technicalRawText: lagoonFlatPdfTechnicalRawText,
});
assert.equal(
  lagoonFlatPdfEnergyDraft.salesFeatures.includes('A/A → A++/A+'),
  false,
  'LAGOON flat PDF card must not put the EER/COP energy class row range into salesFeatures',
);
assert.equal(
  /A\+\+\/A\+\+\+/u.test(stringifyDraft(lagoonFlatPdfEnergyDraft)),
  false,
  'LAGOON flat PDF card must not include A++/A+++ from SEER/SCOP anywhere in the draft JSON',
);

const singleEnergyDraft = buildTechnicalOnlyDraft({
  seriesName: 'LAGOON',
  technicalRawText: 'Технические характеристики BSDI\nКласс энергоэффективности (EER/COP) A/A A/A A/A',
});
assert.ok(singleEnergyDraft.importantSpecs.includes('класс энергоэффективности EER/COP A/A'), 'single energy class must be shown unchanged in importantSpecs');
assert.equal(/→/u.test(singleEnergyDraft.importantSpecs.join(' ')), false, 'single energy class must not be rendered as a range');

const exactEnergyClassWithoutEerDraft = buildTechnicalOnlyDraft({
  seriesName: 'LAGOON',
  technicalRawText: 'Технические характеристики BSDI\nКласс энергоэффективности A++/A+ A++/A+',
});
assert.equal(
  exactEnergyClassWithoutEerDraft.salesFeatures.includes('A++/A+'),
  false,
  'energy class row without EER/COP must not be used as confident EER/COP source',
);

const sanitizedLagoonEnergyFeatures = sanitizeEnergyClasses(
  ['Wi-Fi управление', 'A/A → A++/A+', 'A++/A+++', 'A+++', 'А++/А+++', 'А+++'],
  `Технические характеристики BSDI
Класс энергоэффективности (EER/COP) A/A A/A A++/A+ A++/A+`,
);
assert.deepEqual(
  sanitizedLagoonEnergyFeatures,
  ['Wi-Fi управление', 'A/A → A++/A+'],
  'energy sanitizer must keep only classes present in the selected technical row',
);
assert.deepEqual(
  sanitizeEnergyClasses(['A++/A+++', 'А+++'], `Технические характеристики BSDI
Мощность охлаждения 2.5 кВт`),
  [],
  'energy sanitizer must drop energy features when the energy class row is missing',
);

assert.equal(
  extractEnergyClass(`Технические характеристики BSDI
Класс энергоэффективности (EER/COP) А/А А/А А++/А+ А++/А+
Расход воздуха 480/1300 Другой показатель A++/A+++`),
  'А/А → А++/А+',
  'strict energy extractor must support Cyrillic A and ignore classes on following lines',
);
assert.equal(
  extractEnergyClass(`Технические характеристики BSPKI
Класс энергоэффективности A++/A+++`),
  '',
  'strict energy extractor must ignore an energy class row without EER/COP marker',
);
assert.equal(
  extractEnergyClass(`Технические характеристики BSHI
Класс энергоэффективности А++/А+++`),
  '',
  'strict energy extractor must ignore a Cyrillic energy class row without EER/COP marker',
);
assert.equal(
  extractEnergyClass(`Технические характеристики BSVI
Энергопотребление A++/A+++`),
  '',
  'strict energy extractor must return nothing without the energy class row marker',
);

const icePeakProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'ICE PEAK');
const ecoSmartProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'ECO SMART');
const defenderProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'DEFENDER');
const icePeakOverviewPage = {
  pageNumber: 8,
  text: `
    ICE PEAK BSPKI/in-10HN8_V4 BSPKI/out-10HN8_V4
    Тепловой насос Smart Sens Health Guard Wi-Fi управление R32
  `,
};
const icePeakTechnicalPage = {
  pageNumber: 9,
  text: `
    ICE PEAK
    Параметр / Модель BSPKI/in-10HN8 BSPKI/out-10HN8
    Уровень шума внутреннего блока 19 дБ
    Диапазон рабочих температур -15…+50°C/-30…+24°C
    Хладагент R32
  `,
};

const icePeakOverviewClassification = classifyPageForSeries(icePeakOverviewPage, icePeakProfile);
const icePeakTechnicalClassification = classifyPageForSeries(icePeakTechnicalPage, icePeakProfile);
assert.equal(icePeakOverviewClassification.belongsToSeries, true, 'ICE PEAK page 8 must be an exactSeriesPage');
assert.equal(icePeakTechnicalClassification.belongsToSeries, true, 'ICE PEAK page 9 must be an exactSeriesPage');
assert.equal(icePeakTechnicalClassification.isTechnicalPage, true, 'ICE PEAK page 9 must be a technicalPage');
assert.match(
  icePeakTechnicalClassification.reasonTechnicalPage.join(' | '),
  /technicalTable: .*Параметр \/ Модель.*modelPrefix: .*BSPKI\/in.*BSPKI\/out/u,
  'ICE PEAK page 9 diagnostics must explain reasonTechnicalPage',
);
assert.deepEqual(
  icePeakTechnicalClassification.matchedTokens,
  ['ICE PEAK', 'BSPKI', 'BSPKI/in', 'BSPKI/out'],
  'ICE PEAK page 9 diagnostics must include matched series and model-prefix tokens',
);


const icePeakServiceTechnicalPage = {
  pageNumber: 9,
  text: `
    ICE PEAK HOMMYN Wi-Fi совместимость
    Параметр / Модель BSPKI/in-10HN8 BSPKI/out-10HN8
    Уровень шума внутреннего блока 19 дБ
  `,
};
const icePeakServiceTechnicalClassification = classifyPageForSeries(icePeakServiceTechnicalPage, icePeakProfile);
assert.equal(
  icePeakServiceTechnicalClassification.isTechnicalPage,
  true,
  'ICE PEAK page with HOMMYN and technical table must keep technical priority over servicePage',
);
assert.equal(
  icePeakServiceTechnicalClassification.isServicePage,
  false,
  'ICE PEAK technical table must not be sent to servicePage even when service markers are present',
);
assert.match(
  icePeakServiceTechnicalClassification.reasonTechnicalPage.join(' | '),
  /technicalTable: .*Параметр \/ Модель/u,
  'ICE PEAK technical/service diagnostics must expose reasonTechnicalPage',
);

for (const foreignProfile of [ecoSmartProfile, discoveryProfile, defenderProfile]) {
  const classification = classifyPageForSeries(icePeakTechnicalPage, foreignProfile);
  assert.equal(classification.belongsToSeries, false, `ICE PEAK page must not belong to ${foreignProfile.seriesName}`);
}

assert.deepEqual(
  getMatchedTokens('BSPKI/in-10HN8_V4 BSPKI out 10HN8 V4 BSPKI-10HN8 BSPKI_10HN8 bspkiin10hn8v4', icePeakProfile),
  ['BSPKI', 'BSPKI/in', 'BSPKI/out'],
  'ICE PEAK tokens must match slash, space, hyphen, underscore and compact model forms',
);

const icePeakCardDraft = generateSeriesDraft({
  profileId: icePeakProfile.id,
  seriesName: icePeakProfile.seriesName,
  code: icePeakProfile.code,
  exactSeriesRawText: `
    ICE PEAK BSPKI/in-10HN8_V4
    тепловой насос
    Smart Sens
    Health Guard
    Wi-Fi управление
  `,
  technicalRawText: `
    Параметр / Модель BSPKI/in-10HN8 BSPKI/out-10HN8
    Уровень шума (внутренний / наружный блок) 19/50 21/50
    Диапазон рабочих температур -15…+50°C/-30…+24°C
    Хладагент R32
  `,
  technicalPages: [9],
});
assert.deepEqual(
  icePeakCardDraft.diagnostics.technicalPages,
  [9],
  'draft diagnostics must expose technicalPages',
);
assert.equal(
  icePeakCardDraft.diagnostics.technicalRawTextLength > 0,
  true,
  'draft diagnostics must expose technicalRawText length',
);
assert.equal(
  icePeakCardDraft.diagnostics.modelCodes.includes('BSPKI/in-10HN8'),
  true,
  'draft diagnostics must expose found models/codes for selected series',
);
assert.equal(
  icePeakCardDraft.diagnostics.salesFeatures.includes('тепловой насос'),
  true,
  'draft diagnostics must expose found sales features',
);
assert.equal(
  icePeakCardDraft.diagnostics.technicalSpecs.length > 0,
  true,
  'draft diagnostics must expose found technical specs',
);
const icePeakCardText = stringifyDraft(icePeakCardDraft);
for (const requiredIcePeakFeature of [
  /тепловой насос/iu,
  /Smart Sens/iu,
  /Health Guard/iu,
  /Wi-Fi управление/iu,
  /низкий уровень шума от 19 дБ/iu,
  /обогрев до -30°C/iu,
  /R32/iu,
]) {
  assert.equal(requiredIcePeakFeature.test(icePeakCardText), true, `ICE PEAK card must contain ${requiredIcePeakFeature}`);
}


const olympioLegendCategoryProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'OLYMPIO LEGEND' && profile.code === 'BSW');
const olympioLegendCategoryDraft = generateSeriesDraft({
  profileId: olympioLegendCategoryProfile.id,
  category: olympioLegendCategoryProfile.category,
  group: olympioLegendCategoryProfile.group,
  seriesName: olympioLegendCategoryProfile.seriesName,
  code: olympioLegendCategoryProfile.code,
  exactSeriesRawText: `
    OLYMPIO LEGEND BSW
    Сплит-системы ON/OFF
    Wi-Fi управление через Hommyn
    3D-контроль потока воздуха
    i-FEEL
    низкий уровень шума
    стабильная работа на обогрев
  `,
  technicalRawText: `
    Технические характеристики BSW
    Класс энергоэффективности (EER/COP) A/A A/A
    Уровень шума внутреннего блока 23/35/41 дБ
    Диапазон рабочих температур -15…+50°C/-7…+24°C
    Хладагент R32
  `,
});
assert.ok(olympioLegendCategoryDraft.salesFeatures.length > 0, 'ON/OFF split salesFeatures must not be empty');
assert.equal(olympioLegendCategoryDraft.shortDescription, '', 'ON/OFF split shortDescription may stay empty without manual/legacy profile');
assert.equal(olympioLegendCategoryDraft.positioning, '', 'ON/OFF split positioning may stay empty without manual/legacy profile');
assert.ok(olympioLegendCategoryDraft.mainAdvantages.length > 0, 'ON/OFF split mainAdvantages must not be empty');
assert.match(stringifyDraft(olympioLegendCategoryDraft), /3D-контроль|Wi-Fi|i-FEEL|шум|обогрев/iu, 'ON/OFF split must keep category features from input text');

const lagoonCategoryProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'LAGOON' && profile.code === 'BSDI');
const lagoonCategoryDraft = generateSeriesDraft({
  profileId: lagoonCategoryProfile.id,
  category: lagoonCategoryProfile.category,
  group: lagoonCategoryProfile.group,
  seriesName: lagoonCategoryProfile.seriesName,
  code: lagoonCategoryProfile.code,
  exactSeriesRawText: `
    LAGOON BSDI
    DC-Инверторные сплит-системы
    Full DC inverter
    Wi-Fi управление
    Golden Fin
  `,
  technicalRawText: `
    Технические характеристики BSDI
    Класс энергоэффективности (EER/COP) A/A A++/A+
    Уровень шума (внутренний / наружный блок) 21/48 23/50
    Диапазон рабочих температур -15…+50°C/-20…+24°C
    Хладагент R32
  `,
});
assert.ok(lagoonCategoryDraft.salesFeatures.length > 0, 'inverter split salesFeatures must not be empty');
assert.equal(lagoonCategoryDraft.shortDescription, '', 'inverter split shortDescription may stay empty without manual/legacy profile');
assert.equal(lagoonCategoryDraft.positioning, '', 'inverter split positioning may stay empty without manual/legacy profile');
assert.match(lagoonCategoryDraft.importantSpecs.join('\n'), /A\/A|шум|температур|R32/iu, 'inverter importantSpecs must include energy/noise/temperature/refrigerant when present');

const discoveryBsviRawExtractorDraft = generateSeriesDraft({
  profileId: discoveryProfile.id,
  category: discoveryProfile.category,
  group: discoveryProfile.group,
  seriesName: discoveryProfile.seriesName,
  code: discoveryProfile.code,
  exactSeriesPages: [50],
  technicalPages: [51],
  exactSeriesRawText: `
    DISCOVERY BSV
    ON/OFF Discovery BSV Golden Fin посторонняя серия.

    DISCOVERY BSVI
    DC-inverter
    3D-контроль потока воздуха
    7 скоростей вентилятора

    LAGOON BSDI
    Wi-Fi-Control Golden Fin соседняя серия.
  `,
  technicalRawText: `
    Технические характеристики BSV
    Уровень шума внутреннего блока 21 дБ

    Технические характеристики BSVI
    Параметр / Модель BSVI-09 BSVI-12 BSVI-18
    Производительность охлаждение, Вт 2600 3500 5200
    Производительность обогрев, Вт 2800 3800 5400
    Уровень шума внутреннего блока 23/24/28 дБ
    Хладагент R32

    Технические характеристики BSDI
    Golden Fin Wi-Fi-Control
  `,
});
const discoveryBsviCatalogText = stringifyDraft(discoveryBsviRawExtractorDraft.catalogExtract);
assert.deepEqual(discoveryBsviRawExtractorDraft.catalogExtract.sourcePages, [50, 51], 'Discovery BSVI sourcePages must contain selected pages only');
assert.deepEqual(discoveryBsviRawExtractorDraft.catalogExtract.diagnostics.foundModels, ['BSVI-09', 'BSVI-12', 'BSVI-18'], 'Discovery BSVI foundModels must contain concrete BSVI models only');
assert.match(discoveryBsviRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /3D-контроль потока воздуха/iu, 'Discovery BSVI factualFeatures must include 3D airflow');
assert.match(discoveryBsviRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /7 скоростей/iu, 'Discovery BSVI factualFeatures must include 7 speeds');
assert.match(discoveryBsviRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /DC inverter|инвертор/iu, 'Discovery BSVI factualFeatures must include inverter fact');
assert.match(discoveryBsviRawExtractorDraft.catalogExtract.importantSpecs.join('\n'), /производительность охлаждения 2600 3500 5200 Вт|производительность охлаждения 2600\/3500\/5200 Вт/iu, 'Discovery BSVI importantSpecs must include cooling capacity from BSVI table');
assert.equal(/ON\/OFF Discovery BSV|BSV-09|посторонняя серия|Golden Fin/iu.test(discoveryBsviCatalogText), false, 'Discovery BSVI catalogExtract must not include ON/OFF BSV or neighboring series data');

const discoveryBsviCatalogTableDraft = generateSeriesDraft({
  profileId: discoveryProfile.id,
  category: discoveryProfile.category,
  group: discoveryProfile.group,
  seriesName: discoveryProfile.seriesName,
  code: discoveryProfile.code,
  exactSeriesPages: [17],
  technicalPages: [34],
  exactSeriesRawText: `
    DISCOVERY / BSVI
    DC-inverter
    3D-контроль потока воздуха
    i-FEEL
    7 скоростей вентилятора
    стабильная работа на обогрев
    низкий уровень шума от 23 дБ
    обогрев до -15°C
    R32
  `,
  technicalRawText: `
    Параметр / Модель
    BSVI / in-07HN8_V2 BSVI / in-09HN8_V2 BSVI / in-12HN8_V2
    BSVI / out-07HN8_V2 BSVI / out-09HN8_V2 BSVI / out-12HN8_V2
    Производительность (охлаждение) BTU 7500 (2200~9550) 9000 (2800~11500) 12000 (3410~13000)
    Производительность (обогрев) BTU 8000 (2200~10000) 9500 (2400~12500) 12500 (3480~13500)
    Класс энергоэффективности (EER/COP) A / A A / A A / A
    Расход воздуха (внутренний / наружный блок) м3/ч 520 / 1400 520 / 1400 520 / 1400
    Уровень шума (внутренний / наружный блок) дБ(А) 23 / 49 23 / 49 23 / 49
    Напряжение питания В~Гц 220-240~50 220-240~50 220-240~50
    Потребляемая мощность (охлаждение) Вт 685 (160~1600) 820 (200~1700) 1095 (300~1800)
    Потребляемая мощность (обогрев) Вт 650 (160~1500) 770 (200~1600) 1013 (300~1800)
    Номинальный ток (охлаждение / обогрев) A 3,3 (1,2~7,2) / 3,0 (1,2~7,2) 3,8 (1,3~7,5) / 3,6 (1,3~7,5) 5,1 (1,4~8,5) / 4,7 (1,4~8,5)
    Размеры внутреннего блока (Ш×В×Г) мм 780×275×190 780×275×190 780×275×190
    Размеры наружного блока (Ш×В×Г) мм 712×276×459 712×276×459 712×276×459
    Размеры упаковки внутреннего блока (Ш×В×Г) мм 844×340×255 844×340×255 844×340×255
    Размеры упаковки наружного блока (Ш×В×Г) мм 765×310×481 765×310×481 765×310×481
    Вес нетто / брутто внутреннего блока кг 7,5 / 9,5 7,5 / 9,5 7,5 / 9,5
    Вес нетто / брутто наружного блока кг 19 / 20,5 19 / 20,5 19,5 / 21
    Диаметр труб (жидкость / газ) мм (дюйм) Ø6,35 (1/4'') / Ø9,52 (3/8'') Ø6,35 (1/4'') / Ø9,52 (3/8'') Ø6,35 (1/4'') / Ø9,52 (3/8'')
    Максимальная длина магистрали м 15 15 15
    Максимальный перепад высот м 5 5 5
    Хладагент / вес кг R32 / 0,44 R32 / 0,44 R32 / 0,44
    Диапазон рабочих температур (охлаждение / обогрев) 0…+53°C / -15…+30°C 0…+53°C / -15…+30°C 0…+53°C / -15…+30°C
    НА ОБОГРЕВ
    Установочные размеры и габариты
    A/A
  `,
});
const discoveryBsviCatalogTableSpecsText = discoveryBsviCatalogTableDraft.importantSpecs.join('\n');
assert.equal(discoveryBsviCatalogTableDraft.shortDescription, '', 'Discovery BSVI must not generate shortDescription');
assert.equal(discoveryBsviCatalogTableDraft.positioning, '', 'Discovery BSVI must not generate positioning');
assert.deepEqual(discoveryBsviCatalogTableDraft.salesArguments, [], 'Discovery BSVI must not generate salesArguments');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract, 'Discovery BSVI catalogExtract must be present');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract.factualFeatures.includes('3D-контроль потока воздуха'), 'Discovery BSVI factualFeatures must include 3D airflow');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract.factualFeatures.includes('7 скоростей вентилятора'), 'Discovery BSVI factualFeatures must include 7 fan speeds');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract.factualFeatures.includes('i-FEEL'), 'Discovery BSVI factualFeatures must include i-FEEL');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract.factualFeatures.includes('стабильная работа на обогрев'), 'Discovery BSVI factualFeatures must include stable heating');
assert.equal(discoveryBsviCatalogTableDraft.catalogExtract.factualFeatures.join(' ').includes('A/A'), false, 'Discovery BSVI factualFeatures must not contain standalone energy class');
for (const expectedSpec of [
  'производительность охлаждения 7500/9000/12000 BTU',
  'производительность обогрева 8000/9500/12500 BTU',
  'класс энергоэффективности EER/COP A/A',
  'расход воздуха внутренний/наружный блок 520/1400 м³/ч',
  'уровень шума внутренний/наружный блок 23/49 дБ',
  'питание 220–240 В / 50 Гц',
  'потребляемая мощность охлаждение 685/820/1095 Вт',
  'потребляемая мощность обогрев 650/770/1013 Вт',
  'габариты внутреннего блока 780×275×190 мм',
  'габариты наружного блока 712×276×459 мм',
  'номинальный ток охлаждение/обогрев 3,3/3,0; 3,8/3,6; 5,1/4,7 А',
  'диаметр труб жидкость/газ Ø6,35/Ø9,52 мм',
  'хладагент R32, заправка 0,44 кг',
]) {
  assert.ok(discoveryBsviCatalogTableDraft.importantSpecs.includes(expectedSpec), `Discovery BSVI importantSpecs must contain ${expectedSpec}`);
}
assert.equal(discoveryBsviCatalogTableSpecsText.includes('НА ОБОГРЕВ'), false, 'Discovery BSVI importantSpecs must not contain heating section header');
assert.equal(discoveryBsviCatalogTableSpecsText.includes('Установочные размеры и габариты'), false, 'Discovery BSVI importantSpecs must not contain dimensions section header');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract.diagnostics.foundModels.includes('BSVI/in-07HN8_V2'), 'Discovery BSVI foundModels must include indoor model');
assert.ok(discoveryBsviCatalogTableDraft.catalogExtract.diagnostics.foundModels.includes('BSVI/out-07HN8_V2'), 'Discovery BSVI foundModels must include outdoor model');

const lagoonBsdiRawExtractorDraft = generateSeriesDraft({
  profileId: lagoonCategoryProfile.id,
  category: lagoonCategoryProfile.category,
  group: lagoonCategoryProfile.group,
  seriesName: lagoonCategoryProfile.seriesName,
  code: lagoonCategoryProfile.code,
  exactSeriesPages: [60],
  technicalPages: [61],
  exactSeriesRawText: `
    LAGOON BSD
    ON/OFF Lagoon BSD посторонняя серия.

    LAGOON BSDI
    Wi-Fi-Control
    Golden Fin
    рекламная иконка A+++

    TESSEY BSTI
    соседняя серия.
  `,
  technicalRawText: `
    Технические характеристики BSDI
    Параметр / Модель BSDI-07 BSDI-09 BSDI-12 BSDI-18 BSDI-24
    Класс энергоэффективности (EER/COP) A/A A/A A/A A++/A+++ A++/A+++
    Уровень шума внутреннего блока 21/23/25/28/31 дБ
    Хладагент R32

    Технические характеристики BSD
    Класс энергоэффективности (EER/COP) A/A
  `,
});
assert.match(lagoonBsdiRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /Golden Fin/iu, 'Lagoon BSDI factualFeatures must include Golden Fin');
assert.match(lagoonBsdiRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /Wi-Fi управление/iu, 'Lagoon BSDI factualFeatures must include Wi-Fi');
assert.match(lagoonBsdiRawExtractorDraft.catalogExtract.importantSpecs.join('\n'), /A\/A\s*→\s*A\+\+\/A\+\+\+/u, 'Lagoon BSDI importantSpecs must preserve actual technical energy class range');
assert.equal(/LAGOON BSD\s|ON\/OFF Lagoon|посторонняя серия/iu.test(stringifyDraft(lagoonBsdiRawExtractorDraft.catalogExtract)), false, 'Lagoon BSDI catalogExtract must not include ON/OFF BSD data');

const lagoonBsdiCatalogTableDraft = generateSeriesDraft({
  profileId: lagoonCategoryProfile.id,
  category: lagoonCategoryProfile.category,
  group: lagoonCategoryProfile.group,
  seriesName: lagoonCategoryProfile.seriesName,
  code: lagoonCategoryProfile.code,
  exactSeriesPages: [62],
  technicalPages: [63],
  exactSeriesRawText: `
    LAGOON BSDI
    Wi-Fi-Control
    Golden Fin
    обогрев при температуре наружного воздуха от –15°C
    низкий уровень шума от 22 дБ
    R32
  `,
  technicalRawText: `
    Параметр / Модель
    BSDI/in-07HN8_V2 BSDI/in-09HN8_V2 BSDI/in-12HN8_V2 BSDI/in-18HN8_V2 BSDI/in-24HN8_V2
    BSDI/out-07HN8_V2 BSDI/out-09HN8_V2 BSDI/out-12HN8_V2 BSDI/out-18HN8_V2 BSDI/out-24HN8_V2
    Производительность (охлаждение) BTU 8000 (2300~9000) 9000 (2600~11000) 12300 (3200~14000) 18000 (4100~21000) 24000 (5500~27000)
    Производительность (обогрев) BTU 8300 (2300~9500) 10000 (2800~12000) 12650 (3300~14500) 19000 (4300~22000) 25000 (5800~28000)
    Класс энергоэффективности (EER/COP) А/А А/А А/А A++/A+++ A++/A+++
    Напряжение питания В~Гц 220-240~50 220-240~50 220-240~50 220-240~50 220-240~50
    Уровень шума (внутренний / наружный блок) дБ(А) 22 / 49 23 / 49 25 / 50 28 / 52 31 / 55
    Номинальный ток (охлаждение / обогрев) A 3,3 (0,4~4,7)/ 3,6 (0,4~4,7)/ 5,0 (1,3~5,4)/ 6,7 (0,6~10,0)/ 12,6 (1,8~13,8)/
    3,4 (0,6~3,9) 3,6 (0,6~3,9) 4,6 (1,3~5,6) 7,8 (1,0~10,2) 11,5 (1,3~12,2)
    Диаметр труб (жидкость / газ) мм (дюйм)
    Ø6,35 (1/4'') / Ø9,52 (3/8'')
    Ø6,35 (1/4'') / Ø9,52 (3/8'')
    Ø6,35 (1/4'') / Ø9,52 (3/8'')
    Ø6,35 (1/4") / Ø12,7 (1/2")
    Ø9,52 (3/8") / Ø15,9 (5/8")
    Хладагент / вес кг R32 / 0,50 R32 / 0,50 R32 / 0,60 R32 / 1,00 R32 / 1,30
  `,
});
assert.equal(lagoonBsdiCatalogTableDraft.shortDescription, '', 'Lagoon BSDI must not generate shortDescription');
assert.equal(lagoonBsdiCatalogTableDraft.positioning, '', 'Lagoon BSDI must not generate positioning');
assert.deepEqual(lagoonBsdiCatalogTableDraft.salesArguments, [], 'Lagoon BSDI must not generate salesArguments');
assert.ok(lagoonBsdiCatalogTableDraft.catalogExtract.diagnostics.foundModels.includes('BSDI/in-07HN8_V2'), 'Lagoon BSDI foundModels must include indoor model');
assert.ok(lagoonBsdiCatalogTableDraft.catalogExtract.diagnostics.foundModels.includes('BSDI/out-24HN8_V2'), 'Lagoon BSDI foundModels must include outdoor model');
for (const expectedSpec of [
  'класс энергоэффективности EER/COP А/А → A++/A+++',
  'производительность охлаждения 8000/9000/12300/18000/24000 BTU',
  'производительность обогрева 8300/10000/12650/19000/25000 BTU',
  'питание 220–240 В / 50 Гц',
  'номинальный ток охлаждение/обогрев 3,3/3,4; 3,6/3,6; 5,0/4,6; 6,7/7,8; 12,6/11,5 А',
  'диаметр труб жидкость/газ Ø6,35/Ø9,52; Ø6,35/Ø12,7; Ø9,52/Ø15,9 мм',
]) {
  assert.ok(lagoonBsdiCatalogTableDraft.importantSpecs.includes(expectedSpec), `Lagoon BSDI importantSpecs must contain ${expectedSpec}`);
}
assert.ok(lagoonBsdiCatalogTableDraft.catalogExtract.factualFeatures.includes('низкий уровень шума от 22 дБ'), 'Lagoon BSDI factualFeatures must include low noise');
assert.ok(lagoonBsdiCatalogTableDraft.catalogExtract.factualFeatures.includes('R32'), 'Lagoon BSDI factualFeatures must include R32');
assert.ok(lagoonBsdiCatalogTableDraft.catalogExtract.factualFeatures.includes('обогрев до -15°C'), 'Lagoon BSDI factualFeatures must include heating to -15°C');
assert.ok(lagoonBsdiCatalogTableDraft.catalogExtract.factualFeatures.includes('Golden Fin'), 'Lagoon BSDI factualFeatures must include Golden Fin');
assert.match(lagoonBsdiCatalogTableDraft.catalogExtract.factualFeatures.join(' '), /Wi-Fi-Control|Wi-Fi управление/iu, 'Lagoon BSDI factualFeatures must include Wi-Fi control');
assert.equal(lagoonBsdiCatalogTableDraft.catalogExtract.factualFeatures.join(' ').includes('А/А → A++/A+++'), false, 'Lagoon BSDI factualFeatures must not include technical energy range');

const defenderBshiRawExtractorDraft = generateSeriesDraft({
  profileId: defenderProfile.id,
  category: defenderProfile.category,
  group: defenderProfile.group,
  seriesName: defenderProfile.seriesName,
  code: defenderProfile.code,
  exactSeriesPages: [70],
  technicalPages: [71],
  exactSeriesRawText: `
    DEFENDER BSHI
    UV-фильтр
    обогрев при -20°C
    A++
  `,
  technicalRawText: `
    Технические характеристики BSHI
    Параметр / Модель BSHI-09 BSHI-12
    Производительность охлаждение, Вт 2600 3500
    Производительность обогрев, Вт 2800 3800
    Класс энергоэффективности (EER/COP) A++/A++ A++/A++
    Уровень шума внутреннего блока 19/21 дБ
    Рабочие температуры обогрев -20…+24°C
  `,
});
assert.match(defenderBshiRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /УФ-обработка воздуха/iu, 'Defender BSHI factualFeatures must include UV filter');
assert.match(defenderBshiRawExtractorDraft.catalogExtract.factualFeatures.join('\n'), /обогрев до -20°C|стабильная работа на обогрев/iu, 'Defender BSHI factualFeatures must include -20°C heating');
assert.equal(/A\+\+/u.test(defenderBshiRawExtractorDraft.catalogExtract.factualFeatures.join('\n')), false, 'Defender BSHI factualFeatures must not include standalone energy class from technical row');
assert.match(defenderBshiRawExtractorDraft.catalogExtract.importantSpecs.join('\n'), /класс энергоэффективности EER\/COP A\+\+\/A\+\+/u, 'Defender BSHI importantSpecs must include energy class from technical row');
assert.match(defenderBshiRawExtractorDraft.catalogExtract.importantSpecs.join('\n'), /производительность охлаждения 2600 3500 Вт|производительность охлаждения 2600\/3500 Вт/iu, 'Defender BSHI importantSpecs must include technical table rows');

const platinumX4Profile = SERIES_PROFILES.find((profile) => profile.seriesName === 'Platinum X4');
const platinumX4Draft = generateSeriesDraft({
  profileId: platinumX4Profile.id,
  category: platinumX4Profile.category,
  group: platinumX4Profile.group,
  seriesName: platinumX4Profile.seriesName,
  code: platinumX4Profile.code,
  categorySummaryRawText: `
    Бытовые мобильные кондиционеры
    Мобильные кондиционеры Platinum X4 BPHS-HX не нуждаются в профессиональном монтаже.
    Они охлаждают, обогревают, вентилируют и осушают, поддерживают SMART-режим, TURBO, Auto Swing и Touch-панель.
  `,
  technicalRawText: `
    Технические характеристики BPHS-HX
    Холодопроизводительность BTU 9000 12000 14000
    Класс энергоэффективности A
    Уровень шума 49 47 48
    Габариты 420x720x360 мм
    Вес 29 31 33 кг
  `,
  technicalPages: [55],
});
assert.ok(platinumX4Draft.salesFeatures.length > 0, 'mobile salesFeatures must not be empty');
assert.equal(platinumX4Draft.shortDescription, '', 'mobile shortDescription may stay empty without manual/legacy profile');
assert.equal(platinumX4Draft.positioning, '', 'mobile positioning may stay empty without manual/legacy profile');
assert.match(platinumX4Draft.salesFeatures.join('\n'), /монтаж|SMART|TURBO|Auto Swing|Touch/iu, 'mobile salesFeatures must include mobile category features');
assert.deepEqual(platinumX4Draft.salesArguments, [], 'mobile salesArguments may stay empty without manual/legacy profile');
assert.equal(platinumX4Draft.diagnostics.warnings.includes('Продажные особенности не найдены.'), false, 'mobile warnings must not complain about salesFeatures');
assert.equal(platinumX4Draft.diagnostics.warnings.includes('Краткое описание не заполнено.'), false, 'mobile warnings must not complain about shortDescription');
assert.equal(platinumX4Draft.diagnostics.warnings.includes('Позиционирование не заполнено.'), false, 'mobile warnings must not complain about positioning');

const platinumX4StabilityDraft = generateSeriesDraft({
  profileId: platinumX4Profile.id,
  category: platinumX4Profile.category,
  group: platinumX4Profile.group,
  seriesName: platinumX4Profile.seriesName,
  code: platinumX4Profile.code,
  exactSeriesRawText: `
    Мобильные кондиционеры Platinum X4 BPHS-HX поддерживают SMART-режим, TURBO, Auto Swing и Touch-панель.
    Пульт в комплекте, конструкция использует 2 независимых вентилятора, режимы охлаждение и обогрев.
  `,
  technicalRawText: `
    Параметр / Модель BPHS-09 HX/N3 BPHS-12 HX/N3 BPHS-14 HX/N3
    Холодопроизводительность Вт 2600 3500 4200
    Холодопроизводительность BTU 9000 12000 14000
    Класс энергоэффективности A A A
    Хладагент R410a R410a R410a
    Расход воздуха м³/ч 390 390 390
    Уровень шума дБ 49 47 48
    Потребляемая мощность (охлаждение) Вт 1360 1370 2000
    Номинальный ток охлаждение А 5,9 6,8 9
    Электропитание В/Гц 220-240 ~ 50 220-240 ~ 50 220-240 ~ 50
    Габариты прибора мм 419×358×688 419×358×688 419×358×688
    Габариты упаковки мм 460×396×865 460×396×865 460×396×865
    Вес нетто/брутто кг 23,8/27,4 27,3/31,2 28,1/32
    Модель A, мм B, мм C, мм L, мм D, мм
    BPHS-09 HX/N3 419 358 688 1500 150
    BPHS-12 HX/N3 419 358 688 1500 150
    BPHS-14 HX/N3 419 358 688 1500 150
  `,
  exactSeriesPages: [56],
  technicalPages: [57],
});
const platinumX4StabilitySpecsText = platinumX4StabilityDraft.importantSpecs.join('\n');
const platinumX4StabilityFeaturesText = platinumX4StabilityDraft.catalogExtract.factualFeatures.join('\n');
for (const expectedFeaturePattern of [/SMART-режим/iu, /TURBO/iu, /Auto[- ]?Swing/iu, /Touch-панель/iu, /пульт в комплекте/iu, /2 независимых вентилятора/iu, /охлаждение/iu, /обогрев/iu]) {
  assert.match(platinumX4StabilityFeaturesText, expectedFeaturePattern, `Platinum X4 factualFeatures must contain ${expectedFeaturePattern}`);
}
for (const expectedSpec of [
  'производительность охлаждения 2600/3500/4200 Вт',
  'производительность охлаждения 9000/12000/14000 BTU',
  'класс энергоэффективности A',
  'хладагент R410a',
  'расход воздуха 390 м³/ч',
  'уровень шума 49/47/48 дБ',
  'потребляемая мощность 1360/1370/2000 Вт',
  'номинальный ток охлаждения 5,9/6,8/9 А',
  'питание 220–240 В / 50 Гц',
  'габариты 419×358×688 мм',
  'габариты упаковки 460×396×865 мм',
  'вес нетто/брутто 23,8/27,4 и 27,3/31,2 и 28,1/32 кг',
  'воздуховод: 1500 мм, Ø150 мм',
]) {
  assert.ok(platinumX4StabilityDraft.importantSpecs.includes(expectedSpec), `Platinum X4 importantSpecs must contain ${expectedSpec}`);
  assert.ok(platinumX4StabilityDraft.technicalSpecs.includes(expectedSpec), `Platinum X4 technicalSpecs must contain ${expectedSpec}`);
  assert.ok(platinumX4StabilityDraft.catalogExtract.importantSpecs.includes(expectedSpec), `Platinum X4 catalogExtract.importantSpecs must contain ${expectedSpec}`);
  assert.ok(platinumX4StabilityDraft.catalogExtract.diagnostics.foundTechnicalSpecs.includes(expectedSpec), `Platinum X4 diagnostics.foundTechnicalSpecs must contain ${expectedSpec}`);
}
assert.equal(platinumX4StabilitySpecsText.includes('производительность охлаждения 2600 Вт'), false, 'Platinum X4 importantSpecs must not contain partial cooling W value');
assert.equal(platinumX4StabilitySpecsText.includes('производительность охлаждения 9000 BTU'), false, 'Platinum X4 importantSpecs must not contain partial cooling BTU value');
assert.equal(platinumX4StabilitySpecsText.includes('потребляемая мощность 1360 Вт'), false, 'Platinum X4 importantSpecs must not contain partial consumed power value');
assert.deepEqual(platinumX4StabilityDraft.catalogExtract.diagnostics.foundModels, ['BPHS-09 HX/N3', 'BPHS-12 HX/N3', 'BPHS-14 HX/N3'], 'Platinum X4 diagnostics.foundModels must contain concrete models only');
assert.deepEqual(platinumX4StabilityDraft.salesArguments, [], 'Platinum X4 salesArguments may stay empty without manual/legacy profile');
assert.equal(platinumX4StabilityDraft.shortDescription, '', 'Platinum X4 shortDescription may stay empty without manual/legacy profile');
assert.equal(platinumX4StabilityDraft.positioning, '', 'Platinum X4 positioning may stay empty without manual/legacy profile');
assert.equal(Array.isArray(platinumX4StabilityDraft.catalogExtract.importantSpecs), true, 'Platinum X4 catalogExtract.importantSpecs must stay an array');


const smartInverterProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'Smart Inverter');
const smartInverterDraft = generateSeriesDraft({
  profileId: smartInverterProfile.id,
  category: smartInverterProfile.category,
  group: smartInverterProfile.group,
  seriesName: smartInverterProfile.seriesName,
  code: smartInverterProfile.code,
  exactSeriesRawText: `
    Мобильный кондиционер Ballu Smart Inverter сочетает мобильность с передовой инвертерной технологией.
    Его ключевой плюс — минимальный уровень шума всего 40 дБ, что позволяет использовать прибор даже в спальне.
    Благодаря плавной регулировке частоты вращения компрессора устройство потребляет на 20–30% меньше электроэнергии по сравнению с on-off аналогами.
    Такая технология также обеспечивает точное поддержание температуры с погрешностью до ±0,5 °C и продлевает срок службы прибора.
    Wi-Fi управление, SMART режим, Touch-панель, 4 режима работы и 24 часа таймер.
  `,
  categorySummaryRawText: `
    Бытовые мобильные кондиционеры можно перемещать между помещениями.
    Они не нуждаются в специальном месте установки и не требуют профессионального монтажа.
    Пользоваться можно сразу после включения в сеть: устройства быстро охлаждают, обогревают, вентилируют и осушают воздух.
  `,
  technicalRawText: `
    BPAC-12 IN/N6
    Производительность охлаждение/обогрев Вт 3500/2930
    Производительность охлаждение/обогрев BTU 12000/10000
    Класс энергоэффективности А++
    Расход воздуха 450
    Уровень шума 39
    Хладагент R290
    Электропитание 220–240 В / 50 Гц
    Номинальная мощность охлаждение/обогрев 975/810 Вт
    Номинальный ток 4,8/4,6 А
    Размеры прибора 450×745×396
    Габариты упаковки 499×880×459
    Вес 31,1/35,5
  `,
  exactSeriesPages: [53],
  technicalPages: [53],
  sourceDate: '2026',
});
assert.equal(smartInverterDraft.salesFeatures.length >= 10, true, 'Smart Inverter salesFeatures must contain at least 10 points');
assert.ok(smartInverterDraft.salesFeatures.includes('инверторная технология'), 'Smart Inverter salesFeatures must include inverter technology');
assert.ok(smartInverterDraft.salesFeatures.includes('низкий уровень шума 40 дБ'), 'Smart Inverter salesFeatures must include 40 dB noise');
assert.equal(
  smartInverterDraft.salesFeatures.includes('экономия электроэнергии 20–30%') || smartInverterDraft.salesFeatures.includes('экономия энергии 20%'),
  true,
  'Smart Inverter salesFeatures must include energy saving',
);
assert.ok(smartInverterDraft.salesFeatures.includes('точное поддержание температуры'), 'Smart Inverter salesFeatures must include exact temperature support');
assert.ok(smartInverterDraft.salesFeatures.includes('энергоэффективность A++'), 'Smart Inverter salesFeatures must include A++ energy efficiency');
assert.ok(smartInverterDraft.salesFeatures.includes('R290 эко-фреон'), 'Smart Inverter salesFeatures must include R290');
assert.ok(smartInverterDraft.mainAdvantages.includes('инверторная технология'), 'Smart Inverter mainAdvantages must include inverter technology');
assert.ok(smartInverterDraft.mainAdvantages.includes('низкий уровень шума 40 дБ'), 'Smart Inverter mainAdvantages must include 40 dB noise');
assert.ok(smartInverterDraft.mainAdvantages.includes('энергоэффективность A++'), 'Smart Inverter mainAdvantages must include A++ energy efficiency');
assert.equal(
  smartInverterDraft.mainAdvantages.every((feature) => /smart|touch|охлаждение/iu.test(feature)),
  false,
  'Smart Inverter mainAdvantages must not be limited to SMART/Touch/cooling',
);
assert.equal(smartInverterDraft.shortDescription, '', 'Smart Inverter shortDescription may stay empty without manual/legacy profile');
assert.equal(smartInverterDraft.positioning, '', 'Smart Inverter positioning may stay empty without manual/legacy profile');
assert.match(smartInverterDraft.importantSpecs.join('\n'), /BTU|Вт|Уровень шума|R290|Размеры|Вес/iu, 'Smart Inverter importantSpecs must include BTU, W, noise, R290, dimensions and weight');
assert.equal(/technicalPage(?!s:?\s*\d)|undefined|null|\[object Object\]/iu.test(smartInverterDraft.sourceRefs.importantSpecs), false, 'Smart Inverter source label must not contain garbage technicalPage labels');


const smartInverterEvoProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'Smart Inverter EVO');
const smartInverterEvoDraft = generateSeriesDraft({
  profileId: smartInverterEvoProfile.id,
  category: smartInverterEvoProfile.category,
  group: smartInverterEvoProfile.group,
  seriesName: smartInverterEvoProfile.seriesName,
  code: smartInverterEvoProfile.code,
  exactSeriesRawText: `
    Smart Inverter EVO использует современную инверторную технологию мобильного кондиционера.
    Технология нужна для точного и экономичного поддержания комфортной температуры.
    Серия обеспечивает исключительно тихая работа благодаря инверторного компрессора и дополнительной шумоизоляции.
    Уровня шума всего 40 дБ, сравнимо с тихой речью.
    Доступно управление с помощью смартфона, Wi-Fi управление и Touch-панель.
    Высокий класс энергоэффективности A+, энергопотребление менее 1 кВт/ч.
    Предусмотрены 4 режима работы, R290 эко фреон и 24 часа таймер.
  `,
  categorySummaryRawText: `
    Бытовые мобильные кондиционеры можно перемещать из одного помещения в другое.
    Они не нуждаются в специальном месте установки и не требуют профессионального монтажа.
    Пользоваться можно сразу после включения в сеть: устройства быстро охлаждают, обогревают, вентилируют и осушают воздух.
  `,
  technicalRawText: `
    Технические характеристики BPAC-12 IE/N6 BPAC-14 IE/N6
    Холодопроизводительность, Вт 3500 4000
    Холодопроизводительность, BTU 12000 14000
    Класс энергоэффективности A+ A+
    Хладагент R290 R290
    Расход воздуха, м³/ч 440 460
    Уровень шума, дБ 40 40
    Потребляемая мощность, Вт 975 1050
    Номинальный ток, А 4,4 4,8
    Электропитание, В/Гц 220-240/50 220-240/50
    Габариты прибора, мм 440×350×740 440×350×740
    Габариты упаковки, мм 480×390×880 480×390×880
    Вес нетто/брутто, кг 28,5/33 29,5/33,5
  `,
  exactSeriesPages: [110],
  technicalPages: [110, 111],
  sourceDate: '2026',
});
assert.equal(smartInverterEvoDraft.salesFeatures.length >= 8, true, 'Smart Inverter EVO salesFeatures must contain at least 8 points');
assert.ok(smartInverterEvoDraft.salesFeatures.includes('инверторная технология'), 'Smart Inverter EVO salesFeatures must include inverter technology');
assert.ok(smartInverterEvoDraft.salesFeatures.includes('низкий уровень шума 40 дБ'), 'Smart Inverter EVO salesFeatures must include 40 dB noise');
assert.equal(
  smartInverterEvoDraft.salesFeatures.includes('Wi-Fi управление') || smartInverterEvoDraft.salesFeatures.includes('управление со смартфона'),
  true,
  'Smart Inverter EVO salesFeatures must include Wi-Fi or smartphone control',
);
assert.ok(smartInverterEvoDraft.salesFeatures.includes('энергоэффективность A+'), 'Smart Inverter EVO salesFeatures must include A+ energy efficiency');
assert.ok(smartInverterEvoDraft.mainAdvantages.includes('инверторная технология'), 'Smart Inverter EVO mainAdvantages must include inverter technology');
assert.ok(smartInverterEvoDraft.mainAdvantages.includes('низкий уровень шума 40 дБ'), 'Smart Inverter EVO mainAdvantages must include 40 dB noise');
assert.ok(smartInverterEvoDraft.mainAdvantages.includes('энергоэффективность A+'), 'Smart Inverter EVO mainAdvantages must include A+ energy efficiency');
assert.equal(
  smartInverterEvoDraft.mainAdvantages.every((feature) => /wi-?fi|touch|охлаждение/iu.test(feature)),
  false,
  'Smart Inverter EVO mainAdvantages must not be limited to Wi-Fi/Touch/cooling',
);
assert.equal(smartInverterEvoDraft.shortDescription, '', 'Smart Inverter EVO shortDescription may stay empty without manual/legacy profile');
assert.equal(smartInverterEvoDraft.positioning, '', 'Smart Inverter EVO positioning may stay empty without manual/legacy profile');
assert.match(smartInverterEvoDraft.importantSpecs.join('\n'), /BTU|R290|Уровень шума|Габариты/iu, 'Smart Inverter EVO importantSpecs must include BTU, R290, noise and dimensions');
assert.equal(/technicalPages:? 110–111/u.test(smartInverterEvoDraft.sourceRefs.importantSpecs), true, 'Smart Inverter EVO sourceRef must format technical page range');
for (const expectedFeaturePattern of [/инверторная технология/iu, /низкий уровень шума 40 дБ/iu, /управление со смартфона/iu, /Wi-Fi управление/iu, /энергоэффективность A\+/iu, /энергопотребление менее 1 кВт\/ч/iu, /R290 эко-фреон/iu, /24-часовой таймер/iu, /4 режима работы/iu, /сенсорная Touch-панель/iu]) {
  assert.match(smartInverterEvoDraft.catalogExtract.factualFeatures.join('\n'), expectedFeaturePattern, `Smart Inverter EVO factualFeatures must contain ${expectedFeaturePattern}`);
}
const smartInverterEvoStabilityDraft = generateSeriesDraft({
  profileId: smartInverterEvoProfile.id,
  category: smartInverterEvoProfile.category,
  group: smartInverterEvoProfile.group,
  seriesName: smartInverterEvoProfile.seriesName,
  code: smartInverterEvoProfile.code,
  exactSeriesRawText: `
    Мобильный кондиционер Smart Inverter EVO BPAC-IE использует инверторную технологию.
    Низкий уровень шума 40 дБ, управление со смартфона, Wi-Fi управление, энергоэффективность A+.
    Энергопотребление менее 1 кВт/ч, R290 эко-фреон, 24-часовой таймер, 4 режима работы.
    Сенсорная Touch-панель и тангенциальный вентилятор снижает шум.
  `,
  technicalRawText: `
    Параметр / Модель BPAC-12 IE / N6 BPAC-14 IE / N6
    Холодопроизводительность Вт 3500 4000
    Холодопроизводительность BTU 12000 14000
    Класс энергоэффективности A+ A+
    Хладагент R290 R290
    Расход воздуха м³/ч 440 460
    Уровень шума дБ 40 40
    Потребляемая мощность (охлаждение) Вт 975 1050
    Номинальный ток охлаждение А 5,8 6,9
    Электропитание В/Гц 220-240V 50Hz 220-240V 50Hz
    Габариты прибора мм 440×350×740 440×350×740
    Габариты упаковки мм 500×410×870 500×410×870
    Вес нетто/брутто кг 28,5/33 29,5/33,5
    Модель A, мм B, мм C, мм L, мм D, мм
    BPAC-12 IE/N6 440 350 740 1500 150
    BPAC-14 IE/N6 440 350 740 1500 150
  `,
  exactSeriesPages: [112],
  technicalPages: [113],
});
for (const expectedFeaturePattern of [/инверторная технология/iu, /низкий уровень шума 40 дБ/iu, /управление со смартфона/iu, /Wi-Fi управление/iu, /энергоэффективность A\+/iu, /энергопотребление менее 1 кВт\/ч/iu, /R290 эко-фреон/iu, /24-часовой таймер/iu, /4 режима работы/iu, /сенсорная Touch-панель/iu, /тангенциальный вентилятор снижает шум/iu]) {
  assert.match(smartInverterEvoStabilityDraft.catalogExtract.factualFeatures.join('\n'), expectedFeaturePattern, `Smart Inverter EVO stability factualFeatures must contain ${expectedFeaturePattern}`);
}
for (const expectedSpec of [
  'производительность охлаждения 3500/4000 Вт',
  'производительность охлаждения 12000/14000 BTU',
  'класс энергоэффективности A+',
  'хладагент R290',
  'расход воздуха 440/460 м³/ч',
  'уровень шума 40 дБ',
  'потребляемая мощность 975/1050 Вт',
  'номинальный ток охлаждения 5,8/6,9 А',
  'питание 220–240 В / 50 Гц',
  'габариты 440×350×740 мм',
  'габариты упаковки 500×410×870 мм',
  'вес нетто/брутто 28,5/33 и 29,5/33,5 кг',
  'воздуховод: 1500 мм, Ø150 мм',
]) {
  assert.ok(smartInverterEvoStabilityDraft.importantSpecs.includes(expectedSpec), `Smart Inverter EVO importantSpecs must contain ${expectedSpec}`);
  assert.ok(smartInverterEvoStabilityDraft.technicalSpecs.includes(expectedSpec), `Smart Inverter EVO technicalSpecs must contain ${expectedSpec}`);
  assert.ok(smartInverterEvoStabilityDraft.catalogExtract.importantSpecs.includes(expectedSpec), `Smart Inverter EVO catalogExtract.importantSpecs must contain ${expectedSpec}`);
  assert.ok(smartInverterEvoStabilityDraft.catalogExtract.diagnostics.foundTechnicalSpecs.includes(expectedSpec), `Smart Inverter EVO diagnostics.foundTechnicalSpecs must contain ${expectedSpec}`);
}
const smartInverterEvoStabilitySpecsText = smartInverterEvoStabilityDraft.importantSpecs.join(' ');
assert.equal(smartInverterEvoStabilitySpecsText.includes('производительность охлаждения 3500 Вт'), false, 'Smart Inverter EVO importantSpecs must not contain partial cooling W value');
assert.equal(smartInverterEvoStabilitySpecsText.includes('производительность охлаждения 12000 BTU'), false, 'Smart Inverter EVO importantSpecs must not contain partial cooling BTU value');
assert.equal(smartInverterEvoStabilitySpecsText.includes('потребляемая мощность 975 Вт'), false, 'Smart Inverter EVO importantSpecs must not contain partial consumed power value');
assert.deepEqual(smartInverterEvoStabilityDraft.catalogExtract.diagnostics.foundModels, ['BPAC-12 IE/N6', 'BPAC-14 IE/N6'], 'Smart Inverter EVO diagnostics.foundModels must contain concrete models only');
assert.deepEqual(smartInverterEvoStabilityDraft.salesArguments, [], 'Smart Inverter EVO salesArguments may stay empty without manual/legacy profile');
assert.equal(smartInverterEvoStabilityDraft.shortDescription, '', 'Smart Inverter EVO shortDescription may stay empty without manual/legacy profile');
assert.equal(smartInverterEvoStabilityDraft.positioning, '', 'Smart Inverter EVO positioning may stay empty without manual/legacy profile');
assert.equal(Array.isArray(smartInverterEvoStabilityDraft.catalogExtract.importantSpecs), true, 'Smart Inverter EVO catalogExtract.importantSpecs must stay an array');
assert.equal(/A\+\+|±0,5|экономия энергии 20%|HEAVY PRO|HEAVY INDUSTRIAL/iu.test(stringifyDraft(smartInverterEvoStabilityDraft)), false, 'Smart Inverter EVO must not receive Smart Inverter/Heavy Pro-only facts');

const waterHeaterSource = {
  brand: 'Ballu',
  category: 'Водонагреватели',
  group: 'Накопительные водонагреватели',
  seriesName: 'TEST WATER',
  code: 'BWH',
  exactSeriesRawText: `
    Водонагреватели TEST WATER
    Накопительный водонагреватель с сухим ТЭНом, магниевым анодом, защитой от перегрева и универсальным монтажом.
  `,
  technicalRawText: `
    Технические характеристики TEST WATER
    Объём бака, л 50 80 100
    Мощность, кВт 1.5 2.0
    Тип ТЭНа сухой ТЭН
    Защита от перегрева и включения без воды
    Монтаж вертикальный / горизонтальный
  `,
};
const waterHeaterProfile = getCategoryExtractionProfile(waterHeaterSource);
const waterHeaterDraft = generateSeriesDraft(waterHeaterSource);
assert.equal(waterHeaterProfile.id, 'waterHeater', 'waterHeater categoryProfile must be detected');
assert.equal(waterHeaterDraft.shortDescription, '', 'waterHeater shortDescription may stay empty without manual/legacy profile');
assert.equal(waterHeaterDraft.positioning, '', 'waterHeater positioning may stay empty without manual/legacy profile');
assert.match(waterHeaterDraft.importantSpecs.join('\n'), /Объём|Мощность|ТЭН|Защита|Монтаж/iu, 'waterHeater importantSpecs must include volume/power/heater/protection/mounting');


const ecoCoolProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'ECO COOL');
const ecoCoolDraft = generateSeriesDraft({
  profileId: ecoCoolProfile.id,
  category: ecoCoolProfile.category,
  group: ecoCoolProfile.group,
  seriesName: 'ECO COOL',
  code: 'BPAC-CC',
  exactSeriesRawText: `
    Ballu Eco Cool — первый мобильный кондиционер, работающий без воздуховода. Вместо этого он использует воду из встроенного бака для охлаждения конденсатора. Инженерное решение позволило минимизировать тепловыделение: температура воздуха с конденсатора всего на 2–3°C выше комнатной. Прибор способен создать и поддерживать комфортный микроклимат на площади до 7 м². Минимальное энергопотребление в 250 Вт делает прибор не только эффективным, но и экономичным.
  `,
  technicalRawText: `
    ECO COOL A++ класс энергоэффективности Подключение без воздуховода AUTO режим работы COMPACT минимальные габариты R290 эко фреон AUTO-SWING жалюзи Пульт управления в комплекте
    Параметр / Модель BPAC-02 CC/N6 Холодопроизводительность Вт 600 Холодопроизводительность BTU 2000 Класс энергоэффективности (охлаждение) A Хладагент R290 Расход воздуха м³/ч 150 Уровень шума ДБа 42 Потребляемая мощность (охлаждение) Вт 250 Номинальный ток (охлаждение) A 4,1 Электропитание В-Гц 220-240V 50Hz Габариты (Ш×Г×В) мм 325×275×585 Габариты в упаковке (Ш×Г×В) мм 380×310×632 Вес нетто/брутто кг 14/15
  `,
  exactSeriesPages: [120],
  technicalPages: [121],
});
const ecoCoolSpecsText = ecoCoolDraft.importantSpecs.join('\n');
assert.ok(ecoCoolDraft.salesFeatures.includes('без воздуховода'), 'ECO COOL salesFeatures must include no duct');
assert.ok(ecoCoolDraft.salesFeatures.includes('использует воду из встроенного бака'), 'ECO COOL salesFeatures must include built-in tank water');
assert.ok(ecoCoolDraft.salesFeatures.includes('площадь до 7 м²'), 'ECO COOL salesFeatures must include 7 m² area');
assert.ok(ecoCoolDraft.salesFeatures.includes('энергопотребление 250 Вт'), 'ECO COOL salesFeatures must include 250 W power use');
assert.ok(ecoCoolDraft.mainAdvantages.includes('без воздуховода'), 'ECO COOL mainAdvantages must include no duct');
assert.ok(ecoCoolDraft.mainAdvantages.includes('использует воду из встроенного бака'), 'ECO COOL mainAdvantages must include built-in tank water');
assert.equal(ecoCoolDraft.shortDescription, '', 'ECO COOL shortDescription may stay empty without manual/legacy profile');
assert.equal(ecoCoolDraft.positioning, '', 'ECO COOL positioning may stay empty without manual/legacy profile');
assert.match(ecoCoolSpecsText, /воздуховод не требуется/iu, 'ECO COOL importantSpecs must say duct is not required');
assert.equal(/длина воздуховода|диаметр воздуховода/iu.test(ecoCoolSpecsText), false, 'ECO COOL importantSpecs must not include fake duct dimensions');
assert.match(ecoCoolSpecsText, /600 Вт/iu, 'ECO COOL importantSpecs must include 600 W cooling capacity');
assert.match(ecoCoolSpecsText, /2000 BTU/iu, 'ECO COOL importantSpecs must include 2000 BTU');
assert.match(ecoCoolSpecsText, /R290/iu, 'ECO COOL importantSpecs must include R290');
assert.match(ecoCoolSpecsText, /42 дБ/iu, 'ECO COOL importantSpecs must include 42 dB');
assert.match(ecoCoolSpecsText, /250 Вт/iu, 'ECO COOL importantSpecs must include 250 W');
assert.ok(ecoCoolDraft.importantSpecs.includes('потребляемая мощность 250 Вт'), 'ECO COOL importantSpecs must contain normalized consumed power in W');
assert.match(ecoCoolSpecsText, /325×275×585/iu, 'ECO COOL importantSpecs must include product dimensions');
assert.match(ecoCoolSpecsText, /14\/15 кг/iu, 'ECO COOL importantSpecs must include net/gross weight');
assert.equal(/undefined|null|\[object Object\]/iu.test(stringifyDraft(ecoCoolDraft)), false, 'ECO COOL draft must not contain garbage placeholders');
assert.deepEqual(ecoCoolDraft.catalogExtract.diagnostics.foundModels, ['BPAC-02 CC/N6'], 'ECO COOL diagnostics.foundModels must contain concrete model only');

const orbisDuctDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Кондиционирование',
  group: 'Бытовые мобильные кондиционеры',
  seriesName: 'ORBIS',
  code: 'BPAC-OR',
  exactSeriesRawText: 'ORBIS мобильные кондиционеры Ballu не требуют профессионального монтажа.',
  technicalRawText: 'Модель A, мм B, мм C, мм L, мм D, мм ORBIS BPAC-07 OR/N6 310 680 350 1500 150 BPAC-09 OR/N6 310 680 350 1500 150',
  exactSeriesPages: [130],
  technicalPages: [131],
});
const orbisDuctSpecsText = orbisDuctDraft.importantSpecs.join('\n');
assert.equal(/воздуховод:\s*1500 мм, Ø150 мм|длина воздуховода 1500 мм[\s\S]*диаметр воздуховода 150 мм/iu.test(orbisDuctSpecsText), true, 'ORBIS importantSpecs must include duct L/D dimensions');
assert.equal(/воздуховод не требуется/iu.test(orbisDuctSpecsText), false, 'ORBIS importantSpecs must not say duct is not required');

const variableDuctDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Кондиционирование',
  group: 'Бытовые мобильные кондиционеры',
  seriesName: 'TEST MOBILE',
  code: 'BPAC-X',
  exactSeriesRawText: 'TEST MOBILE бытовые мобильные кондиционеры Ballu.',
  technicalRawText: 'Модель A, мм B, мм C, мм L, мм D, мм BPAC-07 X 310 680 350 1200 136 BPAC-09 X 310 680 350 1500 154',
  exactSeriesPages: [140],
  technicalPages: [141],
});
const variableDuctSpecsText = variableDuctDraft.importantSpecs.join('\n');
assert.match(variableDuctSpecsText, /длина воздуховода 1200–1500 мм/iu, 'variable duct importantSpecs must include length range');
assert.match(variableDuctSpecsText, /диаметр воздуховода 136–154 мм/iu, 'variable duct importantSpecs must include diameter range');
assert.equal(/undefined|null|\[object Object\]/iu.test(`${orbisDuctSpecsText}\n${variableDuctSpecsText}`), false, 'duct specs must not contain garbage placeholders');

{
const smartInverterMixedRawText = `
Промышленные мобильные кондиционеры
Smart inverter HEAVY PRO
Параметр / Модель BGK15 BGK18
Производительность (охлаждение) Вт 15 000 18 000
Производительность (охлаждение) BTU 51 000 62 000
Расход воздуха 2500 м³/ч
Уровень шума 65/75 дБ
Габариты 1360×1030×820 мм
Вес нетто/брутто 172/253 182/262 кг
площадь до 320 м²

Бытовые мобильные кондиционеры
SMART INVERTER
Параметр / Модель BPAC-12 IN / N6
Производительность (охлаждение/обогрев) Вт 3500 / 2930
Производительность (охлаждение/обогрев) BTU 12000 / 10000
Класс энергоэффективности, (EER) А++
Расход воздуха м 3 /ч 450
Уровень шума дБ(А) 39
Напряжение питания В~Гц/Ф 220-240 ~ 50
Номинальная мощность (охлаждение/обогрев) Вт 975 / 810
Номинальный ток (охлаждение/обогрев) А 4,8 / 4,6
Размеры прибора (Ш×В×Г) мм 450×745×396
Габариты упаковки (Ш×В×Г) мм 499×880×459
Вес нетто/брутто кг 31,1 / 35,5
Мобильный кондиционер Ballu Smart Inverter сочетает мобильность с передовой инвертерной технологией. Плавная регулировка компрессора обеспечивает точное поддержание температуры до ±0,5 °C и стабильную температуру. Низкий уровень шума 40 дБ подходит для спальни, экономия энергии 20%. 4 режима работы: охлаждение, обогрев, вентиляция, осушение. Wi-Fi управление, SMART-режим, R290 эко-фреон, 24-часовой таймер, пульт с подсветкой.
Модель A, мм B, мм C, мм L, мм D, мм
Smart Inverter
BPAC-IN 450 745 396 1500 150

Бытовые мобильные кондиционеры
INVERTER EVO
Параметр / Модель BPAC-12 IE / N6 BPAC-14 IE / N6
Холодопроизводительность Вт 3500 4000
Класс энергоэффективности A+ A+
энергопотребление менее 1 кВт/ч
сенсорная Touch-панель
тангенциальный вентилятор снижает шум

Промышленные мобильные осушители воздуха
Smart inverter HEAVY INDUSTRIAL
Параметр / Модель BDI-70L BDI-100L
`;

const smartInverterBpacInProfile = SERIES_PROFILES.find((profile) => profile.seriesName === 'Smart Inverter' && profile.code === 'BPAC-IN');
assert.equal(
  classifyPageForSeries({ pageNumber: 53, text: 'Промышленные мобильные кондиционеры Smart inverter HEAVY PRO Параметр / Модель BGK15 BGK18' }, smartInverterBpacInProfile).belongsToSeries,
  false,
  'Smart Inverter classifier must reject Heavy Pro page without BPAC-IN/BPAC-12 IN code',
);
assert.equal(
  classifyPageForSeries({ pageNumber: 55, text: 'Бытовые мобильные кондиционеры SMART INVERTER Параметр / Модель BPAC-12 IN / N6' }, smartInverterBpacInProfile).belongsToSeries,
  true,
  'Smart Inverter classifier must accept household BPAC-12 IN/N6 page',
);
assert.equal(
  classifyPageForSeries({ pageNumber: 56, text: 'Бытовые мобильные кондиционеры Smart Inverter EVO Параметр / Модель BPAC-12 IE / N6 BPAC-14 IE / N6' }, smartInverterBpacInProfile).belongsToSeries,
  false,
  'Smart Inverter classifier must reject EVO page without BPAC-IN/BPAC-12 IN code',
);

const smartInverterDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Кондиционирование',
  group: 'Бытовые мобильные кондиционеры',
  seriesName: 'Smart Inverter',
  code: 'BPAC-IN',
  exactSeriesRawText: smartInverterMixedRawText,
  technicalRawText: smartInverterMixedRawText,
  exactSeriesPages: [55],
  technicalPages: [55],
});
const smartInverterImportantSpecsText = smartInverterDraft.importantSpecs.join(' ');
const smartInverterCatalogSpecsText = smartInverterDraft.catalogExtract.importantSpecs.join(' ');
const smartInverterFeaturesText = smartInverterDraft.catalogExtract.factualFeatures.join(' ');
assert.ok(smartInverterDraft.importantSpecs.includes('номинальная мощность охлаждения/обогрева 975/810 Вт'), 'Smart Inverter importantSpecs must keep nominal cooling/heating power in W');
for (const expectedSpec of [
  'производительность охлаждения/обогрева 3500/2930 Вт',
  'производительность охлаждения/обогрева 12000/10000 BTU',
  'класс энергоэффективности A++',
  'расход воздуха 450 м³/ч',
  'уровень шума 39 дБ',
  'питание 220–240 В / 50 Гц',
  'номинальная мощность охлаждения/обогрева 975/810 Вт',
  'номинальный ток охлаждения/обогрева 4,8/4,6 А',
  'габариты 450×745×396 мм',
  'габариты упаковки 499×880×459 мм',
  'вес нетто/брутто 31,1/35,5 кг',
  'хладагент R290',
  'воздуховод: 1500 мм, Ø150 мм',
]) {
  assert.ok(smartInverterDraft.importantSpecs.includes(expectedSpec), `Smart Inverter importantSpecs must contain ${expectedSpec}`);
  assert.ok(smartInverterCatalogSpecsText.includes(expectedSpec), `Smart Inverter catalogExtract.importantSpecs must contain ${expectedSpec}`);
}
for (const forbiddenPattern of [/15\s*\/\s*000|15\s*000/iu, /51\s*\/\s*000|51\s*000/iu, /1360×1030×820/iu, /172\s*\/\s*253/iu, /площадь до 320/iu, /BGK15/iu, /HEAVY PRO/iu, /HEAVY INDUSTRIAL/iu, /BDI-70L/iu, /осушители/iu, /BPAC-12 IE/iu, /энергоэффективность A\+(?!\+)/iu, /сенсорная Touch-панель/iu, /тангенциальный вентилятор/iu, /энергопотребление менее 1 кВт\/ч/iu]) {
  assert.equal(forbiddenPattern.test(`${smartInverterImportantSpecsText} ${smartInverterCatalogSpecsText} ${smartInverterFeaturesText}`), false, `Smart Inverter draft must not leak ${forbiddenPattern}`);
}
for (const expectedFeaturePattern of [/инверторная технология/iu, /плавная регулировка компрессора/iu, /низкий уровень шума 40 дБ/iu, /подходит для спальни/iu, /экономия энергии 20%/iu, /точное поддержание температуры/iu, /точность поддержания до ±0,5 °C/iu, /стабильная температура/iu, /4 режима работы/iu, /Wi-Fi управление/iu, /SMART-режим/iu, /R290 эко-фреон/iu, /энергоэффективность A\+\+/iu, /24-часовой таймер/iu, /пульт с подсветкой/iu, /охлаждение/iu, /обогрев/iu]) {
  assert.match(smartInverterFeaturesText, expectedFeaturePattern, `Smart Inverter factualFeatures must contain ${expectedFeaturePattern}`);
}
for (const specList of [smartInverterDraft.technicalSpecs, smartInverterDraft.importantSpecs, smartInverterDraft.catalogExtract.importantSpecs, smartInverterDraft.catalogExtract.diagnostics.foundTechnicalSpecs]) {
  assert.equal(specList.includes('номинальный ток охлаждения 4,8 А'), false, 'Smart Inverter specs must not contain partial nominal cooling current when cooling/heating current exists');
  assert.equal(specList.includes('R290'), false, 'Smart Inverter specs must not contain bare R290 when refrigerant spec exists');
}
assert.equal(smartInverterDraft.catalogExtract.diagnostics.seriesCode, 'BPAC-IN', 'Smart Inverter diagnostics.seriesCode must contain series code');
assert.equal(smartInverterDraft.catalogExtract.diagnostics.seriesName, 'Smart Inverter', 'Smart Inverter diagnostics.seriesName must contain series name');
assert.deepEqual(smartInverterDraft.catalogExtract.diagnostics.foundModels, ['BPAC-12 IN/N6'], 'Smart Inverter diagnostics.foundModels must contain concrete normalized model only');

}

const velureDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Кондиционирование',
  group: 'Бытовые мобильные кондиционеры',
  seriesName: 'Velure',
  code: 'BPAC-VEL',
  exactSeriesRawText: 'Изысканный дизайн Ballu Velure станет украшением современного интерьера. Помимо стильного внешнего вида прибор обладает широким функционалом: автоматическим приводом жалюзи, таймером, управлением по Wi-Fi. Фреон R290 делает прибор по-настоящему энергоэффективным. Приборы помогут создать комфортную атмосферу в помещениях площадью до 35 м². Скрытый LED-дисплей. Управление по Wi-Fi. VELURE текстильная панель / дизайн. VELURE тканевое покрытие. AUTO-SWING жалюзи. Шлюз для распашных окон в комплекте. Пульт управления в комплекте.',
  technicalRawText: `
    Параметр / Модель BPAC-12 EW/N6 BPAC-14 EW/N6
    Производительность (охлаждение) Вт 3500 4100
    Производительность (охлаждение) BTU 12000 14000
    Класс энергоэффективности (EER) A A
    Расход воздуха м 3 /ч 400 430
    Уровень шума дБ(А) 50 50
    Напряжение питания В~Гц,Ф 220-240 ~ 50 220-240 ~ 50
    Номинальная мощность (охлаждение) кВт 1330 1560
    Номинальный ток (охлаждение) А 5.8 6.8
    Размеры прибора (Ш×В×Г) мм 434×700×350 434×700×350
    Размеры упаковки (Ш×В×Г) мм 490×878×381 490×878×381
    Вес нетто/брутто кг 28 / 33 29,5 / 34,5
    Модель A, мм B, мм C, мм L, мм D, мм
    Velure BALLU BPAC-12/14 EW/N6 434 700 350 1500 150
  `,
  exactSeriesPages: [150],
  technicalPages: [151],
});
const velureFeaturesText = velureDraft.salesFeatures.join('\n');
const velureAdvantagesText = velureDraft.mainAdvantages.join('\n');
const velureSpecsText = velureDraft.importantSpecs.join('\n');
const velureCatalogDescriptionText = velureDraft.catalogExtract.descriptionsFromCatalog.join('\n');
const velureCatalogFeaturesText = velureDraft.catalogExtract.factualFeatures.join('\n');
const velureCatalogSpecsText = velureDraft.catalogExtract.importantSpecs.join('\n');
assert.equal(velureDraft.shortDescription, '', 'Velure shortDescription may stay empty without manual/legacy profile');
assert.equal(velureDraft.positioning, '', 'Velure positioning may stay empty without manual/legacy profile');
assert.deepEqual(velureDraft.salesArguments, [], 'Velure salesArguments may stay empty without manual/legacy profile');
assert.ok(velureDraft.catalogExtract, 'Velure draft must include catalogExtract');
assert.equal(Array.isArray(velureDraft.catalogExtract.descriptionsFromCatalog), true, 'Velure catalogExtract.descriptionsFromCatalog must be an array');
assert.equal(Array.isArray(velureDraft.catalogExtract.factualFeatures), true, 'Velure catalogExtract.factualFeatures must be an array');
assert.equal(Array.isArray(velureDraft.catalogExtract.importantSpecs), true, 'Velure catalogExtract.importantSpecs must be an array');
assert.match(velureCatalogDescriptionText, /Изысканный дизайн Ballu Velure/iu, 'Velure catalogExtract must keep description from catalog');
assert.match(velureFeaturesText, /изысканный дизайн/iu, 'Velure salesFeatures must include elegant design');
assert.match(velureFeaturesText, /текстильное покрытие|тканевое покрытие|текстильная панель/iu, 'Velure salesFeatures must include textile/fabric coating');
assert.match(velureFeaturesText, /Wi-Fi управление/iu, 'Velure salesFeatures must include Wi-Fi control');
assert.match(velureFeaturesText, /R290 эко-фреон/iu, 'Velure salesFeatures must include R290 eco refrigerant');
assert.match(velureCatalogFeaturesText, /Wi-Fi управление/iu, 'Velure catalogExtract.factualFeatures must include Wi-Fi control');
assert.match(velureCatalogFeaturesText, /R290 эко-фреон/iu, 'Velure catalogExtract.factualFeatures must include R290 eco refrigerant');
assert.match(velureCatalogFeaturesText, /скрытый LED-дисплей/iu, 'Velure catalogExtract.factualFeatures must include hidden LED display');
assert.match(velureCatalogFeaturesText, /текстильная панель \/ дизайн|текстильное покрытие|тканевое покрытие/iu, 'Velure catalogExtract.factualFeatures must include textile design fact');
assert.match(velureFeaturesText, /площадь до 35 м²/iu, 'Velure salesFeatures must include area up to 35 m²');
assert.match(velureFeaturesText, /Auto-Swing жалюзи/iu, 'Velure salesFeatures must include Auto-Swing louvers');
assert.match(velureFeaturesText, /шлюз для распашных окон в комплекте/iu, 'Velure salesFeatures must include casement window adapter');
assert.match(velureAdvantagesText, /изысканный дизайн/iu, 'Velure mainAdvantages must include elegant design');
assert.match(velureAdvantagesText, /для современного интерьера|текстильное покрытие|тканевое покрытие/iu, 'Velure mainAdvantages must include interior or textile positioning');
assert.match(velureAdvantagesText, /Wi-Fi управление/iu, 'Velure mainAdvantages must include Wi-Fi control');
assert.match(velureAdvantagesText, /R290 эко-фреон/iu, 'Velure mainAdvantages must include R290 eco refrigerant');
assert.match(velureAdvantagesText, /Auto-Swing жалюзи|автоматический привод жалюзи/iu, 'Velure mainAdvantages must include Auto-Swing/auto louvers');
assert.match(velureAdvantagesText, /площадь до 35 м²/iu, 'Velure mainAdvantages must include area when found');
const expectedVelureImportantSpecs = [
  'производительность охлаждения 3500/4100 Вт',
  'производительность охлаждения 12000/14000 BTU',
  'класс энергоэффективности A',
  'расход воздуха 400/430 м³/ч',
  'уровень шума 50 дБ',
  'питание 220–240 В / 50 Гц',
  'номинальная мощность охлаждения 1330/1560 Вт',
  'номинальный ток охлаждения 5.8/6.8 А',
  'габариты 434×700×350 мм',
  'габариты упаковки 490×878×381 мм',
  'вес нетто/брутто 28/33 и 29,5/34,5 кг',
  'воздуховод: 1500 мм, Ø150 мм',
];
for (const expectedSpec of expectedVelureImportantSpecs) {
  assert.ok(velureDraft.importantSpecs.includes(expectedSpec), `Velure importantSpecs must contain ${expectedSpec}`);
}
assert.ok(velureDraft.importantSpecs.includes('номинальная мощность охлаждения 1330/1560 Вт'), 'Velure importantSpecs must contain normalized nominal cooling power in W');
assert.equal(velureDraft.importantSpecs.join(' ').includes('1330/1560 кВт'), false, 'Velure importantSpecs must not contain nominal cooling power in kW');
assert.ok(velureDraft.catalogExtract.importantSpecs.includes('номинальная мощность охлаждения 1330/1560 Вт'), 'Velure catalogExtract.importantSpecs must contain normalized nominal cooling power in W');
assert.equal(velureDraft.catalogExtract.importantSpecs.join(' ').includes('1330/1560 кВт'), false, 'Velure catalogExtract.importantSpecs must not contain nominal cooling power in kW');
for (const [specListName, specList] of [
  ['technicalSpecs', velureDraft.technicalSpecs],
  ['catalogExtract.diagnostics.technicalSpecs', velureDraft.catalogExtract.diagnostics.technicalSpecs],
  ['catalogExtract.diagnostics.foundTechnicalSpecs', velureDraft.catalogExtract.diagnostics.foundTechnicalSpecs],
]) {
  assert.ok(specList.includes('номинальная мощность охлаждения 1330/1560 Вт'), `Velure ${specListName} must contain normalized nominal cooling power in W`);
  assert.equal(specList.join(' ').includes('1330/1560 кВт'), false, `Velure ${specListName} must not contain nominal cooling power in kW`);
}
assert.ok(velureDraft.catalogExtract.importantSpecs.includes('производительность охлаждения 3500/4100 Вт'), 'Velure catalogExtract.importantSpecs must contain normalized cooling capacity in W');
assert.ok(velureDraft.catalogExtract.importantSpecs.includes('расход воздуха 400/430 м³/ч'), 'Velure catalogExtract.importantSpecs must contain normalized airflow');
assert.ok(velureDraft.catalogExtract.importantSpecs.includes('воздуховод: 1500 мм, Ø150 мм'), 'Velure catalogExtract.importantSpecs must contain normalized duct dimensions');
assert.deepEqual(velureDraft.catalogExtract.diagnostics.foundModels, ['BPAC-12 EW/N6', 'BPAC-14 EW/N6'], 'Velure diagnostics.foundModels must contain concrete models only');
assert.equal(velureDraft.importantSpecs.includes('изысканный дизайн'), false, 'Velure importantSpecs must not contain elegant design sales feature');
assert.equal(velureDraft.importantSpecs.includes('Wi-Fi управление'), false, 'Velure importantSpecs must not contain Wi-Fi sales feature');
assert.equal(velureDraft.importantSpecs.includes('мобильное использование'), false, 'Velure importantSpecs must not contain mobile-use sales feature');
assert.equal(/воздуховод:\s*1500 мм, Ø150 мм|длина воздуховода 1500 мм[\s\S]*диаметр воздуховода 150 мм/iu.test(velureSpecsText), true, 'Velure importantSpecs must include duct L/D dimensions');
assert.equal(/воздуховод:\s*1500 мм, Ø150 мм|длина воздуховода 1500 мм[\s\S]*диаметр воздуховода 150 мм/iu.test(velureCatalogSpecsText), true, 'Velure catalogExtract.importantSpecs must include duct L/D dimensions');
assert.match(velureSpecsText, /434×700×350/iu, 'Velure importantSpecs must include product dimensions');
assert.match(velureSpecsText, /12000\/14000 BTU/iu, 'Velure importantSpecs must include BTU range');
assert.match(velureSpecsText, /3500\/4100 Вт/iu, 'Velure importantSpecs must include cooling capacity range');
assert.match(velureSpecsText, /50 дБ/iu, 'Velure importantSpecs must include noise level');
assert.match(velureCatalogSpecsText, /3500\/4100 Вт/iu, 'Velure catalogExtract.importantSpecs must include cooling capacity range');
assert.match(velureCatalogSpecsText, /12000\/14000 BTU/iu, 'Velure catalogExtract.importantSpecs must include BTU range');
assert.match(velureCatalogSpecsText, /50 дБ/iu, 'Velure catalogExtract.importantSpecs must include noise level');
assert.match(velureCatalogSpecsText, /434×700×350/iu, 'Velure catalogExtract.importantSpecs must include product dimensions');
assert.match(velureSpecsText, /28\/33[\s\S]*29,5\/34,5|29,5\/34,5[\s\S]*28\/33/iu, 'Velure importantSpecs must include net/gross weights');
for (const forbiddenSpecPattern of [/изысканный дизайн/iu, /для современного интерьера/iu, /Wi-Fi управление/iu, /мобильное использование/iu, /R290 эко-фреон/iu, /охлаждение$/ium]) {
  assert.equal(forbiddenSpecPattern.test(velureSpecsText), false, `Velure importantSpecs must not include sales feature ${forbiddenSpecPattern}`);
}
const velureDiagnosticTechnicalSpecsText = velureDraft.diagnostics.technicalSpecs.join('\n');
assert.equal(/Фреон R290 делает прибор|Приборы помогут создать комфортную атмосферу/iu.test(velureDiagnosticTechnicalSpecsText), false, 'Velure diagnostic technical specs must not contain long sales narrative');
assert.equal(/Краткое описание не заполнено/iu.test(velureDraft.draftWarning || ''), false, 'Velure warnings must not say shortDescription is empty');
assert.equal(/Позиционирование не заполнено/iu.test(velureDraft.draftWarning || ''), false, 'Velure warnings must not say positioning is empty');
assert.equal(/undefined|null|\[object Object\]/iu.test(stringifyDraft(velureDraft)), false, 'Velure draft must not contain garbage placeholders');

console.log(`series isolation ok: ${SERIES_PROFILES.length} profiles checked`);
