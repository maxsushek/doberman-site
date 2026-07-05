# DOBERMAN — Відбудова Харкова

Кінематографічний сайт Doberman Corp.
Стек: HTML + CSS + vanilla JS, GSAP/ScrollTrigger, Lenis, Three.js (CDN). Без фреймворків і без npm.

## Структура

    partials/            спільна «обв'язка», редагується ОДИН раз
      header.html        шапка (лого + меню-кнопка)
      menu.html          фулскрин-меню (пункти, контакти, соцмережі)
      footer.html        компактний футер контент-сторінок
    src/                 шаблони сторінок (контент + маркери include)
      index.html         головна
      ruska-lozova.html  кейс
    build.py             складач: src/ + partials/ → готові сторінки в корені
    index.html           ⚙ ЗГЕНЕРОВАНО — не редагувати вручну
    ruska-lozova.html    ⚙ ЗГЕНЕРОВАНО — не редагувати вручну
    css/  js/  assets/   стилі, скрипти, медіа

## Як правити

1. Спільну шапку/меню/футер — у `partials/`. Контент сторінки — у `src/<page>.html`.
2. Зібрати: `python3 build.py` (перезапише готові `index.html`, `ruska-lozova.html` у корені).
3. Закомітити зміни й запушити в `main` — GitHub Pages віддає готові сторінки як є.

`python3 build.py --check` — впаде, якщо коміт містить застарілі згенеровані сторінки (зручно перед пушем).

### Міні-шаблонізатор (навмисно крихітний)

    <!--#include partials/menu.html-->   вставити партіал
    {{VAR}}                              підстановка змінної (значення в build.py → PAGES)

Змінні на сторінку: `HOME` (префікс для посилань меню/футера: `""` на головній, `index.html` на кейсах), `LOGO_HREF`, `HEADER_META`.

## Локальний запуск

Будь-який статичний сервер із кореня, напр. `python3 -m http.server 8000`.

## Деплой

Репо `maxsushek/doberman-site`, GitHub Pages з `main/` → https://maxsushek.github.io/doberman-site/.
Після `build.py` + коміт/пуш Pages пересобирає сайт (Jekyll копіює файли; `partials/`, `src/`, `build.py` виключені через `_config.yml`).
