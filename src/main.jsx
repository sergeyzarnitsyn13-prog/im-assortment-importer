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
  salesArguments: [],
  clientSpeech: '',
  differences: '',
  whenRecommend: [],
  whenNotRecommend: [],
  objections: [],
  technicalSpecs: [],
  importantSpecs: [],
  sourceIds: [],
  status: 'draft',
};

const ARRAY_FIELDS = [
  'targetClient',
  'keyFeatures',
  'salesFeatures',
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
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sourcesQuery = query(collection(db, 'sources'), orderBy('createdAt', 'desc'));

    return onSnapshot(sourcesQuery, (snapshot) => {
      setSources(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  useEffect(() => {
    const cardsQuery = query(collection(db, 'seriesCards'), orderBy('updatedAt', 'desc'));

    return onSnapshot(cardsQuery, (snapshot) => {
      setSeriesCards(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  const draftJson = useMemo(() => serializeCard(draft), [draft]);

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
    setDraft({ ...DRAFT_INITIAL, ...card });
    setEditingCardId(card.id);
    setActiveTab('draft');
    showMessage('Карточка открыта в черновике.');
  };

  const handleCopyJson = async (card) => {
    await navigator.clipboard.writeText(serializeCard(card));
    showMessage('JSON скопирован в буфер обмена.');
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

      {activeTab === 'draft' && (
        <DraftTab
          draft={draft}
          draftJson={draftJson}
          editingCardId={editingCardId}
          onChange={handleDraftChange}
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

function DraftTab({ draft, draftJson, editingCardId, onChange, onSubmit }) {
  return (
    <section className="layout-grid draft-grid">
      <form className="panel" onSubmit={onSubmit}>
        <h2>{editingCardId ? 'Редактировать карточку серии' : 'Черновик карточки серии'}</h2>
        <div className="form-grid">
          <TextInput name="brand" onChange={onChange} value={draft.brand} />
          <TextInput name="category" onChange={onChange} value={draft.category} />
          <TextInput name="seriesName" onChange={onChange} value={draft.seriesName} />
          <label className="wide-field">
            {FIELD_LABELS.shortDescription}
            <textarea name="shortDescription" onChange={onChange} value={draft.shortDescription} />
          </label>
          <label className="wide-field">
            {FIELD_LABELS.positioning}
            <textarea name="positioning" onChange={onChange} value={draft.positioning} />
          </label>
          <fieldset className="field-group wide-field">
            <legend>Продажная информация</legend>
            {SALES_INFORMATION_FIELDS.map((field) => (
              <DraftTextarea draft={draft} field={field} key={field} onChange={onChange} />
            ))}
          </fieldset>
          <fieldset className="field-group wide-field">
            <legend>Техническая информация</legend>
            {TECHNICAL_INFORMATION_FIELDS.map((field) => (
              <DraftTextarea draft={draft} field={field} key={field} onChange={onChange} />
            ))}
          </fieldset>
          <fieldset className="field-group wide-field">
            <legend>Служебная совместимость</legend>
            <DraftTextarea draft={draft} field="keyFeatures" onChange={onChange} />
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

function DraftTextarea({ draft, field, onChange }) {
  const value = ARRAY_FIELDS.includes(field) ? toLines(draft[field]) : draft[field] || '';

  return (
    <label className="wide-field">
      {FIELD_LABELS[field]}
      <textarea name={field} onChange={onChange} value={value} />
    </label>
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
