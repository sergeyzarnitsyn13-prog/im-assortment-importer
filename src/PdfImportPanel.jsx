import React, { useMemo, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { SERIES_PROFILES, findSeriesProfile } from './data/seriesProfiles';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PDF_SOURCE_INITIAL = {
  catalogTitle: '',
  brand: '',
  category: '',
  sourceDate: '',
  seriesName: '',
  profileId: '',
  group: '',
  code: '',
};

const normalizeSearchText = (value = '') => value.toLocaleLowerCase('ru-RU').trim();

const getProfileOptionLabel = (profile) => `${profile.group} — ${profile.seriesName} (${profile.code})`;

const getProfilePayload = (profile) => ({
  profileId: profile.id,
  brand: profile.brand,
  category: profile.category,
  group: profile.group,
  seriesName: profile.seriesName,
  code: profile.code,
});

const getSearchFragment = (text, searchTerm) => {
  const lowerText = text.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerSearchTerm);

  if (matchIndex === -1) {
    return text.slice(0, 240);
  }

  const start = Math.max(matchIndex - 80, 0);
  const end = Math.min(matchIndex + searchTerm.length + 160, text.length);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';

  return `${prefix}${text.slice(start, end)}${suffix}`;
};

const SERIES_PAGE_RULES = Object.fromEntries(
  SERIES_PROFILES.map((profile) => [
    profile.seriesName.toLocaleLowerCase('ru-RU').trim().replace(/\s+/g, ' '),
    {
      code: profile.code,
      aliases: profile.aliases || [],
      keywords: [],
    },
  ]),
);

const SERIES_MARKERS = SERIES_PROFILES.map((profile) => ({
  id: profile.id,
  seriesName: profile.seriesName,
  code: profile.code,
  aliases: profile.aliases || [],
}));

const SUMMARY_SERIES_NAMES = SERIES_PROFILES.map((profile) => profile.seriesName);

const SERVICE_PAGE_KEYWORDS = ['HOMMYN', 'совместимость', 'USB', 'Алиса', 'Маруся', 'Сбер'];

const GENERAL_CATEGORY_KEYWORDS = [
  'модельный ряд',
  'категория',
  'каталог',
  'настенные сплит-системы',
  'сплит-системы',
];

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSeriesKey = (seriesName = '') => normalizeSearchText(seriesName).replace(/\s+/g, ' ');

const findSeriesRule = (seriesName = '') => SERIES_PAGE_RULES[normalizeSeriesKey(seriesName)] || null;

const includesNormalizedPhrase = (text = '', phrase = '') => {
  const normalizedPhrase = normalizeSearchText(phrase);

  return Boolean(normalizedPhrase) && normalizeSearchText(text).includes(normalizedPhrase);
};

const countIncludedPhrases = (text = '', phrases = []) =>
  phrases.reduce((count, phrase) => (includesNormalizedPhrase(text, phrase) ? count + 1 : count), 0);

const unique = (items) => [...new Set(items)];

const hasExactPhrase = (text = '', phrase = '') => {
  const trimmedPhrase = phrase.trim();

  if (!trimmedPhrase) {
    return false;
  }

  return new RegExp(`(^|[^0-9a-zа-яё])${escapeRegExp(trimmedPhrase)}([^0-9a-zа-яё]|$)`, 'i').test(text);
};

const getProfileMarkers = (profile) => [profile?.seriesName, profile?.code, ...(profile?.aliases || [])].filter(Boolean);

const getContainedSeriesMarkers = (text = '', profile) =>
  getProfileMarkers(profile).filter((marker) => hasExactPhrase(text, marker));

const getOtherSeriesMarkers = (text = '', selectedProfile) =>
  SERIES_MARKERS.filter((profile) => profile.id !== selectedProfile?.id)
    .flatMap((profile) =>
      [profile.seriesName, profile.code, ...profile.aliases]
        .filter(Boolean)
        .filter((marker) => hasExactPhrase(text, marker)),
    );

