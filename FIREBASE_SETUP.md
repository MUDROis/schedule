# Настройка авторизации и базы данных

## Как устроено

| Страница | Кто | Что видит |
|---|---|---|
| `login.html` | вход | форма email + пароль |
| `index.html` | Анна Александровна (админ) | своё расписание и задачи + переключатель «Анна / Татьяна» над фильтрами (справа) |
| `teacher.html` | Татьяна Александровна | только своё расписание и свои задачи |

Данные хранятся в Firestore:

- `schedules/anna`, `schedules/tanya` — поля `{ schedule, times }`
- `tasks/anna`, `tasks/tanya` — поле `{ tasks }`

Изменения синхронизируются между устройствами автоматически. При первом запуске
расписание Анны переносится из localStorage устройства, откуда она заходит.
Офлайн-работа включена (Firestore persistence).

## Шаг 1. Ключи проекта

Заполните `firebase-config.js` значениями из Firebase Console →
⚙ Project settings → General → Your apps → SDK setup and configuration → Config.

## Шаг 2. Аккаунты

1. Firebase Console → **Authentication** → Get started → Sign-in method →
   включите **Email/Password**.
2. Вкладка **Users** → Add user:
   - email Анны Александровны + пароль
   - email Татьяны Александровны + пароль
3. Впишите оба email в `firebase-config.js` → `ROLE_EMAILS`
   (точно так же, как в Firebase).

Email определяет роль: админ попадает на `index.html`,
преподаватель — на `teacher.html`. Любой другой аккаунт не пускается.

## Шаг 3. База данных

1. Firebase Console → **Firestore Database** → Create database →
   Production mode → регион ближе к пользователям (например, `europe-west1`).
2. Вкладка **Rules** → вставьте содержимое файла `firestore.rules`,
   заменив `ANNA_EMAIL` и `TANYA_EMAIL` на реальные адреса → **Publish**.

## Шаг 4. Домены авторизации

Firebase Console → Authentication → Settings → **Authorized domains** →
Add domain → добавьте домен, где опубликовано приложение
(например, `<username>.github.io`). Без этого вход вернёт ошибку
`auth/unauthorized-domain`.

## Шаг 5. Публикация

Задеплоить всё как обычно. Версия кэша в `sw.js` уже поднята (`mudro-v2`),
новые страницы добавлены в precache.

## Проверка

1. Откройте сайт без входа → перекинет на `login.html`.
2. Войдите как Татьяна → откроется `teacher.html` с пустым расписанием;
   переключателя нет, кнопка выхода — в шапке справа.
3. Войдите как Анна → `index.html`; переключатель «Анна | Татьяна» — справа
   над расписанием, на одной строке с фильтрами.
4. Добавьте урок у Татьяны → у Анны он появится сам (live-синхронизация).
