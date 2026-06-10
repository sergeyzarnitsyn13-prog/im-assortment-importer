import React, { useMemo, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PDF_SOURCE_INITIAL = {
  catalogTitle: '',
  brand: '',
  category: '',
  sourceDate: '',
  seriesName: '',
};

const normalizeSearchText = (value = '') => value.toLocaleLowerCase('ru-RU').trim();

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

const SERIES_PAGE_RULES = {
  'ice peak': {
    code: 'BSPKI',
    keywords: ['тепловой насос', '-30', 'Smart Sens', 'Health Guard'],
  },
  boho: {
    code: 'BSNI',
    keywords: ['сменная панель', 'тканевые панели', '180°', 'интерьер'],
  },
  defender: {
    code: 'BSHI',
    keywords: ['УФ', 'мягкий обдув', 'Gentle Breeze'],
  },
  'eco smart': {
    code: 'BSYI',
    keywords: [],
  },
  'odyssey pro': {
    code: 'BSOI',
    keywords: [],
  },
};

const SUMMARY_SERIES_NAMES = [
  'BOHO',
  'ICE PEAK',
  'DEFENDER',
  'PLATINUM BLACK',
  'ECO SMART',
  'ODYSSEY PRO',
];

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

const hasExactPhrase = (text = '', phrase = '') => {
  const trimmedPhrase = phrase.trim();

  if (!trimmedPhrase) {
    return false;
  }

  return new RegExp(`(^|[^0-9a-zа-яё])${escapeRegExp(trimmedPhrase)}([^0-9a-zа-яё]|$)`, 'i').test(text);
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

const isExcludedByPageRules = (text = '', seriesName = '') =>
  isSummaryPage(text) || isServicePage(text) || isGeneralCategoryPage(text, seriesName);

export const scoreSeriesPage = (page, seriesName) => {
  const text = page?.text || '';
  const rule = findSeriesRule(seriesName);
  let score = 0;

  if (hasHeadingSeriesName(text, seriesName)) {
    score += 10;
  }

  if (hasSeriesCode(text, seriesName)) {
    score += 8;
  }

  if (rule?.keywords?.some((keyword) => includesNormalizedPhrase(text, keyword))) {
    score += 6;
  }

  if (includesNormalizedPhrase(text, 'Параметр / Модель')) {
    score += 3;
  }

  if (includesNormalizedPhrase(text, 'Технические характеристики')) {
    score += 2;
  }

  if (isSummaryPage(text)) {
    score -= 10;
  }

  if (isServicePage(text)) {
    score -= 8;
  }

  if (isGeneralCategoryPage(text, seriesName)) {
    score -= 5;
  }

  return score;
};

const pageHasDirectSeriesMatch = (page, normalizedSeriesName, seriesName) =>
  Boolean(normalizedSeriesName) && (hasExactPhrase(page.text, seriesName) || hasSeriesCode(page.text, seriesName));

const getFallbackSelectedPages = (scoredPages, seriesName) =>
  scoredPages
    .filter(({ page, score }) => score >= 0 && !isExcludedByPageRules(page.text, seriesName))
    .sort((firstPage, secondPage) => {
      if (secondPage.score !== firstPage.score) {
        return secondPage.score - firstPage.score;
      }

      return firstPage.page.pageNumber - secondPage.page.pageNumber;
    })
    .slice(0, 2)
    .map(({ page }) => page)
    .sort((firstPage, secondPage) => firstPage.pageNumber - secondPage.pageNumber);

const getAutoSelectedPages = (scoredPages, seriesName) => {
  const highScorePages = scoredPages
    .filter(({ page, score }) => score >= 8 && !isExcludedByPageRules(page.text, seriesName))
    .map(({ page }) => page);

  if (highScorePages.length > 0) {
    return highScorePages;
  }

  return getFallbackSelectedPages(scoredPages, seriesName);
};

const formatPageNumbers = (pageNumbers) => (pageNumbers.length > 0 ? pageNumbers.join(', ') : 'нет');

const getPageWithNeighborsNumbers = (pageNumber, pagesCount) =>
  [pageNumber - 1, pageNumber, pageNumber + 1].filter(
    (neighborPageNumber) => neighborPageNumber >= 1 && neighborPageNumber <= pagesCount,
  );

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
    setForm((current) => ({ ...current, [name]: value }));
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
    const normalizedSeries = normalizeSearchText(form.seriesName);

    setSeriesResult(null);
    setSelectedPageNumbers([]);
    setSeriesMessage('');
    setSeriesMessageKind('info');

    if (!normalizedSeries) {
      setSeriesMessageKind('error');
      setSeriesMessage('Введите название серии.');
      return;
    }

    const directMatchPages = pages.filter((page) => pageHasDirectSeriesMatch(page, normalizedSeries, form.seriesName));

    if (directMatchPages.length === 0) {
      setSeriesMessageKind('error');
      setSeriesMessage('Серия не найдена в тексте PDF');
      return;
    }

    const pageNumbers = new Set();

    directMatchPages.forEach((page) => {
      getPageWithNeighborsNumbers(page.pageNumber, pages.length).forEach((pageNumber) => pageNumbers.add(pageNumber));
    });

    const scoredPages = [...pageNumbers]
      .sort((firstPage, secondPage) => firstPage - secondPage)
      .map((pageNumber) => pages.find((page) => page.pageNumber === pageNumber))
      .filter(Boolean)
      .map((page) => ({ page, score: scoreSeriesPage(page, form.seriesName) }));
    const foundPages = scoredPages.map(({ page }) => page);
    const autoSelectedPages = getAutoSelectedPages(scoredPages, form.seriesName);
    const autoSelectedPageNumbers = getSelectedPageNumbers(autoSelectedPages);
    const excludedPageNumbers = scoredPages
      .filter(({ page, score }) => score < 0 || isExcludedByPageRules(page.text, form.seriesName))
      .map(({ page }) => page.pageNumber);

    setSeriesResult({
      pages: foundPages,
      directMatchPages,
      scoredPages,
      autoSelectedPageNumbers,
      excludedPageNumbers,
    });
    setSelectedPageNumbers(autoSelectedPageNumbers);
    setSeriesMessageKind('info');
    setSeriesMessage(`Найдено прямых совпадений названия/кода: ${directMatchPages.length}`);
  };

  const handleFoundPageToggle = (pageNumber) => {
    setSelectedPageNumbers((current) => {
      if (current.includes(pageNumber)) {
        return current.filter((selectedPageNumber) => selectedPageNumber !== pageNumber);
      }

      return [...current, pageNumber].sort((firstPage, secondPage) => firstPage - secondPage);
    });
  };

  const buildSelectedPagesSource = () => {
    const brand = form.brand.trim();
    const category = form.category.trim();
    const catalogYear = form.sourceDate.trim();
    const seriesName = form.seriesName.trim();
    const selectedPagesArray = getSelectedPageNumbers(selectedPages);
    const rawText = selectedRawText.trim();

    if (!seriesName) {
      throw new Error('Введите название серии.');
    }

    if (selectedPagesArray.length === 0) {
      throw new Error('Выберите хотя бы одну страницу.');
    }

    if (!rawText) {
      throw new Error('Текст выбранных страниц пустой.');
    }

    return {
      title: `${brand} ${catalogYear} — ${seriesName}`.trim(),
      type: 'catalog',
      brand,
      category,
      seriesName,
      sourceDate: catalogYear,
      sourceRef: `PDF каталог ${catalogYear}, страницы ${selectedPagesArray.join(', ')}`,
      rawText,
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
              Найти серию
              <input
                name="seriesName"
                onChange={handleFormChange}
                placeholder="ICE PEAK, BOHO, DEFENDER"
                value={form.seriesName}
              />
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
                Показать все страницы, где найдено название или код серии
              </label>
            </div>
          </div>

          {seriesMessage && <p className={seriesMessageKind === 'error' ? 'notice error-notice' : 'notice'}>{seriesMessage}</p>}

          {seriesResult && (
            <div className="series-result">
              <h3>Источник из выбранных страниц</h3>
              <div className="notice pdf-auto-selection">
                <p>
                  Автоматически выбраны страницы:{' '}
                  {formatPageNumbers(seriesResult.autoSelectedPageNumbers || [])}
                </p>
                <p>
                  Исключены как служебные/сводные:{' '}
                  {formatPageNumbers(seriesResult.excludedPageNumbers || [])}
                </p>
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
                <div>
                  <dt>Найдено прямых совпадений названия/кода</dt>
                  <dd>{seriesResult.directMatchPages.length}</dd>
                </div>
                <div>
                  <dt>Страницы с прямым совпадением названия/кода</dt>
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
                  <h3>Страницы с прямым совпадением названия/кода серии</h3>
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