const hasTechnicalMarker = (text = '') =>
  includesNormalizedPhrase(text, 'Технические характеристики') || includesNormalizedPhrase(text, 'Параметр / Модель');


function scoreSeriesPage(page, profile, allProfiles = []) {
  const text = normalizeSearchText(page?.text || '');
  const seriesName = normalizeSearchText(profile?.seriesName || '');
  const code = normalizeSearchText(profile?.code || '');

  let score = 0;

  if (seriesName && text.includes(seriesName)) score += 10;
  if (code && text.includes(code)) score += 8;

  for (const alias of profile?.aliases || []) {
    const normalizedAlias = normalizeSearchText(alias);
    if (normalizedAlias && text.includes(normalizedAlias)) score += 4;
  }

  if (text.includes(normalizeSearchText('Технические характеристики'))) score += 3;
  if (text.includes(normalizeSearchText('Параметр / Модель'))) score += 3;

  const otherSeriesMatches = allProfiles.filter((otherProfile) => {
    if (otherProfile.id === profile?.id) return false;
    const otherName = normalizeSearchText(otherProfile.seriesName || '');
    const otherCode = normalizeSearchText(otherProfile.code || '');
    return (otherName && text.includes(otherName)) || (otherCode && text.includes(otherCode));
  });

  if (otherSeriesMatches.length >= 4) score -= 10;

  if (
    text.includes(normalizeSearchText('HOMMYN')) ||
    text.includes(normalizeSearchText('Алиса')) ||
    text.includes(normalizeSearchText('Маруся')) ||
    text.includes(normalizeSearchText('Сбер')) ||
    text.includes(normalizeSearchText('совместим'))
  ) {
    score -= 8;
  }

  return score;
}

const buildExcludeReason = ({ profile, selectedMarkers, otherMarkers, isHommynPage, isMultiSeriesSummaryPage, isCategoryPage }) => {
  if (isHommynPage) {
    return 'страница HOMMYN';
  }

  if (isMultiSeriesSummaryPage) {
    return 'сводная таблица, где перечислены 4+ серии';
  }

  if (isCategoryPage) {
    return 'общая страница категории';
  }

  if (otherMarkers.length > 0) {
    return `содержит ${unique(otherMarkers).join(' / ')}, выбрана ${profile.seriesName}`;
  }

  if (selectedMarkers.length === 0) {
    return `не содержит ${profile.seriesName} / ${profile.code}`;
  }

  return '';
};

export const classifyPageForSeries = (page, profile) => {
  const text = page?.text || '';
  const selectedMarkers = getContainedSeriesMarkers(text, profile);
  const otherMarkers = getOtherSeriesMarkers(text, profile);
  const isHommynPage = hasExactPhrase(text, 'HOMMYN');
  const isMultiSeriesSummaryPage = isSummaryPage(text);
  const isCategoryPage = isGeneralCategoryPage(text, profile.seriesName);
  const excluded =
    selectedMarkers.length === 0 ||
    otherMarkers.length > 0 ||
    isHommynPage ||
    isMultiSeriesSummaryPage ||
    isCategoryPage;
  const belongsToSeries = selectedMarkers.length > 0 && !excluded;
  const isTechnicalPage = belongsToSeries && hasTechnicalMarker(text) && hasExactPhrase(text, profile.code);
  const isOverviewPage = belongsToSeries && !isTechnicalPage;
  let score = scoreSeriesPage(page, profile, SERIES_PROFILES);

  if (selectedMarkers.length > 0) {
    score += selectedMarkers.some((marker) => marker === profile.code) ? 10 : 6;
  }

  if (isTechnicalPage) {
    score += 5;
  }

  if (excluded) {
    score = Math.min(score, -1);
  }

  return {
    pageNumber: page?.pageNumber,
    score,
    belongsToSeries,
    isTechnicalPage,
    isOverviewPage,
    excluded,
    excludeReason: excluded
      ? buildExcludeReason({
          profile,
          selectedMarkers,
          otherMarkers,
          isHommynPage,
          isMultiSeriesSummaryPage,
          isCategoryPage,
        })
      : '',
  };
};

