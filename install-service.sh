#!/usr/bin/env bash

set -Eeuo pipefail

SERVICE_NAME="max-miniapp"
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
COMPOSE_FILE="docker-compose.prod.yml"
REBUILD=1

usage() {
  cat <<'EOF'
Установка или восстановление systemd-службы Max Miniapp.

Использование:
  sudo ./install-service.sh [параметры]

Параметры:
  --service-name NAME   Имя службы (по умолчанию: max-miniapp)
  --project-dir PATH    Каталог проекта (по умолчанию: каталог скрипта)
  --compose-file PATH   Compose-файл, относительно каталога проекта или абсолютный
  --skip-rebuild        Не выполнять чистую пересборку образов
  -h, --help            Показать справку

По умолчанию скрипт выполняет docker compose build --pull --no-cache,
переустанавливает unit, включает автозапуск и перезапускает службу.
EOF
}

die() {
  printf 'Ошибка: %s\n' "$*" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --service-name)
      (($# >= 2)) || die "для --service-name требуется значение"
      SERVICE_NAME="$2"
      shift 2
      ;;
    --project-dir)
      (($# >= 2)) || die "для --project-dir требуется значение"
      PROJECT_DIR="$2"
      shift 2
      ;;
    --compose-file)
      (($# >= 2)) || die "для --compose-file требуется значение"
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --skip-rebuild)
      REBUILD=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "неизвестный параметр: $1"
      ;;
  esac
done

[[ "$SERVICE_NAME" =~ ^[A-Za-z0-9_.@-]+$ ]] ||
  die "некорректное имя службы: $SERVICE_NAME"
SERVICE_NAME="${SERVICE_NAME%.service}"
[[ -n "$SERVICE_NAME" ]] || die "имя службы не может быть пустым"

command -v readlink >/dev/null 2>&1 || die "не найдена команда readlink"
PROJECT_DIR="$(readlink -f -- "$PROJECT_DIR")"
[[ -d "$PROJECT_DIR" ]] || die "каталог проекта не найден: $PROJECT_DIR"

if [[ "$COMPOSE_FILE" != /* ]]; then
  COMPOSE_FILE="${PROJECT_DIR}/${COMPOSE_FILE}"
fi
COMPOSE_FILE="$(readlink -f -- "$COMPOSE_FILE")"
[[ -f "$COMPOSE_FILE" ]] || die "Compose-файл не найден: $COMPOSE_FILE"

# В unit-файле эти символы требуют специального экранирования. Для серверного
# размещения используйте обычный путь наподобие /opt/max-miniapp.
[[ "$PROJECT_DIR$COMPOSE_FILE" != *[$'\n\r\t %']* ]] ||
  die "пути проекта и Compose-файла не должны содержать пробелы, %, табуляцию или перевод строки"

if ((EUID != 0)); then
  command -v sudo >/dev/null 2>&1 || die "запустите скрипт от root"
  SUDO_ARGS=(
    --service-name "$SERVICE_NAME"
    --project-dir "$PROJECT_DIR"
    --compose-file "$COMPOSE_FILE"
  )
  if ((REBUILD == 0)); then
    SUDO_ARGS+=(--skip-rebuild)
  fi
  exec sudo -- "$0" "${SUDO_ARGS[@]}"
fi

command -v systemctl >/dev/null 2>&1 || die "systemd не найден"
DOCKER_BIN="$(command -v docker || true)"
[[ -n "$DOCKER_BIN" ]] || die "Docker не установлен или недоступен в PATH"
"$DOCKER_BIN" compose version >/dev/null 2>&1 ||
  die "не установлен плагин Docker Compose"

COMPOSE=(
  "$DOCKER_BIN" compose
  --project-directory "$PROJECT_DIR"
  -f "$COMPOSE_FILE"
)

printf '==> Проверка Docker Compose-конфигурации\n'
"${COMPOSE[@]}" config --quiet

UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
printf '==> Установка службы %s\n' "$SERVICE_NAME"
cat >"$UNIT_FILE" <<EOF
[Unit]
Description=Max Miniapp (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=$DOCKER_BIN compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE up -d --build --force-recreate --remove-orphans
ExecReload=$DOCKER_BIN compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE up -d --build --force-recreate --remove-orphans
ExecStop=$DOCKER_BIN compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE down
TimeoutStartSec=0
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 "$UNIT_FILE"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME.service"

if ((REBUILD == 1)); then
  printf '==> Чистая пересборка образов (может занять несколько минут)\n'
  "${COMPOSE[@]}" build --pull --no-cache
fi

printf '==> Перезапуск службы и принудительное пересоздание контейнеров\n'
systemctl restart "$SERVICE_NAME.service"

printf '==> Состояние службы\n'
systemctl --no-pager --full status "$SERVICE_NAME.service" || true

printf '==> Состояние контейнеров\n'
"${COMPOSE[@]}" ps

printf '\nГотово. Для следующего обновления:\n'
printf '  cd %s && sh ./update-miniapp.sh\n' "$PROJECT_DIR"
printf '  sudo systemctl restart %s\n' "$SERVICE_NAME"
