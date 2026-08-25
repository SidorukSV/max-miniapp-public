# Обновление и установка на Windows Server без Docker

Инструкция описывает вариант, где на Windows Server запускаются:

- Redis как Windows Service;
- backend как Windows Service через NSSM;
- frontend как статическая сборка, которую отдаёт backend;
- публичный HTTPS завершается внешним reverse proxy: Caddy, IIS/ARR, nginx for Windows или балансировщик.

Docker в этой схеме не используется.

## 1. Что передать клиенту

Минимальный комплект:

```text
max-miniapp-public/
├─ backend/
├─ frontend/
├─ scripts/windows/install-app-and-redis-service.ps1
├─ install-guide/WINDOWS-NO-DOCKER.md
└─ .local-artifacts/client-release/bit_medicina_omni_prof_1.1.0.22.cfe
```

Если передаётся архивом, не включайте:

- `.git/`
- `node_modules/`
- `frontend/dist/` — можно пересобрать на сервере
- `.runtime/`
- `.artifacts/`
- `logs/`
- `database/`

## 2. Требования к серверу

- Windows Server 2019/2022 x64.
- PowerShell 5.1+.
- Node.js LTS x64, рекомендовано Node.js 22 LTS.
- Входящий порт backend, по умолчанию `3000`, доступен локально для reverse proxy.
- Исходящий HTTPS-доступ с сервера к MAX API.
- Публичный HTTPS-домен для мини-приложения и webhook MAX.

Redis и NSSM скрипт скачает сам, если они ещё не установлены.

> Redis для Windows — community port. Для промышленной Linux-инфраструктуры лучше использовать официальный Redis, но для требования “Windows без Docker” этот вариант рабочий.

## 3. Подготовка каталога

Рекомендуемый путь:

```powershell
C:\apps\max-miniapp
```

Распакуйте проект в этот каталог.

Проверьте структуру:

```powershell
Test-Path C:\apps\max-miniapp\backend
Test-Path C:\apps\max-miniapp\frontend
Test-Path C:\apps\max-miniapp\scripts\windows\install-app-and-redis-service.ps1
```

## 4. Установка/обновление служб

Откройте PowerShell от администратора.

Базовый запуск:

```powershell
powershell -ExecutionPolicy Bypass `
  -File C:\apps\max-miniapp\scripts\windows\install-app-and-redis-service.ps1 `
  -ProjectRoot C:\apps\max-miniapp `
  -PublicOrigin https://miniapp.example.ru `
  -Port 3000
```

Что делает скрипт:

1. Проверяет запуск от администратора.
2. Находит `node.exe`.
3. Скачивает NSSM в `C:\tools\nssm\nssm.exe`, если его нет.
4. Скачивает Redis в `C:\apps\redis`, если его нет.
5. Устанавливает/запускает службу `redis`.
6. Выполняет `npm ci` в `frontend` и `backend`.
7. Собирает frontend: `npm run build`.
8. Создаёт или дополняет `backend\.env`.
9. Устанавливает/обновляет службу `max-miniapp-backend`.
10. Запускает backend.

Повторный запуск скрипта безопасен: он обновит настройки службы и перезапустит backend.

## 5. Файл настроек backend

Скрипт создаёт `C:\apps\max-miniapp\backend\.env`, если файла нет.

Минимально проверьте и заполните:

```env
NODE_ENV=production
PORT=3000
REDIS_URL=redis://127.0.0.1:6379
FRONTEND_DIST_DIR=..\frontend\dist
BACKEND_LOG_FILE=..\logs\backend.log
BACKEND_LOG_LEVEL=info

JWT_SECRET=strong_random_secret
MAX_BOT_TOKEN=token_from_max
MAX_BOT_ID=bot_id_from_max
MAX_WEBHOOK_SECRET=strong_random_webhook_secret
CORS_ALLOWED_ORIGINS=https://miniapp.example.ru

