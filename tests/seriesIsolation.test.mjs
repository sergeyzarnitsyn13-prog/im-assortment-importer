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
assert.match(noTechnicalPagesDraft.draftWarning, /Техническая таблица серии не найдена/u);

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

console.log(`series isolation ok: ${SERIES_PROFILES.length} profiles checked`);
