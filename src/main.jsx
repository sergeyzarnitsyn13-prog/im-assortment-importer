import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateIcePeakDraft, generateSeriesDraft } from './generateSeriesDraft';
import './styles.css';

const SOURCE_TYPES = [
  'catalog',
  'price',
  'presentation',
  'instruction',
  'screenshot',
  'link',
  'note',
];

const TABS = {
  sources: 'Источники',
  cards: 'Карточки серий',
  compare: 'Сравнение серий',
  draft: 'Черновик',
};

const SOURCE_INITIAL = {
  title: '',
  type: 'catalog',
  brand: '',
  category: '',
  seriesName: '',
  sourceDate: '',
  sourceRef: '',
  rawText: '',
};

const DRAFT_INITIAL = {
  brand: '',
  category: '',
  seriesName: '',
  shortDescription: '',
  positioning: '',
  targetClient: [],
  mainSalesIdea: '',
  keyFeatures: [],
  salesFeatures: [],
  mainAdvantages: [],
  salesArguments: [],
  clientSpeech: '',
  differences: '',
  whenRecommend: [],
  whenNotRecommend: [],
  objections: [],
  technicalSpecs: [],
  importantSpecs: [],
  sourceIds: [],
  sourceRefs: {},
  status: 'draft',
};

const ARRAY_FIELDS = [
  'targetClient',
  'keyFeatures',
  'salesFeatures',
  'mainAdvantages',
  'salesArguments',
  'whenRecommend',
  'whenNotRecommend',
  'objections',
  'technicalSpecs',
  'importantSpecs',
];

const SALES_INFORMATION_FIELDS = [
  'targetClient',
  'mainSalesIdea',
  'salesFeatures',
  'mainAdvantages',
  'salesArguments',
  'clientSpeech',
  'whenRecommend',
  'whenNotRecommend',
  'objections',
];

const TECHNICAL_INFORMATION_FIELDS = [
  'technicalSpecs',
  'importantSpecs',
  'differences',
];

const FIELD_LABELS = {
  title: 'Название',
  type: 'Тип',
  brand: 'Бренд',
  category: 'Категория',
  seriesName: 'Серия',
  sourceDate: 'Дата источника',
  sourceRef: 'Ссылка / номер / примечание',
  rawText: 'Исходный текст',
  shortDescription: 'Краткое описание',
  positioning: 'Позиционирование',
  targetClient: 'Целевой клиент',
  mainSalesIdea: 'Главная продажная идея',
  keyFeatures: 'Ключевые особенности (legacy)',
  salesFeatures: 'Продажные особенности',
  mainAdvantages: 'Главные преимущества',
  salesArguments: 'Аргументы продаж',
  clientSpeech: 'Речь для клиента',
  differences: 'Отличия',
  whenRecommend: 'Когда рекомендовать',
  whenNotRecommend: 'Когда не рекомендовать',
  objections: 'Возражения',
  technicalSpecs: 'Технические характеристики',
  importantSpecs: 'Важные характеристики',
};

const toLines = (value) => (Array.isArray(value) ? value.join('\n') : '');
const fromLines = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const prepareCardPayload = (card) => {
  const { id, createdAt, updatedAt, ...payload } = card;

  return payload;
};

const serializeCard = (card) => JSON.stringify(prepareCardPayload(card), null, 2);

