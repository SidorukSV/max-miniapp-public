# Windows Server install guide (backend as Windows Service)

Этот гайд для Windows Server 2019/2022 и запуска `backend` как службы через NSSM.

## 1) Предпосылки

- Установлен Node.js LTS (x64)
- Проект размещён, например: `C:\apps\max-miniapp`
- Redis endpoint доступен (локально/внешне)

> Backend требует `JWT_SECRET`, а также использует Redis (`REDIS_URL`).

## 2) Установка зависимостей backend

```powershell
cd C:\apps\max-miniapp\backend
npm install
```

## 3) Настройка `.env`

Создайте `C:\apps\max-miniapp\backend\.env`:

```env
JWT_SECRET=replace_with_strong_random_secret
NODE_ENV=production
PORT=3000
REDIS_URL=redis://127.0.0.1:6379
REDIS_CONNECT_TIMEOUT_MS=5000
```

## 4) Установка NSSM

1. Скачайте NSSM: https://nssm.cc/download
2. Распакуйте, например в `C:\tools\nssm\`
3. Убедитесь, что есть файл `C:\tools\nssm\nssm.exe`

## 5) Запуск скрипта установки службы

В репозитории есть готовый скрипт: `backend/windows-install-service.ps1`.

Запуск (PowerShell от администратора):

```powershell
powershell -ExecutionPolicy Bypass -File C:\apps\max-miniapp\backend\windows-install-service.ps1
```

При необходимости можно передать параметры:

```powershell
powershell -ExecutionPolicy Bypass -File C:\apps\max-miniapp\backend\windows-install-service.ps1 \
  -ServiceName "max-miniapp-backend" \
  -DisplayName "Max Miniapp Backend" \
  -BackendDir "C:\apps\max-miniapp\backend" \
  -NodeExe "C:\Program Files\nodejs\node.exe" \
  -NssmExe "C:\tools\nssm\nssm.exe" \
  -LogDir "C:\apps\max-miniapp\logs"
```

## 6) Проверка

```powershell
Get-Service max-miniapp-backend
Get-Content C:\apps\max-miniapp\logs\backend-out.log -Tail 100
Get-Content C:\apps\max-miniapp\logs\backend-err.log -Tail 100
```

## 7) Перезапуск после деплоя

```powershell
Restart-Service max-miniapp-backend
```

## 8) Диагностика

- Проверьте, что `JWT_SECRET` задан и валиден.
- Проверьте доступность Redis (`REDIS_URL`).
- Убедитесь, что порт backend открыт локально и не занят другим процессом.
