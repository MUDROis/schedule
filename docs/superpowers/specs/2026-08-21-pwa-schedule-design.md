# Дизайн: PWA «Расписание МУДРО»

Дата: 2026-08-21
Статус: утверждён пользователем

## Цель

Превратить существующее одностраничное приложение `index.html` (расписание занятий с трекером задач) в полноценное PWA: установка на Android/iOS/десктоп и полная работа офлайн.

## Контекст

- Приложение — один файл `index.html` (~2300 строк): сетка расписания (слоты времени × дни Пн–Сб), уроки (ученик, предмет, тип), drag&drop, фильтры, трекер задач.
- Данные хранятся в localStorage (`schedule`, `times`, `tasks`) → офлайн-данные уже работают.
- Шрифты (Golos Text, Unbounded) и Font Awesome подключены с CDN (jsdelivr, cdnjs).
- Хостинг: GitHub Pages (HTTPS есть). Рабочий процесс публикации — загрузка файлов через веб-интерфейс GitHub, без инструментов сборки.

## Решения, утверждённые пользователем

1. Подход: статические файлы без сборки (manifest + service worker + иконки).
2. Автосохранение расписания и задач при каждом изменении; кнопки «Сохранить» остаются как есть.
3. Обновления SW применяются автоматически с одной перезагрузкой страницы.

## Новые файлы

```
schedule/
├── index.html              ← изменяется
├── manifest.json           ← новый
├── sw.js                   ← новый
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png   (180×180)
└── favicon.svg
```

Иконки генерируются один раз локально (node + sharp) из стиля логотипа приложения (оранжевый градиент `#ffc873 → #ff9d3f`, белый глиф календаря) и коммитятся готовыми PNG. Инструменты генерации в репозиторий не входят.

## manifest.json

```json
{
  "name": "Расписание МУДРО",
  "short_name": "МУДРО",
  "description": "Расписание занятий Интерактивной школы МУДРО",
  "lang": "ru",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0a0d13",
  "theme_color": "#0a0d13",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Изменения в index.html

1. В `<head>`:
   - `<link rel="manifest" href="manifest.json">`
   - `<meta name="theme-color" content="#0a0d13">`
   - `<link rel="icon" href="favicon.svg" type="image/svg+xml">`
   - `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`
   - `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title: МУДРО`
2. Регистрация service worker (`sw.js`) после загрузки страницы.
3. Кнопка «Установить приложение»: перехват `beforeinstallprompt`, показ кнопки в блоке `.controls`; скрыта, если промпт недоступен или приложение уже установлено (`appinstalled`). На iOS не показывается (установка через «На экран Домой»).
4. Автосохранение:
   - новая функция `persistSchedule()` — пишет `schedule` и `times` в localStorage, обёрнута в try/catch (при ошибке — уведомление);
   - вызывается после каждого изменения расписания: сохранение урока, удаление урока/слота, drag&drop, импорт;
   - задачи: `saveTasks()` вызывается после каждого действия (создание, редактирование, удаление, переключение, очистка выполненных, импорт, перетаскивание); интервал `setInterval(saveTasks, 5000)` удаляется;
   - существующие кнопки «Сохранить» остаются без изменений.
5. Уведомление «Приложение обновлено» после автообновления SW.

Логика приложения и структура данных не меняются.

## sw.js

- Константа `CACHE_VERSION = 'mudro-v1'` — единственное место, требующее ручного изменения при обновлении приложения.
- **install**: precache `./`, `./index.html`, `./manifest.json`, все иконки, `./favicon.svg`; затем `skipWaiting()`.
- **activate**: удаление кэшей со старой версией; `clients.claim()`.
- **fetch**:
  - навигации (запросы документа) — network-first, при отсутствии сети fallback на закэшированный `index.html`;
  - same-origin статика — cache-first;
  - CDN jsdelivr/cdnjs (шрифты, Font Awesome) — stale-while-revalidate (opaque-ответы кэшируются).

### Поток обновления

1. При визите браузер находит новый sw.js → устанавливает в фоне.
2. `skipWaiting()` → новый SW активируется сразу.
3. На странице: если `navigator.serviceWorker.controller` существовал и сработал `controllerchange` — одна перезагрузка (флаг против цикла) + уведомление «Приложение обновлено».
4. Автосохранение гарантирует, что несохранённых изменений нет.

### Офлайн

После первого онлайн-визита доступны всё: расписание, задачи, drag&drop, экспорт/импорт, оформление (шрифты из кэша). Данные — в localStorage.

## Обработка ошибок

- Сбой сети при навигации → кэшированный index.html.
- Ошибка записи localStorage (переполнение) → try/catch + уведомление пользователю.
- Ошибки импорта JSON уже обрабатываются приложением — не меняются.

## Проверка

1. Локально: `npx serve` (или любой статический сервер) → Chrome DevTools → Application: манифест без ошибок, SW activated; режим Offline → перезагрузка работает, шрифты из кэша.
2. Lighthouse → PWA: installable, offline.
3. GitHub Pages: установка на Android («Установить приложение») и iOS («На экран Домой»), работа в самолётном режиме.
4. Регрессия: создание/редактирование/удаление уроков и задач, drag&drop, фильтры, экспорт/импорт, сброс — поведение не изменилось; автосохранение переживает закрытие вкладки без нажатия «Сохранить».

## Вне рамок (YAGNI)

- Push-уведомления, Background Sync, офлайн-страница-заглушка, переезд на сборку Vite.
