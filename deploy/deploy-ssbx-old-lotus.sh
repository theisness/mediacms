#!/usr/bin/env bash
# 一键上线莲花影院前端到 ssbx-old / video.ssbx.site。
#
# 用法：
#   cd /home/pyf/ssbx/mediacms
#   ./deploy/deploy-ssbx-old-lotus.sh
#
# 可覆盖：
#   DEPLOY_HOST=ssbx-old DEPLOY_APP=/home/mediacms.io/mediacms ./deploy/deploy-ssbx-old-lotus.sh
#
# 脚本负责构建、现网备份、静态资源/模板同步、属主修正和服务重启；
# 不做浏览器验收、不使用 rsync --delete，保留远端备份以便手工回滚。

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
DEPLOY_HOST="${DEPLOY_HOST:-ssbx-old}"
DEPLOY_APP="${DEPLOY_APP:-/home/mediacms.io/mediacms}"
DEPLOY_SERVICE="${DEPLOY_SERVICE:-mediacms.service}"
STAMP="$(date +%Y%m%d-%H%M%S)"
REMOTE_BACKUP="/root/mediacms-lotus-auto-backup-${STAMP}"
BUILD_LOG="$(mktemp -t mediacms-lotus-build.XXXXXX.log)"

cleanup() {
  rm -f "$BUILD_LOG"
}
trap cleanup EXIT

die() {
  echo "[deploy] ERROR: $*" >&2
  exit 1
}

ssh_run() {
  ssh -o ProxyCommand=none "$DEPLOY_HOST" "$@"
}

echo "[deploy] root=$ROOT_DIR"
echo "[deploy] host=$DEPLOY_HOST app=$DEPLOY_APP"

command -v ssh >/dev/null || die "缺少 ssh"
command -v rsync >/dev/null || die "缺少 rsync"
command -v npm >/dev/null || die "缺少 npm"

echo "[deploy] 1/6 构建 frontend/dist"
if ! (cd "$FRONTEND_DIR" && CI=false npm run dist 2>&1 | tee "$BUILD_LOG"); then
  die "前端构建命令失败，日志：$BUILD_LOG"
fi
if grep -q "Failed to compile" "$BUILD_LOG"; then
  die "Webpack 输出 Failed to compile，已中止，不写入服务器；日志：$BUILD_LOG"
fi
test -f "$FRONTEND_DIR/dist/static/js/_commons.js" || die "缺少 dist/static/js/_commons.js"
test -f "$FRONTEND_DIR/dist/static/css/_commons.css" || die "缺少 dist/static/css/_commons.css"

echo "[deploy] 2/6 更新仓库 static 产物"
cp -a "$FRONTEND_DIR/dist/static/." "$ROOT_DIR/static/"

