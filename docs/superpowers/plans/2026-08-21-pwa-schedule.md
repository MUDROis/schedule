# PWA «Расписание МУДРО» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить `index.html` в устанавливаемое PWA с полным офлайном (manifest + service worker + иконки + автосохранение).

**Architecture:** Статические файлы без сборки. Service worker precache'ит app shell, CDN-шрифты кэширует stale-while-revalidate. Данные остаются в localStorage; добавляется автосохранение при каждом изменении.

**Tech Stack:** Vanilla HTML/JS, Web App Manifest, Service Worker API, node+sharp (однократная генерация иконок вне репозитория).

**Спек:** `docs/superpowers/specs/2026-08-21-pwa-schedule-design.md`

## Global Constraints

- Никаких инструментов сборки в репозитории (процесс публикации — загрузка файлов через веб-интерфейс GitHub).
- Кнопки «Сохранить» остаются (дублируют автосохранение).
- Ключи localStorage не меняются: `schedule`, `times`, `tasks`.
- UI-текст на русском.
- Версия кэша: константа `CACHE_VERSION = 'mudro-v1'` в sw.js.
- Тестового фреймворка нет и не добавляем (YAGNI); проверка — точные команды с ожидаемым результатом.

---

### Task 1: Иконки и favicon

**Files:**
- Create: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png`, `favicon.svg`

**Interfaces:** Produces файлы, на которые ссылаются manifest.json (Task 2), index.html (Task 4), sw.js (Task 3).

- [ ] **Step 1: Установить sharp во временную папку**

```powershell
$gen = "$env:TEMP\opencode\mudro-icons"
New-Item -ItemType Directory -Force -Path $gen | Out-Null
npm init -y --prefix $gen
npm install sharp --prefix $gen
```

Expected: `added N packages`.

- [ ] **Step 2: Написать скрипт генерации** `$env:TEMP\opencode\mudro-icons\gen-icons.mjs` — оранжевый градиент `#ffc873 → #ff9d3f`, белый глиф календаря (24×24 → масштаб), maskable-версии с глифом 240/512 внутри safe-zone, apple-touch-icon 180 full-bleed, favicon.svg rx=100.

- [ ] **Step 3: Запустить** `node gen-icons.mjs "<repo>"` → 5 PNG + favicon.svg созданы, размеры > 0.

- [ ] **Step 4: Проверить визуально** (Read PNG) — календарь по центру, без обрезки.

- [ ] **Step 5: Commit** `git add icons favicon.svg; git commit -m "PWA: иконки приложения и favicon"`

### Task 2: manifest.json

**Files:** Create: `manifest.json`. Содержимое — из спека (name «Расписание МУДРО», short_name «МУДРО», lang ru, start_url ./index.html, scope ./, display standalone, цвета #0a0d13, 4 иконки).

- [ ] **Step 1: Создать файл**
- [ ] **Step 2: Валидация JSON** `node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"` → без ошибок.
- [ ] **Step 3: Commit**

### Task 3: sw.js

**Files:** Create: `sw.js`. Precache app shell; fetch: navigate → network-first c fallback на index.html; same-origin → cache-first; jsdelivr/cdnjs → stale-while-revalidate; skipWaiting + clients.claim; очистка старых версий.

- [ ] **Step 1: Создать файл** (полный код в плане)
- [ ] **Step 2: Проверка синтаксиса** `node --check sw.js` → OK.
- [ ] **Step 3: Commit**

### Task 4: index.html — мета-теги и кнопка установки

**Files:** Modify: `index.html` (head после font-awesome link; кнопка в `.controls` после importScheduleFile).

- manifest link, theme-color #0a0d13, favicon.svg, apple-touch-icon, apple-mobile-web-app-* мета.
- Кнопка `<button id="installBtn" style="display:none">…Установить</button>` (иконка fa-mobile-screen-button).
- [ ] **Step 1–2: Правки**, **Step 3: Commit**

### Task 5: index.html — автосохранение

**Files:** Modify: `index.html` (JS).

- `persistSchedule()` / `persistTasks()` с try/catch + уведомлением при ошибке.
- `saveSchedule()` и `saveTasksToStorage()` вызывают persist + notification (кнопки живут).
- Вызовы persistSchedule(): submit lessonForm, submit timeForm, handleDrop, deleteSpecificLesson, deleteLesson, deleteTimeSlot, importSchedule.
- Вызовы persistTasks(): saveTask, toggleTask, deleteTask, clearCompleted, importTasks, handleTaskDrop.
- Удалить `function saveTasks(){…}` и `setInterval(saveTasks, 5000);`.
- [ ] **Step 1: Правки**, **Step 2: Проверка отсутствия setInterval**, **Step 3: Commit**

### Task 6: index.html — регистрация SW, обновление, установка

**Files:** Modify: `index.html` (JS перед `loadSchedule();`).

- Регистрация `sw.js`; при активации нового SW при наличии контроллера: sessionStorage флаг `swUpdated` → reload → showNotification('Приложение обновлено!').
- beforeinstallprompt/appinstalled/installApp() для кнопки установки.
- [ ] **Step 1: Правки**, **Step 2: Commit**

### Task 7: Финальная проверка

- [ ] Локальный сервер (`npx serve .` или python http.server): `/`, `/manifest.json`, `/sw.js`, `/icons/icon-512.png` → HTTP 200.
- [ ] `node --check sw.js` OK; JSON манифеста валиден.
- [ ] README: краткая инструкция (обновление = изменить CACHE_VERSION).
- [ ] Commit README.
