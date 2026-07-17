## Контейнеры Docker

*   На сервере будет работать:
    
    *   `gateway` (Nginx, порты 80/443),
        
    *   `backend` (Node/Fastify),
        
    *   `redis`.
        
*   Управление как Linux-службой: `systemctl start/stop/status max-miniapp`.
    
*   Автостарт после ребута сервера.
    

## 0) Подготовка сервера (чистая Ubuntu)

Подключитесь по SSH и выполните:

Bash

```
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release git
```

* * *

## 1) Установка Docker Engine + Docker Compose plugin

```Bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Проверка:


```Bash
docker --version
docker compose version
sudo systemctl enable --now docker
sudo systemctl status docker --no-pager
```

* * *

## 2) Клонирование проекта

```Bash
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/SidorukSV/max-miniapp-public.git max-miniapp
sudo chown -R $USER:$USER /opt/max-miniapp
cd /opt/max-miniapp
```

* * *

## 3) Подготовка production env backend

В проекте `docker-compose.prod.yml` ожидает env-файл `./backend/.env.production`.

Создайте его из примера (как в README):

```Bash
cp backend/.env.production.example backend/.env.production
```

Откройте и заполните:

```Bash
nano backend/.env.production
```

Минимум проверьте:

*   `JWT_SECRET` (сильный, длинный),
`openssl rand -base64 48`
    
*   `CORS_ALLOWED_ORIGINS` (ваш боевой домен с https),
    
*   при необходимости oneC/логирование/прочие переменные.
    

README отдельно подчеркивает важность сильного `JWT_SECRET`.

* * *

## 4) TLS-сертификаты для Nginx gateway

Проект ожидает:

*   `deploy/certs/fullchain.pem`
    
*   `deploy/certs/privkey.pem`
    

### Вариант A (боевой, рекомендуется)

Получаете сертификат любым удобным способом и кладёте в эти пути.

### Вариант A.1: Let's Encrypt через Certbot standalone

Подходит для первого выпуска сертификата, когда `gateway` ещё не запущен или его можно временно остановить. У домена уже должна быть `A`/`AAAA` DNS-запись на этот сервер, а входящие порты `80` и `443` должны быть открыты.

Официальная инструкция Certbot рекомендует установку через `snap`; режим `standalone` временно поднимает свой HTTP-сервер и требует свободный порт `80`: [Certbot instructions](https://certbot.eff.org/instructions?os=ubuntufocal&ws=other).

Замените домен и email:

```bash
DOMAIN=miniapp.example.com
EMAIL=admin@example.com
```

Установите Certbot:

```bash
sudo apt update
sudo apt install -y snapd
sudo snap install core
sudo snap refresh core
sudo apt-get remove -y certbot || true
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
```

Освободите порт `80`, если приложение уже запускалось:

```bash
sudo systemctl stop max-miniapp || true
docker compose -f docker-compose.prod.yml stop gateway || true
```

Выпустите сертификат:

```bash
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email
```

Скопируйте сертификаты туда, где их ждёт `gateway`:

```bash
mkdir -p deploy/certs
sudo install -m 644 "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" deploy/certs/fullchain.pem
sudo install -m 600 "/etc/letsencrypt/live/$DOMAIN/privkey.pem" deploy/certs/privkey.pem
```

Проверьте автоматическое продление:

```bash
sudo certbot renew --dry-run
```

Чтобы после продления сертификаты автоматически копировались в проект и Nginx перечитывал их, создайте deploy hook:

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/max-miniapp-copy-certs.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

DOMAIN="miniapp.example.com"
APP_DIR="/opt/max-miniapp"

install -m 644 "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${APP_DIR}/deploy/certs/fullchain.pem"
install -m 600 "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${APP_DIR}/deploy/certs/privkey.pem"

cd "${APP_DIR}"
docker compose -f docker-compose.prod.yml restart gateway
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/max-miniapp-copy-certs.sh
```

В hook тоже замените `DOMAIN="miniapp.example.com"` на реальный домен.

### Вариант B (временный/тест): self-signed


```Bash
mkdir -p deploy/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deploy/certs/privkey.pem \
  -out deploy/certs/fullchain.pem \
  -subj "/CN=localhost"
```

* * *

## 5) Первый запуск вручную (проверка)

Запуск согласно README:


```Bash
docker compose -f docker-compose.prod.yml up -d --build
```

Проверка контейнеров:


```Bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=200
```

Быстрая HTTP(S)-проверка (из README):


```Bash
curl -k https://localhost/
curl -k https://localhost/api/v1/auth/start -X POST
```

> `-k` использовать только если self-signed сертификат.

* * *

## 6) Оформляем как службу systemd

Создайте unit-файл:


```Bash
sudo nano /etc/systemd/system/max-miniapp.service
```

Содержимое:

```INI
[Unit]
Description=Max Miniapp (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/max-miniapp
RemainAfterExit=yes
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d --build
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Активируйте:

```Bash
sudo systemctl daemon-reloadsudo systemctl enable max-miniapp
sudo systemctl start max-miniappsudo systemctl status max-miniapp --no-pager
```

Теперь приложение управляется как служба:


```Bash
sudo systemctl restart max-miniapp
sudo systemctl stop max-miniapp
sudo systemctl start max-miniapp
```

* * *

## 7) Обновление приложения (релизный процесс)



```Bash
cd /opt/max-miniapp
sh ./update-miniapp.sh
sudo systemctl restart max-miniapp
```

`update-miniapp.sh` берет версии frontend и backend из соответствующих `package.json`.
Эти версии автоматически увеличиваются в `main`, только если изменилась хеш-сумма исходников компонента.
Хеш коммита по-прежнему сохраняется отдельно в `GIT_COMMIT` для диагностики.

Проверить:


```Bash
docker compose -f docker-compose.prod.yml ps
curl -k https://localhost/api/v1/version
docker compose -f docker-compose.prod.yml logs -f --tail=200
```

Файл логов backend сохраняется на сервере в:

```Bash
tail -f /opt/max-miniapp/logs/backend.log
grep -i auth /opt/max-miniapp/logs/backend.log
```