echo "[deploy] 3/6 服务器预检并创建备份"
ssh_run "set -e
  test \"\$(systemctl is-active '$DEPLOY_SERVICE')\" = active
  test -d '$DEPLOY_APP/static/js'
  test -d '$DEPLOY_APP/static/css'
  test -d '$DEPLOY_APP/static/images/lotus-brand'
  install -d -m 700 '$REMOTE_BACKUP/static' '$REMOTE_BACKUP/static-root' '$REMOTE_BACKUP/templates/components' '$REMOTE_BACKUP/templates/config/installation' '$REMOTE_BACKUP/templates/cms'
  cp -a '$DEPLOY_APP/static/js' '$REMOTE_BACKUP/static/'
  cp -a '$DEPLOY_APP/static/css' '$REMOTE_BACKUP/static/'
  cp -a '$DEPLOY_APP/static/images/lotus-brand' '$REMOTE_BACKUP/static/'
  for f in '$DEPLOY_APP'/static/*; do
    [ -f "\$f" ] && cp -a "\$f" '$REMOTE_BACKUP/static-root/'
  done
  cp -a '$DEPLOY_APP/templates/base.html' '$REMOTE_BACKUP/templates/'
  cp -a '$DEPLOY_APP/templates/components/footer.html' '$REMOTE_BACKUP/templates/components/'
  cp -a '$DEPLOY_APP/templates/config/installation/site.html' '$REMOTE_BACKUP/templates/config/installation/'
  cp -a '$DEPLOY_APP/templates/cms/add-media.html' '$REMOTE_BACKUP/templates/cms/'
  cp -a '$DEPLOY_APP/templates/cms/media.html' '$REMOTE_BACKUP/templates/cms/'
  install -d -m 700 '$REMOTE_BACKUP/files'
  cp -a '$DEPLOY_APP/files/models.py' '$DEPLOY_APP/files/views.py' '$DEPLOY_APP/files/admin.py' '$DEPLOY_APP/files/urls.py' '$REMOTE_BACKUP/files/'
  cp -a '$DEPLOY_APP/files/migrations' '$REMOTE_BACKUP/files/'
  [ -f '$DEPLOY_APP/templates/cms/about.html' ] && cp -a '$DEPLOY_APP/templates/cms/about.html' '$REMOTE_BACKUP/templates/cms/'
  echo backup=$REMOTE_BACKUP"

echo "[deploy] 4/6 同步静态资源"
rsync -rlpt --checksum -e "ssh -o ProxyCommand=none" \
  "$ROOT_DIR/static/js/" "$DEPLOY_HOST:$DEPLOY_APP/static/js/"
rsync -rlpt --checksum -e "ssh -o ProxyCommand=none" \
  "$ROOT_DIR/static/css/" "$DEPLOY_HOST:$DEPLOY_APP/static/css/"
rsync -rlpt --checksum -e "ssh -o ProxyCommand=none" \
  "$ROOT_DIR/static/images/lotus-brand/" "$DEPLOY_HOST:$DEPLOY_APP/static/images/lotus-brand/"
# Webpack 会把 CSS 背景图抽到 static 根目录的哈希文件；不单独同步会导致 hero 只有布局、没有图像。
rsync -rlpt --checksum --exclude='*/' -e "ssh -o ProxyCommand=none" \
  "$ROOT_DIR/static/" "$DEPLOY_HOST:$DEPLOY_APP/static/"

echo "[deploy] 5/6 同步模板"
(cd "$ROOT_DIR" && rsync -rlpt --checksum --relative -e "ssh -o ProxyCommand=none" \
  templates/base.html \
  templates/components/footer.html \
  templates/config/installation/site.html \
  templates/cms/add-media.html \
  templates/cms/about.html \
  templates/cms/popular-media.html \
  templates/cms/media.html \
  "$DEPLOY_HOST:$DEPLOY_APP/")

echo "[deploy] 5b/6 同步后端代码并迁移数据库"
(cd "$ROOT_DIR" && rsync -rlpt --checksum --relative -e "ssh -o ProxyCommand=none" \
  files/models.py \
  files/views.py \
  files/admin.py \
  files/urls.py \
  files/migrations/0010_homebanner.py \
  "$DEPLOY_HOST:$DEPLOY_APP/")
ssh_run "set -e
  chown www-data:www-data '$DEPLOY_APP/files/models.py' '$DEPLOY_APP/files/views.py' '$DEPLOY_APP/files/admin.py' '$DEPLOY_APP/files/urls.py' '$DEPLOY_APP/files/migrations/0010_homebanner.py'
  cd '$DEPLOY_APP'
  source /home/mediacms.io/bin/activate 2>/dev/null || true
  python manage.py migrate files
  echo migrate=ok"

echo "[deploy] 6/6 修正属主并重启服务"
ssh_run "set -e
  chown -R www-data:www-data '$DEPLOY_APP/static/js' '$DEPLOY_APP/static/css' '$DEPLOY_APP/static/images/lotus-brand'
  for f in '$DEPLOY_APP'/static/*; do
    [ -f "\$f" ] && chown www-data:www-data "\$f"
  done
  chown www-data:www-data '$DEPLOY_APP/templates/base.html' '$DEPLOY_APP/templates/components/footer.html' '$DEPLOY_APP/templates/config/installation/site.html' '$DEPLOY_APP/templates/cms/add-media.html'
  systemctl restart '$DEPLOY_SERVICE'
  test \"\$(systemctl is-active '$DEPLOY_SERVICE')\" = active
  echo service=active
  echo backup='$REMOTE_BACKUP'"

echo "[deploy] 完成。未执行浏览器验收；请手工检查 video.ssbx.site。"
