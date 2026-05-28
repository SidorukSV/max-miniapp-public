# Changelog

Файл составлен на основе истории коммитов текущей ветки (`work`), которая содержит слияния PR в основную линию разработки.

## [0.14.0.0] «Дин Джарин — Неварро» — 2026-03-25
### Основное
- Слито обновление хранения auth-сессий и refresh-токенов в Redis (PR #14).
- Закреплена серверная модель хранения токенов через Redis-слой.

### Ключевые коммиты
- `01866df` Merge pull request #14 from `codex/store-sessions-and-refresh-tokens-in-redis-hli1hv`
- `15e1fab` Move auth sessions and refresh tokens storage to Redis

## [0.13.0.0] «Асока Тано — Лотал»
### Основное
- Вынесено хранение auth-сессий и refresh-токенов в Redis (PR #13).

### Ключевые коммиты
- `5cdd183` Merge pull request #13 from `codex/store-sessions-and-refresh-tokens-in-redis`
- `9d11c34` Move auth sessions and refresh tokens storage to Redis

## [0.12.0.0] «Оби-Ван Кеноби — Стюджон»
### Основное
- Улучшено состояние загрузки при подтверждении контакта (PR #12).
- Доработаны плейсхолдеры и UX загрузки в frontend.

### Ключевые коммиты
- `437dfcd` Merge pull request #12 from `codex/update-loading-placeholders-for-modern-design-fmshjj`
- `e958637` feat(auth): add modern loading state for contact confirmation

## [0.11.0.0] «Лея Органа — Алдераан»
### Основное
- Промежуточные интеграционные и hotfix-коммиты по выкатке loading-обновлений.

### Ключевые коммиты
- `03dec9e` hotfix
- `2e78b88` Merge branch 'main' into `codex/update-loading-placeholders-for-modern-design-fmshjj`

## [0.10.0.0] «Хан Соло — Кореллия»
### Основное
- Модернизированы loading skeletons и вынесены в отдельный компонент (PR #10).

### Ключевые коммиты
- `2867ffd` Merge pull request #10 from `codex/update-loading-placeholders-for-modern-design`
- `eba34da` feat(frontend): modernize loading skeletons
- `f82be44` refactor(frontend): extract loading cards into component

## [0.9.0.0] «Рэй — Джакку»
### Основное
- Добавлен localhost fallback-режим авторизации без запроса контакта MAX (PR #9).

### Ключевые коммиты
- `57fd450` Merge pull request #9 from `codex/enable-testing-from-localhost`
- `4bc2b87` Add localhost auth fallback without MAX contact request

## [0.8.0.0] «Квай-Гон Джинн — Корусант»
### Основное
- Завершена стабилизация бонусной истории и маппинга дат (PR #8).

### Ключевые коммиты
- `a4045ff` Merge pull request #8 from `codex/create-bonus-transaction-history-page-md0rjn`
- `91ee988` Fix bonus transaction date parsing and mapping

## [0.7.0.0] «Мейс Винду — Харуун Кал»
### Основное
- Исправлен парсинг дат бонусных транзакций и маппинг данных (PR #7).

### Ключевые коммиты
- `e2e52ce` Merge pull request #7 from `codex/create-bonus-transaction-history-page-xbxql6`
- `79ac53e` Fix bonus transaction date parsing and mapping

## [0.6.0.0] «Падме Амидала — Набу»
### Основное
- Доработано отображение бонусных операций, группировка и UI-правки (PR #6).

### Ключевые коммиты
- `c3bea40` Merge pull request #6 from `codex/create-bonus-transaction-history-page-79kfqj`
- `44cb520` Group bonus operations by date and right-align amounts

## [0.5.0.0] «Анакин Скайуокер — Мустафар»
### Основное
- Добавлена API-выдача бонусных операций и страница истории бонусов (PR #5).

### Ключевые коммиты
- `4ae3a89` Merge pull request #5 from `codex/create-bonus-transaction-history-page`
- `2dde93f` Add bonus transactions API and bonuses history page

## [0.4.0.0] «Йода — Дагоба»
### Основное
- Исправлены стили `QuestionDialog`, повышена читаемость и контраст (PR #4).

### Ключевые коммиты
- `d3bc240` Merge pull request #4 from `codex/add-confirmation-dialog-for-cancellation-l265eg`
- `10237b8` Исправить стиль QuestionDialog: непрозрачный фон и кнопка подтверждения

## [0.3.0.0] «Чубакка — Кашиик»
### Основное
- Вынесен диалог подтверждения в общий компонент `QuestionDialog` (PR #3).

### Ключевые коммиты
- `98ff99a` Merge pull request #3 from `codex/add-confirmation-dialog-for-cancellation`
- `5f01fa1` Вынести диалог подтверждения в общий компонент QuestionDialog

## [0.2.0.0] «Лэндо Калриссиан — Беспин»
### Основное
- Приведена в порядок структура `App.css` и комментарии по секциям (PR #2).

### Ключевые коммиты
- `5e57459` Merge pull request #2 from `codex/clean-up-app.css`
- `21a6e8f` style: organize App.css with clear section comments

## [0.1.0.0] «Люк Скайуокер — Татуин»
### Основное
- Базовый этап проекта: старт, Vite, маршрутизация, темы, интеграция MAX WebApp, auth-поток и backend API.
- Добавлена валидация подписи MAX `initData` (PR #1).

### Ключевые коммиты
- `5114a5a` start
- `7dd2d08` vite
- `7043200` dark theme
- `ca88067` BrowserRouter
- `32f68cf` backend - jwt tokens + api v1
- `8ab68bf` feat(auth): add MAX initData signature validation
- `ce94ce2` Merge pull request #1 from `codex/add-initdata-validation-for-bot-in-max`