REFRESH_COOKIE_SECURE=true
REFRESH_COOKIE_SAMESITE=none
```

После ручного изменения `.env`:

```powershell
Restart-Service max-miniapp-backend
```

## 6. Настройка подключения к 1С

Если используется текущая HTTP-схема backend → 1С, заполните:

```powershell
C:\apps\max-miniapp\backend\onec-config.yml
```

Пример:

```yaml
url: "https://onec.example.local/base/hs/omni/v1"
basicAuth: "base64_login_password"
onecTotpSecret: "JBSWY3DPEHPK3PXP"
```

Если у клиента включается новая схема “1С сама опрашивает VDS через очередь”, этот файл может быть заменён настройками очереди после реализации соответствующего backend API.

## 7. Публичный HTTPS

MAX miniapp и webhook должны открываться по HTTPS.

Скрипт не устанавливает reverse proxy. На Windows можно использовать Caddy как службу или IIS.

Пример `Caddyfile`:

```text
miniapp.example.ru {
    reverse_proxy 127.0.0.1:3000
}
```

Проверки после настройки HTTPS:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/healthz
Invoke-WebRequest https://miniapp.example.ru/healthz
Invoke-WebRequest https://miniapp.example.ru/api/v1/version
```

## 8. Подписка webhook MAX

Webhook URL:

```text
https://miniapp.example.ru/api/v1/max/webhook
```

Подписку можно выполнить вручную через MAX Bot API или через существующий bash-скрипт из WSL/Git Bash:

```bash
MAX_BOT_TOKEN="..." \
MAX_WEBHOOK_SECRET="..." \
./scripts/subscribe-max-webhook.sh --url https://miniapp.example.ru/api/v1/max/webhook
```

## 9. Установка расширения 1С

Файл расширения:

```text
.local-artifacts/client-release/bit_medicina_omni_prof_1.1.0.22.cfe
```

Порядок обновления:

1. Сделать резервную копию информационной базы.
2. Открыть 1С под пользователем с административными правами.
3. Перейти в `Администрирование → Печатные формы, отчеты и обработки → Расширения`  
   либо в соответствующий раздел управления расширениями конфигурации.
4. Добавить или обновить расширение из файла `.cfe`.
5. Снять безопасный режим, если расширению требуются серверные вызовы и HTTP-обмен.
6. Перезапустить сеанс 1С.
7. Проверить наличие подсистемы/раздела `Омни`.
8. Заполнить настройки бота, шаблоны сообщений и параметры интеграции.

Контрольная сумма файла лежит рядом:

```text
bit_medicina_omni_prof_1.1.0.22.cfe.sha256
```

Проверка на Windows:

```powershell
Get-FileHash C:\path\to\bit_medicina_omni_prof_1.1.0.22.cfe -Algorithm SHA256
```

## 10. Обновление новой версии

1. Остановить backend:

```powershell
Stop-Service max-miniapp-backend
```

2. Заменить файлы проекта в `C:\apps\max-miniapp`, не удаляя:

```text
backend\.env
backend\onec-config.yml
logs\
```

3. Запустить установочный скрипт повторно:

```powershell
powershell -ExecutionPolicy Bypass `
  -File C:\apps\max-miniapp\scripts\windows\install-app-and-redis-service.ps1 `
  -ProjectRoot C:\apps\max-miniapp `
  -PublicOrigin https://miniapp.example.ru `
  -Port 3000
```

4. Обновить расширение 1С из нового `.cfe`.
5. Проверить сервисы и API.

## 11. Диагностика

Состояние служб:

```powershell
Get-Service redis
Get-Service max-miniapp-backend
```

Логи backend:

```powershell
Get-Content C:\apps\max-miniapp\logs\backend-out.log -Tail 100
Get-Content C:\apps\max-miniapp\logs\backend-err.log -Tail 100
Get-Content C:\apps\max-miniapp\logs\backend.log -Tail 100
```

Проверка Redis:

```powershell
C:\apps\redis\redis-cli.exe ping
```

Ожидаемый ответ:

```text
PONG
```

Проверка backend:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/healthz
Invoke-WebRequest http://127.0.0.1:3000/api/v1/version
```

## 12. Откат

1. Остановить backend:

```powershell
Stop-Service max-miniapp-backend
```

2. Вернуть предыдущие файлы проекта.
3. Вернуть предыдущий `.cfe` в 1С.
4. Запустить backend:

```powershell
Start-Service max-miniapp-backend
```

Redis обычно откатывать не требуется, так как он хранит очередь/краткоживущие состояния. Если нужно полностью очистить очередь, это делается отдельным согласованным действием, не во время штатного обновления.
