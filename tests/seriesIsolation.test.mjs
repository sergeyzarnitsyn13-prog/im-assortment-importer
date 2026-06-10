import assert from 'node:assert/strict';
import { generateSeriesDraft } from '../src/generateSeriesDraft.js';
import { SERIES_PROFILES } from '../src/data/seriesProfiles.js';

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

console.log(`series isolation ok: ${SERIES_PROFILES.length} profiles checked`);
