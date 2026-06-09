# im-assortment-importer

Отдельный внутренний инструмент «Импортёр ассортимента» для одного администратора.

## Стек

- Vite + React
- Firebase / Firestore
- Без Firebase Storage API
- Без авторизации
- Без AI API
- Без PDF parser

## Firestore collections

- `sources`
- `seriesCards`

## Переменные окружения

Создайте `.env.local` и заполните настройки Firebase-проекта:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Команды

```bash
npm install
npm run dev
npm run build
```
