import assert from 'node:assert/strict';
import { diagnoseEnergyClass, extractEnergyClass, generateSeriesDraft, isEnergyClassFeature, sanitizeEnergyClasses } from '../src/generateSeriesDraft.js';
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
assert.match(discoveryTechnicalDraft.sourceRefs.salesFeatures, /technicalPages 42/u, 'numeric salesFeatures sourceRef must point to technicalPages only');
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
  technicalRawText: 'Технические характеристики BSDI\nКласс энергоэффективности (EER/COP) A/A A/A A/A A++/A+ A++/A+',
});
assert.ok(lagoonEnergyDraft.salesFeatures.includes('A/A → A++/A+'), 'LAGOON energy feature must show only actual table classes range');
assert.equal(/A\+\+\/A\+\+\+/u.test(stringifyDraft(lagoonEnergyDraft)), false, 'LAGOON must not synthesize A++/A+++');

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

const lagoonFlatPdfTechnicalRawText = 'Технические характеристики BSDI Класс энергоэффективности (EER/COP) A/A A/A A/A A++/A+ A++/A+ SEER A++/A+++ SCOP A++/A+++ Уровень шума 23/49';
assert.equal(
  extractEnergyClass(lagoonFlatPdfTechnicalRawText),
  'A/A → A++/A+',
  'flat PDF text energy extractor must stop before SEER/SCOP rows',
);
assert.equal(
  /A\+\+\/A\+\+\+/u.test(extractEnergyClass(lagoonFlatPdfTechnicalRawText)),
  false,
  'flat PDF text energy extractor must not include SEER/SCOP A++/A+++ values',
);

const lagoonFlatPdfEnergyDiagnostic = diagnoseEnergyClass(lagoonFlatPdfTechnicalRawText);
assert.equal(
  lagoonFlatPdfEnergyDiagnostic.stopMarker,
  'SEER',
  'energy diagnostic must expose the row marker that cut off SEER/SCOP values',
);
assert.deepEqual(
  lagoonFlatPdfEnergyDiagnostic.values,
  ['A/A', 'A++/A+'],
  'energy diagnostic must expose strict values collected before SEER/SCOP rows',
);
assert.match(
  lagoonFlatPdfEnergyDiagnostic.rawSegment,
  /A\+\+\/A\+\+\+/u,
  'energy diagnostic must expose the original segment where the foreign A+++ value appeared',
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
  '',
  'energy extractor must reject more than two distinct values as ambiguous',
);

const lagoonFlatPdfEnergyDraft = buildTechnicalOnlyDraft({
  seriesName: 'LAGOON',
  technicalRawText: lagoonFlatPdfTechnicalRawText,
});
assert.ok(
  lagoonFlatPdfEnergyDraft.salesFeatures.includes('A/A → A++/A+'),
  'LAGOON flat PDF card must show only the energy class row range',
);
assert.equal(
  /A\+\+\/A\+\+\+/u.test(stringifyDraft(lagoonFlatPdfEnergyDraft)),
  false,
  'LAGOON flat PDF card must not include A++/A+++ anywhere in the draft JSON',
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
assert.ok(
  exactEnergyClassWithoutEerDraft.salesFeatures.includes('A++/A+'),
  'energy class row without EER/COP must preserve the exact A++/A+ value from technical text',
);
assert.equal(
  /A\+\+\/A\+\+\+/u.test(stringifyDraft(exactEnergyClassWithoutEerDraft)),
  false,
  'A++/A+ from technical text must not be upgraded to A++/A+++',
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
Другой показатель A++/A+++`),
  'А/А → А++/А+',
  'strict energy extractor must support Cyrillic A and ignore classes on following lines',
);
assert.equal(
  extractEnergyClass(`Технические характеристики BSPKI
Класс энергоэффективности A++/A+++`),
  'A++/A+++',
  'strict energy extractor must preserve a single Latin energy class unchanged',
);
assert.equal(
  extractEnergyClass(`Технические характеристики BSHI
Класс энергоэффективности А++/А+++`),
  'А++/А+++',
  'strict energy extractor must preserve a single Cyrillic energy class unchanged',
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

console.log(`series isolation ok: ${SERIES_PROFILES.length} profiles checked`);
