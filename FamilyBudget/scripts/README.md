
## Быстрый старт с вашим существующим скриптом

Скопируйте `fetch-url.py` из PHP-проекта в эту папку **или** укажите путь к уже работающему скрипту:

```bash
export FAMILY_BUDGET_FETCH_SCRIPT="/path/to/your/fetch-url.sh"
export FAMILY_BUDGET_PYTHON_VENV="/path/to/app/Transpilations/Python/Selenium/venv3"
```

Перезапустите `npm run dev`.

## Локальная копия

1. Скопируйте `fetch-url.py` и папку `drivers/` (если есть) в `FamilyBudget/scripts/`
2. `chmod +x scripts/fetch-url.sh`
3. Установите зависимости Python: `selenium`, `undetected-chromedriver`

## Переменные окружения (как в Python)

| Переменная | Описание |
|------------|----------|
| `FAMILY_BUDGET_FETCH_SCRIPT` | Путь к `fetch-url.sh` |
| `FAMILY_BUDGET_PYTHON_VENV` | venv с selenium |
| `SELENIUM_HEADLESS` | `0` — показать окно Chrome (удобно при капче) |
| `SELENIUM_WARMUP_URLS` | Прогрев, по умолчанию `https://www.ozon.ru/` |
| `SELENIUM_COOKIE_WAIT` | Макс. ожидание cookies (сек) |

## Без Python

По умолчанию используется встроенный Playwright с persistent-профилем в `storage/browser-profiles/ozon.ru` (cookies сохраняются между запросами).