function App() {
  const [activeTab, setActiveTab] = useState('sources');
  const [sourceForm, setSourceForm] = useState(SOURCE_INITIAL);
  const [draft, setDraft] = useState(DRAFT_INITIAL);
  const [editingCardId, setEditingCardId] = useState(null);
  const [sources, setSources] = useState([]);
  const [seriesCards, setSeriesCards] = useState([]);
  const [seriesCardsError, setSeriesCardsError] = useState('');
  const [comparisonForm, setComparisonForm] = useState({ firstCardId: '', secondCardId: '' });
  const [comparisonIds, setComparisonIds] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sourcesQuery = query(collection(db, 'sources'), orderBy('createdAt', 'desc'));

    return onSnapshot(sourcesQuery, (snapshot) => {
      setSources(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  useEffect(() => {
    try {
      const cardsQuery = query(collection(db, 'seriesCards'), orderBy('updatedAt', 'desc'));

      return onSnapshot(
        cardsQuery,
        (snapshot) => {
          try {
            setSeriesCards(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
            setSeriesCardsError('');
          } catch (error) {
            setSeriesCardsError(`Ошибка обработки карточек серий: ${error.message}`);
          }
        },
        (error) => {
          setSeriesCardsError(`Ошибка загрузки карточек серий: ${error.message}`);
        },
      );
    } catch (error) {
      setSeriesCardsError(`Ошибка загрузки карточек серий: ${error.message}`);
      return undefined;
    }
  }, []);

  const draftJson = useMemo(() => serializeCard(draft), [draft]);
  const comparedCards = useMemo(() => {
    if (!comparisonIds) {
      return null;
    }

    return {
      first: seriesCards.find((card) => card.id === comparisonIds.firstCardId) || null,
      second: seriesCards.find((card) => card.id === comparisonIds.secondCardId) || null,
    };
  }, [comparisonIds, seriesCards]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3000);
  };

  const handleSourceChange = (event) => {
    const { name, value } = event.target;
    setSourceForm((current) => ({ ...current, [name]: value }));
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;

    setDraft((current) => ({
      ...current,
      [name]: ARRAY_FIELDS.includes(name) ? fromLines(value) : value,
    }));
  };

  const handleDraftSourceRefChange = (field, value) => {
    setDraft((current) => ({
      ...current,
      sourceRefs: {
        ...(current.sourceRefs || {}),
        [field]: value,
      },
    }));
  };

  const handleSourceSubmit = async (event) => {
    event.preventDefault();

    await addDoc(collection(db, 'sources'), {
      ...sourceForm,
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setSourceForm(SOURCE_INITIAL);
    showMessage('Источник сохранён.');
  };

  const handleBuildDraft = (source) => {
    setDraft(generateSeriesDraft(source));
    setEditingCardId(null);
    setActiveTab('draft');
    showMessage('Черновик собран из источника.');
  };

  const handleIcePeakTest = () => {
    setDraft(generateIcePeakDraft(sourceForm));
    setEditingCardId(null);
    setActiveTab('draft');
    showMessage('Черновик ICE PEAK заполнен правилами.');
  };

  const handleOpenCard = (card) => {
    setDraft({ ...DRAFT_INITIAL, ...card, sourceRefs: card.sourceRefs || {} });
    setEditingCardId(card.id);
    setActiveTab('draft');
    showMessage('Карточка открыта в черновике.');
  };

  const handleCopyJson = async (card) => {
    await navigator.clipboard.writeText(serializeCard(card));
    showMessage('JSON скопирован в буфер обмена.');
  };

  const handleComparisonChange = (event) => {
    const { name, value } = event.target;

    setComparisonForm((current) => ({ ...current, [name]: value }));
    setComparisonIds(null);
  };

  const handleCompareSeries = (event) => {
    event.preventDefault();

    if (
      !comparisonForm.firstCardId ||
      !comparisonForm.secondCardId ||
      comparisonForm.firstCardId === comparisonForm.secondCardId
    ) {
      showMessage('Выберите две разные серии для сравнения.');
      return;
    }

    setComparisonIds({ ...comparisonForm });
    showMessage('Сравнение построено из сохранённых карточек.');
  };

  const handleDraftSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...prepareCardPayload(draft),
      updatedAt: serverTimestamp(),
    };

    if (editingCardId) {
      await setDoc(doc(db, 'seriesCards', editingCardId), payload, { merge: true });
    } else {
      const createdCard = await addDoc(collection(db, 'seriesCards'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      setEditingCardId(createdCard.id);
    }

    showMessage('Карточка серии сохранена.');
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Внутренний инструмент администратора</p>
          <h1>Импортёр ассортимента</h1>
        </div>
        {message && <div className="notice">{message}</div>}
      </header>

      <nav className="tabs" aria-label="Основные разделы">
        {Object.entries(TABS).map(([key, label]) => (
          <button
            className={activeTab === key ? 'tab tab-active' : 'tab'}
            key={key}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'sources' && (
        <SourcesTab
          form={sourceForm}
          onBuildDraft={handleBuildDraft}
          onChange={handleSourceChange}
          onIcePeakTest={handleIcePeakTest}
          onSubmit={handleSourceSubmit}
          sources={sources}
        />
      )}

      {activeTab === 'cards' && (
        <SeriesCardsTab
          cards={seriesCards}
          onCopyJson={handleCopyJson}
          onOpenCard={handleOpenCard}
        />
      )}

      {activeTab === 'compare' && (
        <SeriesComparisonTab
          cards={seriesCards}
          comparedCards={comparedCards}
          error={seriesCardsError}
          form={comparisonForm}
          onChange={handleComparisonChange}
          onCompare={handleCompareSeries}
        />
      )}

      {activeTab === 'draft' && (
        <DraftTab
          draft={draft}
          draftJson={draftJson}
          editingCardId={editingCardId}
          onChange={handleDraftChange}
          onSourceRefChange={handleDraftSourceRefChange}
          onSubmit={handleDraftSubmit}
        />
      )}
    </main>
  );
}

function SourcesTab({ form, onBuildDraft, onChange, onIcePeakTest, onSubmit, sources }) {
  return (
    <section className="layout-grid">
      <form className="panel" onSubmit={onSubmit}>
        <h2>Добавить источник</h2>
        <div className="form-grid">
          <TextInput name="title" onChange={onChange} required value={form.title} />
          <label>
            {FIELD_LABELS.type}
            <select name="type" onChange={onChange} value={form.type}>
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <TextInput name="brand" onChange={onChange} value={form.brand} />
          <TextInput name="category" onChange={onChange} value={form.category} />
          <TextInput name="seriesName" onChange={onChange} value={form.seriesName} />
          <TextInput name="sourceDate" onChange={onChange} type="date" value={form.sourceDate} />
          <label className="wide-field">
            {FIELD_LABELS.sourceRef}
            <input name="sourceRef" onChange={onChange} value={form.sourceRef} />
          </label>
          <label className="wide-field">
            {FIELD_LABELS.rawText}
            <textarea name="rawText" onChange={onChange} required value={form.rawText} />
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-button" type="submit">
            Сохранить источник
          </button>
          <button
            className="secondary-button"
            disabled={!form.rawText.trim()}
            onClick={onIcePeakTest}
            type="button"
          >
            Тест ICE PEAK
          </button>
        </div>
      </form>

      <section className="panel">
        <h2>Последние источники</h2>
        <div className="card-list">
          {sources.map((source) => (
            <article className="item-card" key={source.id}>
              <div>
                <h3>{source.title || 'Без названия'}</h3>
                <p>
                  {source.brand} · {source.category} · {source.seriesName}
                </p>
                <p className="muted">
                  {source.type} · статус: {source.status}
                </p>
              </div>
              <button type="button" onClick={() => onBuildDraft(source)}>
                Собрать карточку серии
              </button>
            </article>
          ))}
          {sources.length === 0 && <p className="muted">Источников пока нет.</p>}
        </div>
      </section>
    </section>
  );
}

function SeriesCardsTab({ cards, onCopyJson, onOpenCard }) {
  return (
    <section className="panel">
      <h2>Карточки серий</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Бренд</th>
              <th>Категория</th>
              <th>Серия</th>
              <th>Краткое описание</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id}>
                <td>{card.brand}</td>
                <td>{card.category}</td>
                <td>{card.seriesName}</td>
                <td>{card.shortDescription}</td>
                <td>{card.status}</td>
                <td className="actions-cell">
                  <button type="button" onClick={() => onOpenCard(card)}>
                    Открыть
                  </button>
                  <button type="button" onClick={() => onCopyJson(card)}>
                    Копировать JSON
                  </button>
                </td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr>
                <td className="muted" colSpan="6">
                  Карточек серий пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


const COMPARISON_FIELDS = [
  'brand',
  'category',
  'seriesName',
  'shortDescription',
  'positioning',
  'targetClient',
  'mainSalesIdea',
  'salesFeatures',
  'mainAdvantages',
  'salesArguments',
  'clientSpeech',
  'differences',
  'whenRecommend',
  'whenNotRecommend',
  'objections',
  'technicalSpecs',
  'importantSpecs',
];

const getCardTitle = (card) => {
  if (!card) {
    return 'Карточка не выбрана';
  }

  return [card.brand, card.category, card.seriesName].filter(Boolean).join(' · ') || 'Без названия';
};

const renderComparisonValue = (value) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="muted">Не заполнено</p>;
    }

    return (
      <ul className="comparison-list">
        {value.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  if (!value) {
    return <p className="muted">Не заполнено</p>;
  }

  return <p>{value}</p>;
};

function SeriesComparisonTab({ cards = [], comparedCards, error, form, onChange, onCompare }) {
  const hasEnoughCards = cards.length >= 2;

  return (
    <section className="panel">
      <h2>Сравнение серий</h2>
      {error && <p className="notice error-notice">{error}</p>}

      {cards.length === 0 && (
        <p className="muted comparison-empty">
          Нет сохранённых карточек серий. Сначала сохраните минимум две карточки.
        </p>
      )}

      {cards.length === 1 && (
        <p className="muted comparison-empty">
          Для сравнения нужно минимум две сохранённые карточки.
        </p>
      )}

      {hasEnoughCards && (
        <>
          <form className="comparison-form" onSubmit={onCompare}>
            <label>
              Серия 1
              <select name="firstCardId" onChange={onChange} required value={form.firstCardId}>
                <option value="">Выберите серию</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {getCardTitle(card)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Серия 2
              <select name="secondCardId" onChange={onChange} required value={form.secondCardId}>
                <option value="">Выберите серию</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {getCardTitle(card)}
                  </option>
                ))}
              </select>
            </label>
            <div className="comparison-actions">
              <button
                className="primary-button"
                disabled={
                  !form.firstCardId || !form.secondCardId || form.firstCardId === form.secondCardId
                }
                type="submit"
              >
                Сравнить
              </button>
            </div>
          </form>

          {comparedCards && comparedCards.first && comparedCards.second && (
            <section className="comparison-result" aria-label="Результат сравнения серий">
              <div className="comparison-columns">
                {[comparedCards.first, comparedCards.second].map((card) => (
                  <article className="comparison-column" key={card.id}>
                    <h3>{getCardTitle(card)}</h3>
                    {COMPARISON_FIELDS.map((field) => (
                      <div className="comparison-field" key={field}>
                        <h4>{FIELD_LABELS[field]}</h4>
                        {renderComparisonValue(card[field])}
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

function DraftTab({ draft, draftJson, editingCardId, onChange, onSourceRefChange, onSubmit }) {
  return (
    <section className="layout-grid draft-grid">
      <form className="panel" onSubmit={onSubmit}>
        <h2>{editingCardId ? 'Редактировать карточку серии' : 'Черновик карточки серии'}</h2>
        <div className="form-grid">
          <TextInput name="brand" onChange={onChange} value={draft.brand} />
          <TextInput name="category" onChange={onChange} value={draft.category} />
          <TextInput name="seriesName" onChange={onChange} value={draft.seriesName} />
          <DraftTextarea
            draft={draft}
            field="shortDescription"
            onChange={onChange}
            onSourceRefChange={onSourceRefChange}
          />
          <DraftTextarea
            draft={draft}
            field="positioning"
            onChange={onChange}
            onSourceRefChange={onSourceRefChange}
          />
          <fieldset className="field-group wide-field">
            <legend>Продажная информация</legend>
            {SALES_INFORMATION_FIELDS.map((field) => (
              <DraftTextarea
                draft={draft}
                field={field}
                key={field}
                onChange={onChange}
                onSourceRefChange={onSourceRefChange}
              />
            ))}
          </fieldset>
          <fieldset className="field-group wide-field">
            <legend>Техническая информация</legend>
            {TECHNICAL_INFORMATION_FIELDS.map((field) => (
              <DraftTextarea
                draft={draft}
                field={field}
                key={field}
                onChange={onChange}
                onSourceRefChange={onSourceRefChange}
              />
            ))}
          </fieldset>
          <fieldset className="field-group wide-field">
            <legend>Служебная совместимость</legend>
            <DraftTextarea
              draft={draft}
              field="keyFeatures"
              onChange={onChange}
              onSourceRefChange={onSourceRefChange}
            />
          </fieldset>
        </div>
        <button className="primary-button" type="submit">
          Сохранить карточку серии
        </button>
      </form>
      <aside className="panel">
        <h2>JSON черновика</h2>
        <pre className="json-preview">{draftJson}</pre>
      </aside>
    </section>
  );
}

function DraftTextarea({ draft, field, onChange, onSourceRefChange }) {
  const value = ARRAY_FIELDS.includes(field) ? toLines(draft[field]) : draft[field] || '';
  const sourceRef = draft.sourceRefs?.[field] || '';

  return (
    <div className="draft-block wide-field">
      <div className="draft-block-header">
        <label className="draft-block-title" htmlFor={field}>
          {FIELD_LABELS[field]}
        </label>
        <label className="source-ref-field">
          <span>Источник</span>
          <input
            name={`${field}SourceRef`}
            onChange={(event) => onSourceRefChange(field, event.target.value)}
            placeholder="Например: Каталог Ballu 2026"
            value={sourceRef}
          />
        </label>
      </div>
      <textarea id={field} name={field} onChange={onChange} value={value} />
    </div>
  );
}

function TextInput({ name, onChange, required = false, type = 'text', value }) {
  return (
    <label>
      {FIELD_LABELS[name]}
      <input name={name} onChange={onChange} required={required} type={type} value={value} />
    </label>
  );
}

createRoot(document.getElementById('root')).render(<App />);
