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
assert.ok(olympioLegendAutoDescriptionDraft.shortDescription, 'OLYMPIO LEGEND approved profile must get auto shortDescription without legacyProfile');
assert.ok(olympioLegendAutoDescriptionDraft.positioning, 'OLYMPIO LEGEND approved profile must get auto positioning without legacyProfile');
assert.match(olympioLegendAutoDescriptionDraft.shortDescription, /OLYMPIO LEGEND/u, 'auto shortDescription must contain OLYMPIO LEGEND');
assert.match(olympioLegendAutoDescriptionDraft.positioning, /OLYMPIO LEGEND/u, 'auto positioning must contain OLYMPIO LEGEND');
assert.equal(
  olympioLegendAutoDescriptionDraft.diagnostics.warnings.includes('Краткое описание не заполнено.'),
  false,
  'auto shortDescription must suppress missing-description diagnostic warning',
);
assert.equal(
  olympioLegendAutoDescriptionDraft.diagnostics.warnings.includes('Позиционирование не заполнено.'),
  false,
  'auto positioning must suppress missing-positioning diagnostic warning',
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
assert.ok(lagoonEnergyDraft.salesFeatures.includes('A/A → A++/A+++'), 'LAGOON energy feature must show actual EER/COP table classes range');
assert.ok(lagoonEnergyDraft.keyFeatures.includes('A/A → A++/A+++'), 'LAGOON keyFeatures must include confident EER/COP energy range');
assert.ok(lagoonEnergyDraft.importantSpecs.includes('A/A → A++/A+++'), 'LAGOON importantSpecs must include confident EER/COP energy range');

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
assert.ok(
  lagoonFlatPdfEnergyDraft.salesFeatures.includes('A/A → A++/A+'),
  'LAGOON flat PDF card must show only the EER/COP energy class row range',
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
assert.ok(singleEnergyDraft.salesFeatures.includes('A/A'), 'single energy class must be shown unchanged');
assert.equal(/→/u.test(singleEnergyDraft.salesFeatures.join(' ')), false, 'single energy class must not be rendered as a range');

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
assert.ok(olympioLegendCategoryDraft.shortDescription, 'ON/OFF split shortDescription must not be empty');
assert.ok(olympioLegendCategoryDraft.positioning, 'ON/OFF split positioning must not be empty');
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
assert.ok(lagoonCategoryDraft.shortDescription, 'inverter split shortDescription must not be empty');
assert.ok(lagoonCategoryDraft.positioning, 'inverter split positioning must not be empty');
assert.match(lagoonCategoryDraft.importantSpecs.join('\n'), /A\/A|шум|температур|R32/iu, 'inverter importantSpecs must include energy/noise/temperature/refrigerant when present');

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
assert.ok(platinumX4Draft.shortDescription, 'mobile shortDescription must not be empty');
assert.ok(platinumX4Draft.positioning, 'mobile positioning must not be empty');
assert.match(platinumX4Draft.salesFeatures.join('\n'), /монтаж|SMART|TURBO|Auto Swing|Touch/iu, 'mobile salesFeatures must include mobile category features');
assert.match(platinumX4Draft.positioning, /мобильное решение|без установки|без сложного монтажа/iu, 'mobile positioning must explain mobile/no-install use case');
assert.equal(platinumX4Draft.diagnostics.warnings.includes('Продажные особенности не найдены.'), false, 'mobile warnings must not complain about salesFeatures');
assert.equal(platinumX4Draft.diagnostics.warnings.includes('Краткое описание не заполнено.'), false, 'mobile warnings must not complain about shortDescription');
assert.equal(platinumX4Draft.diagnostics.warnings.includes('Позиционирование не заполнено.'), false, 'mobile warnings must not complain about positioning');


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
assert.match(smartInverterDraft.shortDescription, /инвертор/iu, 'Smart Inverter shortDescription must mention inverter');
assert.match(smartInverterDraft.positioning, /мобильное|без установки/iu, 'Smart Inverter positioning must explain mobile/no-install use case');
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
assert.match(smartInverterEvoDraft.shortDescription, /инверторн/iu, 'Smart Inverter EVO shortDescription must mention inverter positioning');
assert.match(smartInverterEvoDraft.positioning, /мобильное|без установки/iu, 'Smart Inverter EVO positioning must explain mobile/no-install use case');
assert.match(smartInverterEvoDraft.importantSpecs.join('\n'), /BTU|R290|Уровень шума|Габариты/iu, 'Smart Inverter EVO importantSpecs must include BTU, R290, noise and dimensions');
assert.equal(/technicalPages:? 110–111/u.test(smartInverterEvoDraft.sourceRefs.importantSpecs), true, 'Smart Inverter EVO sourceRef must format technical page range');
for (const warning of ['Продажные особенности не найдены.', 'Краткое описание не заполнено.', 'Позиционирование не заполнено.']) {
  assert.equal(smartInverterEvoDraft.diagnostics.warnings.includes(warning), false, `Smart Inverter EVO warnings must not include ${warning}`);
}

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
assert.ok(waterHeaterDraft.shortDescription, 'waterHeater shortDescription must not be empty');
assert.ok(waterHeaterDraft.positioning, 'waterHeater positioning must not be empty');
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
assert.match(ecoCoolDraft.shortDescription, /без воздуховода/iu, 'ECO COOL shortDescription must mention no duct');
assert.match(ecoCoolDraft.positioning, /без воздуховода|без монтажа/iu, 'ECO COOL positioning must mention no duct/no installation');
assert.match(ecoCoolSpecsText, /воздуховод не требуется/iu, 'ECO COOL importantSpecs must say duct is not required');
assert.equal(/длина воздуховода|диаметр воздуховода/iu.test(ecoCoolSpecsText), false, 'ECO COOL importantSpecs must not include fake duct dimensions');
assert.match(ecoCoolSpecsText, /600 Вт/iu, 'ECO COOL importantSpecs must include 600 W cooling capacity');
assert.match(ecoCoolSpecsText, /2000 BTU/iu, 'ECO COOL importantSpecs must include 2000 BTU');
assert.match(ecoCoolSpecsText, /R290/iu, 'ECO COOL importantSpecs must include R290');
assert.match(ecoCoolSpecsText, /42 дБ/iu, 'ECO COOL importantSpecs must include 42 dB');
assert.match(ecoCoolSpecsText, /250 Вт/iu, 'ECO COOL importantSpecs must include 250 W');
assert.match(ecoCoolSpecsText, /325×275×585/iu, 'ECO COOL importantSpecs must include product dimensions');
assert.match(ecoCoolSpecsText, /14\/15 кг/iu, 'ECO COOL importantSpecs must include net/gross weight');
assert.equal(/undefined|null|\[object Object\]/iu.test(stringifyDraft(ecoCoolDraft)), false, 'ECO COOL draft must not contain garbage placeholders');

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


const velureDraft = generateSeriesDraft({
  brand: 'Ballu',
  category: 'Кондиционирование',
  group: 'Бытовые мобильные кондиционеры',
  seriesName: 'Velure',
  code: 'BPAC-VEL',
  exactSeriesRawText: 'Изысканный дизайн Ballu Velure станет украшением современного интерьера. Помимо стильного внешнего вида прибор обладает широким функционалом: автоматическим приводом жалюзи, таймером, управлением по Wi-Fi. Фреон R290 делает прибор по-настоящему энергоэффективным. Приборы помогут создать комфортную атмосферу в помещениях площадью до 35 м². Скрытый LED-дисплей. Управление по Wi-Fi. VELURE тканевое покрытие. AUTO-SWING жалюзи. Шлюз для распашных окон в комплекте. Пульт управления в комплекте.',
  technicalRawText: 'Параметр / Модель BPAC-12 EW/N6 BPAC-14 EW/N6 Производительность охлаждение Вт 3500 4100 Производительность охлаждение BTU 12000 14000 Класс энергоэффективности EER A A Расход воздуха м3/ч 400 430 Уровень шума дБА 50 50 Номинальная мощность охлаждение кВт 1330 1560 Размеры прибора Ш×В×Г мм 434×700×350 434×700×350 Вес нетто/брутто кг 28/33 29,5/34,5 Модель A, мм B, мм C, мм L, мм D, мм Velure BALLU BPAC-12/14 EW/N6 434 700 350 1500 150',
  exactSeriesPages: [150],
  technicalPages: [151],
});
const velureFeaturesText = velureDraft.salesFeatures.join('\n');
const velureAdvantagesText = velureDraft.mainAdvantages.join('\n');
const velureSpecsText = velureDraft.importantSpecs.join('\n');
assert.match(velureDraft.shortDescription, /изысканный дизайн|тканевым? покрытием/iu, 'Velure shortDescription must use narrative design/premium facts');
assert.match(velureDraft.shortDescription, /до 35 м²/iu, 'Velure shortDescription must include area up to 35 m²');
assert.match(velureDraft.positioning, /стильное|интерьер/iu, 'Velure positioning must emphasize style/interior');
assert.match(velureFeaturesText, /изысканный дизайн/iu, 'Velure salesFeatures must include elegant design');
assert.match(velureFeaturesText, /тканевое покрытие/iu, 'Velure salesFeatures must include fabric coating');
assert.match(velureFeaturesText, /Wi-Fi управление/iu, 'Velure salesFeatures must include Wi-Fi control');
assert.match(velureFeaturesText, /R290 эко-фреон/iu, 'Velure salesFeatures must include R290 eco refrigerant');
assert.match(velureFeaturesText, /площадь до 35 м²/iu, 'Velure salesFeatures must include area up to 35 m²');
assert.match(velureFeaturesText, /Auto-Swing жалюзи/iu, 'Velure salesFeatures must include Auto-Swing louvers');
assert.match(velureFeaturesText, /шлюз для распашных окон в комплекте/iu, 'Velure salesFeatures must include casement window adapter');
assert.match(velureAdvantagesText, /изысканный дизайн/iu, 'Velure mainAdvantages must include elegant design');
assert.match(velureAdvantagesText, /Wi-Fi управление/iu, 'Velure mainAdvantages must include Wi-Fi control');
assert.match(velureAdvantagesText, /R290 эко-фреон/iu, 'Velure mainAdvantages must include R290 eco refrigerant');
assert.equal(/воздуховод:\s*1500 мм, Ø150 мм|длина воздуховода 1500 мм[\s\S]*диаметр воздуховода 150 мм/iu.test(velureSpecsText), true, 'Velure importantSpecs must include duct L/D dimensions');
assert.match(velureSpecsText, /434×700×350/iu, 'Velure importantSpecs must include product dimensions');
assert.match(velureSpecsText, /12000\/14000 BTU/iu, 'Velure importantSpecs must include BTU range');
assert.equal(/Краткое описание не заполнено/iu.test(velureDraft.draftWarning || ''), false, 'Velure warnings must not say shortDescription is empty');
assert.equal(/Позиционирование не заполнено/iu.test(velureDraft.draftWarning || ''), false, 'Velure warnings must not say positioning is empty');
assert.equal(/undefined|null|\[object Object\]/iu.test(stringifyDraft(velureDraft)), false, 'Velure draft must not contain garbage placeholders');

console.log(`series isolation ok: ${SERIES_PROFILES.length} profiles checked`);
