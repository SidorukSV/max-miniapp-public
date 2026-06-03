# max-miniapp

## INSTALLATION GUIDES

- `Ubuntu / Debian`: [UBUNTU.md](install-guide/UBUNTU.MD)
- `Windows Server`:  [WINDOWS-SERVER.md](install-guide/WINDOWS-SERVER.MD)


### Запуск backend (dev)

```bash
cd backend
npm install
# 1) создайте .env на основе примера ниже
# 2) заполните обязательные значения
npm run dev
```

`JWT_SECRET` обязателен. Backend завершит запуск с ошибкой, если:
- переменная отсутствует или пустая;
- длина меньше `32` символов;
- секрет не содержит минимум 3 из 4 классов символов: `A-Z`, `a-z`, `0-9`, спецсимволы.

Рекомендуется генерировать `JWT_SECRET` как случайную строку высокой энтропии (например, через password manager или `openssl rand`).

Если Redis не локальный, укажите URL перед запуском:

```bash
JWT_SECRET='YourStrongRandomSecretAtLeast32Chars!2026' REDIS_URL=redis://<host>:6379 npm run dev
```

### Заполнение `.env` (рекомендуемый способ)

Создайте файл `backend/.env`:

```env
# Обязательные
JWT_SECRET=replace_with_strong_random_secret

# Опциональные (с дефолтами)
PORT=3000
NODE_ENV=development
REDIS_URL=redis://127.0.0.1:6379
REDIS_CONNECT_TIMEOUT_MS=5000
MAX_INIT_DATA_MAX_AGE_SECONDS=300

# Приём клиентских логов
# Альтернативная авторизация для /api/v1/send-log (если нужен сервисный доступ без JWT)
LOGS_INTERNAL_API_KEY=
# Ограничение запросов на /api/v1/send-log в минуту на IP
LOGS_RATE_LIMIT_PER_MINUTE=30

# CORS allowlist (через запятую)
# В production указывайте только реальные домены фронта.
# В development localhost добавляется автоматически в коде.
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

# Refresh-cookie (cookie-based auth refresh flow)
# Имя cookie для refresh-токена
REFRESH_COOKIE_NAME=refresh_token
# SameSite: none|lax|strict (по умолчанию none)
REFRESH_COOKIE_SAMESITE=none
# Secure-атрибут cookie (по умолчанию true в production, иначе false)
REFRESH_COOKIE_SECURE=false

# Dev TOTP proof для localhost/web авторизации
# Base32-секрет (например, из 1Password/Google Authenticator)
DEV_TOTP_SECRET=
# Период TOTP в секундах (по умолчанию 30)
DEV_TOTP_PERIOD_SECONDS=30
# Допустимое окно дрейфа по шагам (по умолчанию 1)
DEV_TOTP_WINDOW=1
```

Запуск:

```bash
cd backend
npm run dev
```

> Не коммитьте `.env` в репозиторий. Для команды храните production-секреты в менеджере секретов (например, 1Password Secrets Automation, HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Doppler).

### Переменные refresh-cookie

- `REFRESH_COOKIE_NAME` — имя cookie, в которой backend хранит refresh-токен.
- `REFRESH_COOKIE_SAMESITE` — политика `SameSite` (`none`, `lax`, `strict`).
- `REFRESH_COOKIE_SECURE` — включает атрибут `Secure` для refresh-cookie.
  - если не задано, backend использует `true` при `NODE_ENV=production`, иначе `false`;
  - в production рекомендуется всегда использовать `Secure=true` и HTTPS.

### Где и как генерировать `JWT_SECRET`

Требования backend: минимум 32 символа и минимум 3 из 4 классов (`A-Z`, `a-z`, `0-9`, спецсимволы).

Практичные варианты:

1. **OpenSSL (локально в терминале):**
   ```bash
   openssl rand -base64 48
   ```
2. **Node.js (без сторонних утилит):**
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```
3. **Password manager** — сгенерируйте random password/string длиной 48–64 символа и сохраните в защищённом vault.

Рекомендации по безопасности:
- не отправляйте `JWT_SECRET` в чаты, тикеты и логи;
- не храните в коде/README реальные значения;
- ротируйте секрет при компрометации и по регламенту;
- для production используйте только секреты из secret manager/CI variables.

## Конфиг 1C в отдельном `.yml`

Backend использует один конфиг 1C из YAML-файла.

- Путь по умолчанию: `backend/onec-config.yml` (если запускать из папки `backend`, то просто `onec-config.yml`).
- Можно указать свой путь через `ONEC_CONFIG_FILE`.
- Для примера используйте `backend/onec-config.example.yml`.

Пример запуска с кастомным путем:

```bash
cd backend
ONEC_CONFIG_FILE=./onec-config.example.yml npm run dev
```

> Новый формат — один объект 1C без дополнительных разделений.


### Dev TOTP proof для localhost (код из приложения-аутентификатора)

Для `channel=web` в `NODE_ENV!=production` backend теперь требует `proof.totp_code`.
Код берётся разработчиком из приложения-аутентификатора на устройстве (Google Authenticator, 1Password, Aegis и т.д.).

1. Задайте `DEV_TOTP_SECRET` в `backend/.env` (Base32).
2. Добавьте этот же секрет в TOTP-приложение на устройстве разработчика.
3. Перезапустите backend и frontend.
4. На `localhost` при авторизации введите телефон и текущий 6-значный код из приложения.

> В production TOTP-проверка для web-канала отключена этим механизмом (проверка выполняется только в non-production).

## Production Docker + HTTPS (для демо бета-версии)

Добавлена готовая production-схема развёртывания:
- `backend` (Node.js/Fastify);
- `redis`;
- `gateway` (Nginx):
  - терминирует TLS (`https://`),
  - проксирует backend как `https://<домен>/api/...`,
  - раздаёт production-сборку frontend.

### 1) Подготовка переменных backend

```bash
cp backend/.env.production.example backend/.env.production
```

Обязательно задайте сильный `JWT_SECRET` и корректный `CORS_ALLOWED_ORIGINS` (ваш HTTPS-домен).

### 2) Подготовка TLS-сертификатов

Nginx ожидает файлы:
- `deploy/certs/fullchain.pem`
- `deploy/certs/privkey.pem`

Для локальной демо-проверки можно сгенерировать self-signed сертификат:

```bash
mkdir -p deploy/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deploy/certs/privkey.pem \
  -out deploy/certs/fullchain.pem \
  -subj "/CN=localhost"
```

> Для публичной демонстрации используйте реальный сертификат (например, Let's Encrypt).

### 3) Сборка и запуск

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4) Проверка

```bash
curl -k https://localhost/
curl -k https://localhost/api/v1/version
curl -k https://localhost/api/v1/auth/start -X POST
```

`-k` нужен только для self-signed сертификата.

### Что это даёт

- Frontend работает в production-режиме внутри Docker.
- Backend доступен только через HTTPS-входную точку Nginx (`/api`).
- Можно разворачивать на сервере одной командой `docker compose`.
