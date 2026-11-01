# bunnyYBA — GitHub Pages

Telegramm: @bunnyYBA

Это готовая статическая версия сайта. Node.js-сервер в браузере не нужен. Подпись канала есть на сайте, на фото карточек и в каждом экспортируемом PNG. Скины распределяются только по цене: дороже — выше.

## Публикация

1. Распакуйте архив. В корне папки должны быть `index.html`, `styles.css`, `app.mjs`, `data` и `.github`.
2. Опубликуйте **содержимое этой папки** в публичном репозитории GitHub. Ветка — `main`. `index.html` должен оказаться в корне репозитория. ZIP-файл сам по себе сайтом не станет: GitHub его не распаковывает.
3. Откройте репозиторий → **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Откройте **Actions → Update YBA catalog and deploy → Run workflow → Run workflow**.
5. Дождитесь зелёной галочки. Адрес сайта появится в **Settings → Pages** и в результате задачи Deploy.

### Удобная загрузка через GitHub Desktop

В GitHub Desktop выберите **File → Add local repository**, укажите распакованную папку. Если это ещё не Git-репозиторий, нажмите **create a repository here**. Сохраните все файлы коммитом, затем **Publish repository**. Снимите **Keep this code private**, чтобы репозиторий был публичным. Затем выполните шаги 3–5 выше.

### Альтернатива: Git в терминале

Создайте на GitHub пустой публичный репозиторий, например `bunny-yba`, без README. Откройте терминал в распакованной папке и выполните команды, заменив `YOUR_USERNAME` своим логином:

```powershell
git init -b main
git add .
git commit -m "Publish bunnyYBA tierlist"
git remote add origin https://github.com/YOUR_USERNAME/bunny-yba.git
git push -u origin main
```

Если GitHub спросит авторизацию, войдите своим обычным способом. После отправки включите GitHub Actions в Settings → Pages и запустите workflow, как описано выше.

## Обновление цен

Фото и торговая стоимость `value` берутся с https://www.ybavalues.com/values. GitHub Pages отдаёт опубликованный снимок данных и фотографий. Кнопка «Обновить» на сайте перечитывает опубликованный каталог.

Чтобы получить новые цены именно с YBA Values, запустите **Actions → Update YBA catalog and deploy → Run workflow**. Workflow загрузит каталог с источника, добавит новые фото и опубликует сайт. Он также запускается после коммитов в `main`. На самом сайте не нужны ключи или токены. Если источник недоступен, публикуется вложенный снимок с прежним временем получения данных.

Поддерживается обычный адрес проекта: `https://YOUR_USERNAME.github.io/bunny-yba/`. Файлы и фото используют относительные пути и работают внутри папки проекта.

Выбор скинов и границы сохраняются локально в браузере. PNG создаётся в браузере с `Telegramm: @bunnyYBA` в шапке, на каждой фотографии и внизу картинки.