const hasSeriesCode = (text = '', seriesName = '') => {
  const rule = findSeriesRule(seriesName);

  return Boolean(rule?.code && hasExactPhrase(text, rule.code));
};

const hasHeadingSeriesName = (text = '', seriesName = '') => {
  const trimmedSeriesName = seriesName.trim();

  if (!trimmedSeriesName || !hasExactPhrase(text, trimmedSeriesName)) {
    return false;
  }

  const headText = text.slice(0, 700);
  const normalizedHeadText = normalizeSearchText(headText);
  const normalizedSeriesName = normalizeSearchText(trimmedSeriesName);
  const uppercaseSeriesName = trimmedSeriesName.toLocaleUpperCase('ru-RU');

  return (
    hasExactPhrase(headText, uppercaseSeriesName) ||
    normalizedHeadText.includes(`серия ${normalizedSeriesName}`) ||
    normalizedHeadText.startsWith(normalizedSeriesName)
  );
};

const isSummaryPage = (text = '') => countIncludedPhrases(text, SUMMARY_SERIES_NAMES) >= 4;

const isServicePage = (text = '') => countIncludedPhrases(text, SERVICE_PAGE_KEYWORDS) >= 2;

const isGeneralCategoryPage = (text = '', seriesName = '') => {
  const hasGeneralMarkers = countIncludedPhrases(text, GENERAL_CATEGORY_KEYWORDS) >= 2;

  return hasGeneralMarkers && !hasSeriesCode(text, seriesName) && !hasHeadingSeriesName(text, seriesName);
};

const formatPageNumbers = (pageNumbers) => (pageNumbers.length > 0 ? pageNumbers.join(', ') : 'нет');

