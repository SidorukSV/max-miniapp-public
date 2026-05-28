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
sudo apt updatesudo apt install -y ca-certificates curl gnupg lsb-release git
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
git pull
sudo systemctl restart max-miniapp
```

Проверить:


```Bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=200
```