const getPageText = async (page) => {
  const textContent = await page.getTextContent();

  return textContent.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getQualityWarning = (pages) => {
  if (pages.length === 0) {
    return '';
  }

  const pagesWithText = pages.filter((page) => page.text.trim().length > 0);
  const shortTextPages = pages.filter((page) => page.text.trim().length < 80);

  if (pagesWithText.length === 0) {
    return 'Предупреждение: текст PDF не извлечён. Возможно, каталог состоит из сканов без текстового слоя.';
  }

  if (pagesWithText.length / pages.length < 0.5 || shortTextPages.length / pages.length > 0.7) {
    return 'Предупреждение: текст PDF извлечён плохо. Проверьте найденные страницы или вставьте rawText вручную.';
  }

  return '';
};

const buildRawText = (pages) => pages.map((page) => page.text).join('\n\n').trim();

const getSelectedPageNumbers = (pages) => pages.map((page) => page.pageNumber);

function PdfImportPanel({ onCreateSource }) {
  const [form, setForm] = useState(PDF_SOURCE_INITIAL);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesResult, setSeriesResult] = useState(null);
  const [seriesMessage, setSeriesMessage] = useState('');
  const [seriesMessageKind, setSeriesMessageKind] = useState('info');
  const [showSeriesDebugPages, setShowSeriesDebugPages] = useState(false);
  const [qualityWarning, setQualityWarning] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPageNumbers, setSelectedPageNumbers] = useState([]);

  const selectedProfile = useMemo(() => findSeriesProfile(form.profileId || form.code || form.seriesName), [form]);

  const pagesWithTextCount = useMemo(
    () => pages.filter((page) => page.text.trim().length > 0).length,
    [pages],
  );

  const filteredPages = useMemo(() => {
    if (!searchTerm) {
      return [];
    }

    return pages.filter((page) => page.text.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [pages, searchTerm]);

  const searchDebugResults = useMemo(
    () => filteredPages.slice(0, 10).map((page) => ({
      page,
      isMatch: page.text.toLowerCase().includes(searchTerm.toLowerCase()),
      fragment: getSearchFragment(page.text, searchTerm),
    })),
    [filteredPages, searchTerm],
  );

  const selectedPages = useMemo(() => {
    if (!seriesResult) {
      return [];
    }

    const selectedNumbers = new Set(selectedPageNumbers);

    return seriesResult.pages.filter((page) => selectedNumbers.has(page.pageNumber));
  }, [seriesResult, selectedPageNumbers]);

  const selectedRawText = useMemo(() => buildRawText(selectedPages), [selectedPages]);
  const selectedClassifications = useMemo(() => {
    const classifiedByNumber = seriesResult?.classifiedByNumber || new Map();

    return selectedPages.map((page) => classifiedByNumber.get(page.pageNumber)).filter(Boolean);
  }, [seriesResult, selectedPages]);
  const selectedTechnicalPageNumbers = selectedClassifications
    .filter((classification) => classification.isTechnicalPage)
    .map((classification) => classification.pageNumber);
  const selectedOverviewPageNumbers = selectedClassifications
    .filter((classification) => classification.isOverviewPage)
    .map((classification) => classification.pageNumber);
  const selectedTechnicalRawText = buildRawText(
    selectedPages.filter((page) => selectedTechnicalPageNumbers.includes(page.pageNumber)),
  );
  const selectedOverviewRawText = buildRawText(
    selectedPages.filter((page) => selectedOverviewPageNumbers.includes(page.pageNumber)),
  );
  const selectedPageNumbersText = selectedPages.map((page) => page.pageNumber).join(', ');
  const selectedRawTextPreview = selectedRawText.slice(0, 1000);
  const scoredPagesByNumber = useMemo(() => {
    if (!seriesResult?.scoredPages) {
      return new Map();
    }

    return new Map(seriesResult.scoredPages.map(({ page, score }) => [page.pageNumber, score]));
  }, [seriesResult]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      if (name !== 'seriesName') {
        return { ...current, [name]: value };
      }

      const profile = findSeriesProfile(value);

      return {
        ...current,
        seriesName: value,
        ...(profile
          ? getProfilePayload(profile)
          : { profileId: '', group: '', code: '' }),
      };
    });

    if (name === 'seriesName') {
      const profile = findSeriesProfile(value);
      setSeriesMessageKind(profile || !value.trim() ? 'info' : 'error');
      setSeriesMessage(
        profile
          ? `Определена серия: ${profile.seriesName} (${profile.code})`
          : value.trim()
            ? 'Серия не найдена в утверждённом справочнике'
            : '',
      );
    }
  };

  const handleSeriesProfileSelect = (event) => {
    const profile = findSeriesProfile(event.target.value);

    if (!profile) {
      setForm((current) => ({ ...current, profileId: '' }));
      return;
    }

    setForm((current) => ({
      ...current,
      ...getProfilePayload(profile),
    }));
    setSeriesMessageKind('info');
    setSeriesMessage(`Определена серия: ${profile.seriesName} (${profile.code})`);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSelectedFile(file);
    setFileName(file?.name || '');
    setPages([]);
    setSearchTerm('');
    setSeriesResult(null);
    setSelectedPageNumbers([]);
    setSeriesMessage('');
    setSeriesMessageKind('info');
    setQualityWarning('');
    setError('');
  };

  const handleExtractPdf = async () => {
    if (!selectedFile) {
      setError('Выберите PDF-файл каталога.');
      return;
    }

    setIsExtracting(true);
    setError('');
    setSeriesResult(null);
    setSelectedPageNumbers([]);
    setSeriesMessage('');
    setSeriesMessageKind('info');
    setQualityWarning('');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const extractedPages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const text = await getPageText(page);
        extractedPages.push({ pageNumber, text });
      }

      setPages(extractedPages);
      setQualityWarning(getQualityWarning(extractedPages));
    } catch (extractError) {
      setError(`Не удалось прочитать PDF: ${extractError.message}`);
      setPages([]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFindSeries = () => {
    const profile = findSeriesProfile(form.seriesName || form.code || form.profileId);

    setSeriesResult(null);
    setSelectedPageNumbers([]);
    setSeriesMessage('');
    setSeriesMessageKind('info');

    if (!profile) {
      setSeriesMessageKind('error');
      setSeriesMessage('Выберите серию из утверждённого справочника или введите её точный код/название.');
      return;
    }

    const classifications = pages.map((page) => ({
      page,
      classification: classifyPageForSeries(page, profile),
    }));
    const directMatchPages = classifications
      .filter(({ classification }) => classification.belongsToSeries)
      .map(({ page }) => page);

    if (directMatchPages.length === 0) {
      const excludedPages = classifications
        .filter(
          ({ classification }) =>
            classification.excluded &&
            classification.excludeReason &&
            !classification.excludeReason.startsWith('не содержит'),
        )
        .map(({ page, classification }) => ({
          pageNumber: page.pageNumber,
          reason: classification.excludeReason,
        }));

      setSeriesResult({
        pages: [],
        directMatchPages: [],
        scoredPages: [],
        autoSelectedPageNumbers: [],
        technicalPageNumbers: [],
        overviewPageNumbers: [],
        excludedPages,
        excludedPageNumbers: excludedPages.map((page) => page.pageNumber),
        classifiedByNumber: new Map(
          classifications.map(({ page, classification }) => [page.pageNumber, classification]),
        ),
      });
      setSeriesMessageKind('error');
      setSeriesMessage('Серия не найдена в тексте PDF');
      return;
    }

    const scoredPages = classifications
      .filter(({ classification }) => classification.belongsToSeries)
      .sort((firstPage, secondPage) => firstPage.page.pageNumber - secondPage.page.pageNumber)
      .map(({ page, classification }) => ({ page, score: classification.score }));
    const foundPages = scoredPages.map(({ page }) => page);
    const autoSelectedPages = scoredPages.map(({ page }) => page);
    const autoSelectedPageNumbers = getSelectedPageNumbers(autoSelectedPages);
    const technicalPageNumbers = classifications
      .filter(({ classification }) => classification.isTechnicalPage)
      .map(({ page }) => page.pageNumber);
    const overviewPageNumbers = classifications
      .filter(({ classification }) => classification.isOverviewPage)
      .map(({ page }) => page.pageNumber);
    const excludedPages = classifications
      .filter(
        ({ classification }) =>
          classification.excluded &&
          classification.excludeReason &&
          !classification.excludeReason.startsWith('не содержит'),
      )
      .map(({ page, classification }) => ({
        pageNumber: page.pageNumber,
        reason: classification.excludeReason,
      }));
    const classifiedByNumber = new Map(
      classifications.map(({ page, classification }) => [page.pageNumber, classification]),
    );

    setSeriesResult({
      pages: foundPages,
      directMatchPages,
      scoredPages,
      autoSelectedPageNumbers,
      technicalPageNumbers,
      overviewPageNumbers,
      excludedPages,
      excludedPageNumbers: excludedPages.map((page) => page.pageNumber),
      classifiedByNumber,
    });
    setSelectedPageNumbers(autoSelectedPageNumbers);
    setSeriesMessageKind(technicalPageNumbers.length > 0 ? 'info' : 'warning');
    setSeriesMessage(
      `${`Определена серия: ${profile.seriesName} (${profile.code}). `}Найдено страниц серии: ${directMatchPages.length}. ${
        technicalPageNumbers.length === 0 ? 'Техническая таблица для серии не найдена.' : ''
      }`,
    );
  };

  const handleFoundPageToggle = (pageNumber) => {
    setSelectedPageNumbers((current) => {
      if (current.includes(pageNumber)) {
        return current.filter((selectedPageNumber) => selectedPageNumber !== pageNumber);
      }

      return [...current, pageNumber].sort((firstPage, secondPage) => firstPage - secondPage);
    });
  };

  const assertRawTextBelongsToSelectedSeries = (rawText, profile) => {
    if (!profile) {
      return;
    }

    const otherMarkers = getOtherSeriesMarkers(rawText, profile);

    if (otherMarkers.length > 0 && !hasExactPhrase(rawText, profile.code)) {
      throw new Error('Найден текст другой серии. Карточка не создана.');
    }
  };

  const buildSelectedPagesSource = () => {
    const brand = form.brand.trim();
    const category = form.category.trim();
    const catalogYear = form.sourceDate.trim();
    const profile = findSeriesProfile(form.profileId || form.seriesName || form.code);
    const seriesName = (profile?.seriesName || form.seriesName).trim();
    const selectedPagesArray = getSelectedPageNumbers(selectedPages);
    const rawText = selectedRawText.trim();

    if (!seriesName) {
      throw new Error('Введите название серии, код или модель.');
    }

    if (selectedPagesArray.length === 0) {
      throw new Error('Выберите хотя бы одну страницу.');
    }

    if (!rawText) {
      throw new Error('Текст выбранных страниц пустой.');
    }

    assertRawTextBelongsToSelectedSeries(rawText, profile);

    const sourceBrand = profile?.brand || brand;
    const sourceCategory = profile?.category || category;

    return {
      title: `${sourceBrand} ${catalogYear} — ${seriesName}`.trim(),
      type: 'catalog',
      brand: sourceBrand,
      category: sourceCategory,
      profileId: profile?.id || '',
      group: profile?.group || form.group.trim(),
      code: profile?.code || form.code.trim(),
      seriesName,
      sourceDate: catalogYear,
      sourceRef: `PDF каталог ${catalogYear}, страницы ${selectedPagesArray.join(', ')}`,
      rawText,
      technicalRawText: selectedTechnicalRawText.trim(),
      overviewRawText: selectedOverviewRawText.trim(),
      technicalPages: selectedTechnicalPageNumbers,
      overviewPages: selectedOverviewPageNumbers,
      pageDiagnostics: {
        usedPages: selectedPagesArray,
        technicalPages: selectedTechnicalPageNumbers,
        overviewPages: selectedOverviewPageNumbers,
        excludedPages: seriesResult?.excludedPages || [],
      },
      pages: selectedPagesArray,
    };
  };

  const handleCreateSource = async (buildDraftImmediately = false) => {
    if (!seriesResult) {
      return;
    }

    setIsSaving(true);
    setSeriesMessage('');
    setSeriesMessageKind('info');

    try {
      const source = buildSelectedPagesSource();
      await onCreateSource(source, { buildDraftImmediately });
      setSeriesMessageKind('info');
      setSeriesMessage(buildDraftImmediately ? 'Источник создан, карточка собрана.' : 'Источник создан');
    } catch (saveError) {
      setSeriesMessageKind('error');
      setSeriesMessage(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="panel pdf-import-panel" aria-labelledby="pdf-import-title">
      <div className="panel-heading">
        <p className="eyebrow">Локальная обработка в браузере</p>
        <h2 id="pdf-import-title">Загрузить PDF-каталог</h2>
        <p className="muted">
          PDF не загружается в Firebase Storage и не сохраняется в Firestore: сохраняется только извлечённый текст источника.
        </p>
      </div>

      <div className="form-grid">
        <label>
          Название каталога
          <input name="catalogTitle" onChange={handleFormChange} value={form.catalogTitle} />
        </label>
        <label>
          Бренд
          <input name="brand" onChange={handleFormChange} value={form.brand} />
        </label>
        <label>
          Категория
          <input name="category" onChange={handleFormChange} value={form.category} />
        </label>
        <label>
          Год / дата
          <input name="sourceDate" onChange={handleFormChange} placeholder="2025 или 2025-03-01" value={form.sourceDate} />
        </label>
        <label className="wide-field">
          Файл PDF
          <input accept="application/pdf" onChange={handleFileChange} type="file" />
        </label>
      </div>

      {fileName && <p className="muted pdf-file-name">Выбран файл: {fileName}</p>}

      <div className="form-actions">
        <button className="primary-button" disabled={!selectedFile || isExtracting} onClick={handleExtractPdf} type="button">
          {isExtracting ? 'Извлекаем текст…' : 'Извлечь текст из PDF'}
        </button>
      </div>

      {error && <p className="notice error-notice">{error}</p>}
      {qualityWarning && <p className="notice warning-notice">{qualityWarning}</p>}

      {pages.length > 0 && (
        <div className="pdf-results">
          <div className="pdf-stats">
            <span>Страниц: {pages.length}</span>
            <span>Страниц с текстом: {pagesWithTextCount}</span>
          </div>

          <label>
            Поиск по извлечённому тексту
            <input onChange={(event) => setSearchTerm(event.target.value)} value={searchTerm} />
          </label>

          {searchTerm && (
            <>
              <div className="pdf-found-pages pdf-search-debug">
                <h3>Отладка поиска</h3>
                <dl className="source-preview">
                  <div>
                    <dt>Поисковая строка</dt>
                    <dd>{searchTerm}</dd>
                  </div>
                  <div>
                    <dt>Страниц в PDF</dt>
                    <dd>{pages.length}</dd>
                  </div>
                  <div>
                    <dt>Страниц после фильтра</dt>
                    <dd>{filteredPages.length}</dd>
                  </div>
                </dl>
                {searchDebugResults.length > 0 ? (
                  <div className="card-list">
                    {searchDebugResults.map(({ page, isMatch, fragment }) => (
                      <article className="item-card pdf-page-card" key={page.pageNumber}>
                        <div>
                          <h4>Страница {page.pageNumber}</h4>
                          <p className="pdf-debug-match">Совпадение: {isMatch ? 'true' : 'false'}</p>
                          <p>{fragment}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Совпадений не найдено</p>
                )}
              </div>

              <div className="pdf-found-pages">
                <h3>Найденные страницы</h3>
                {filteredPages.length > 0 ? (
                  <div className="card-list">
                    {filteredPages.map((page) => (
                      <article className="item-card pdf-page-card" key={page.pageNumber}>
                        <div>
                          <h4>Страница {page.pageNumber}</h4>
                          <p>{page.text.slice(0, 420)}{page.text.length > 420 ? '…' : ''}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Совпадений не найдено</p>
                )}
              </div>
            </>
          )}

          <div className="series-search-box">
            <label>
              Серия, код или модель
              <input
                name="seriesName"
                onChange={handleFormChange}
                placeholder="BSPKI-10HN8, ICE PEAK, BOHO"
                value={form.seriesName}
              />
            </label>
            <label>
              Выбрать серию из справочника
              <select name="profileId" onChange={handleSeriesProfileSelect} value={selectedProfile?.id || ''}>
                <option value="">Не выбрана</option>
                {SERIES_PROFILES.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getProfileOptionLabel(profile)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="secondary-button" onClick={handleFindSeries} type="button">
                Найти текст по серии
              </button>
              <label className="inline-control">
                <input
                  checked={showSeriesDebugPages}
                  onChange={(event) => setShowSeriesDebugPages(event.target.checked)}
                  type="checkbox"
                />
                Показать все страницы серии
              </label>
            </div>
          </div>

          {seriesMessage && (
            <p
              className={
                seriesMessageKind === 'error'
                  ? 'notice error-notice'
                  : seriesMessageKind === 'warning'
                    ? 'notice warning-notice'
                    : 'notice'
              }
            >
              {seriesMessage}
            </p>
          )}

          {seriesResult && (
            <div className="series-result">
              <h3>Источник из выбранных страниц</h3>
              <div className="notice pdf-auto-selection">
                <p>
                  Использованные страницы:{' '}
                  {formatPageNumbers(seriesResult.autoSelectedPageNumbers || [])}
                </p>
                <p>
                  Технические страницы:{' '}
                  {formatPageNumbers(seriesResult.technicalPageNumbers || [])}
                </p>
                <p>
                  Обзорные страницы:{' '}
                  {formatPageNumbers(seriesResult.overviewPageNumbers || [])}
                </p>
                <p>
                  Исключённые страницы:{' '}
                  {formatPageNumbers(seriesResult.excludedPageNumbers || [])}
                </p>
                {(!seriesResult.technicalPageNumbers || seriesResult.technicalPageNumbers.length === 0) && (
                  <p className="warning-text">Техническая таблица для серии не найдена.</p>
                )}
                {seriesResult.excludedPages?.length > 0 && (
                  <ul className="pdf-excluded-list">
                    {seriesResult.excludedPages.slice(0, 30).map((page) => (
                      <li key={page.pageNumber}>
                        Страница {page.pageNumber} исключена: {page.reason}.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <dl className="source-preview">
                <div>
                  <dt>Название</dt>
                  <dd>{`${form.brand.trim()} ${form.sourceDate.trim()} — ${form.seriesName.trim()}`.trim() || 'Без названия'}</dd>
                </div>
                <div>
                  <dt>Источник</dt>
                  <dd>PDF каталог {form.sourceDate.trim()}, страницы {selectedPageNumbersText || 'не выбраны'}</dd>
                </div>
                {selectedProfile && (
                  <div>
                    <dt>Профиль справочника</dt>
                    <dd>{selectedProfile.brand} · {selectedProfile.category} · {selectedProfile.group} · {selectedProfile.seriesName} · {selectedProfile.code}</dd>
                  </div>
                )}
                <div>
                  <dt>Страниц, принадлежащих серии</dt>
                  <dd>{seriesResult.directMatchPages.length}</dd>
                </div>
                <div>
                  <dt>Использованные страницы серии</dt>
                  <dd>{seriesResult.directMatchPages.map((page) => page.pageNumber).join(', ')}</dd>
                </div>
                <div>
                  <dt>Страниц найдено</dt>
                  <dd>{seriesResult.pages.length}</dd>
                </div>
                <div>
                  <dt>Выбранные страницы</dt>
                  <dd>{selectedPageNumbersText || 'не выбраны'}</dd>
                </div>
                <div>
                  <dt>Символов в rawText</dt>
                  <dd>{selectedRawText.length}</dd>
                </div>
              </dl>

              <div className="pdf-found-pages">
                <h3>Найденные страницы для источника</h3>
                <div className="card-list">
                  {seriesResult.pages.map((page) => (
                    <article className="item-card pdf-page-card" key={page.pageNumber}>
                      <label className="pdf-page-checkbox">
                        <input
                          checked={selectedPageNumbers.includes(page.pageNumber)}
                          onChange={() => handleFoundPageToggle(page.pageNumber)}
                          type="checkbox"
                        />
                        <span>Страница {page.pageNumber}</span>
                      </label>
                      <span className="pdf-page-score">Релевантность: {scoredPagesByNumber.get(page.pageNumber) ?? 0}</span>
                      <p>{page.text.slice(0, 420)}{page.text.length > 420 ? '…' : ''}</p>
                    </article>
                  ))}
                </div>
              </div>

              {showSeriesDebugPages && (
                <div className="pdf-found-pages">
                  <h3>Страницы, прошедшие проверку серии</h3>
                  <div className="card-list">
                    {seriesResult.directMatchPages.map((page) => (
                      <article className="item-card pdf-page-card" key={page.pageNumber}>
                        <div>
                          <h4>Страница {page.pageNumber}</h4>
                          <p>{page.text.slice(0, 420)}{page.text.length > 420 ? '…' : ''}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <div className="selected-text-preview">
                <h3>Предпросмотр выбранного текста</h3>
                <p className="muted">Первые 1000 символов объединённого rawText.</p>
                <textarea readOnly value={selectedRawTextPreview} />
              </div>

              <div className="form-actions">
                <button className="primary-button" disabled={isSaving} onClick={() => handleCreateSource(false)} type="button">
                  Создать источник из выбранных страниц
                </button>
                <button className="secondary-button" disabled={isSaving} onClick={() => handleCreateSource(true)} type="button">
                  Создать источник и собрать карточку
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PdfImportPanel;
