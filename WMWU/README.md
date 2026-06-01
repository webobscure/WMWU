# Киноколлекции

Полноценное веб-приложение на Vite + React + TypeScript для поиска фильмов и сериалов через backend GraphQL API и создания тематических коллекций.

## Структура

```text
client/                 Vite + React + TypeScript frontend
server/                 Node.js + Apollo Server + Prisma backend
server/prisma/          Prisma schema и seed
graphql/examples.graphql Примеры GraphQL queries/mutations
docker-compose.yml      PostgreSQL для локальной разработки
```

## Запуск локально

1. Установить зависимости:

```bash
npm install
```

2. Создать `.env` из примера и заполнить `MOVIE_API_KEY` ключом TMDB:

```bash
cp .env.example .env
```

3. Запустить PostgreSQL:

```bash
npm run db:up
```

4. Применить миграции и создать mock-пользователя с примерами коллекций:

```bash
npm run db:migrate
npm run db:seed
```

5. Запустить backend и frontend:

```bash
npm run dev
```

Frontend: http://localhost:5173  
GraphQL API: http://localhost:4000/graphql

## Основные команды

```bash
npm run build
npm run typecheck
npm run prisma:generate
npm run db:down
```

## Архитектура

Frontend использует Feature-Sliced-подобную структуру без лишней вложенности:

```text
src/app
src/pages
src/components
src/features
src/entities
src/shared/api
src/shared/graphql
src/styles
```

Backend разделен на GraphQL schema/resolvers, Prisma client и сервисный слой внешнего API. Все обращения к TMDB выполняются только на backend.

Отдельная страница `Хочу посмотреть` работает как системная коллекция: фильмы добавляются через кнопку с иконкой часов и отображаются в порядке добавления. Коллекции поддерживают хештеги, например `#триллер #вечер`, а интерфейс можно переключить в черную тему кнопкой в верхней навигации.

Страница `Моя библиотека` собирает все сохраненные фильмы и позволяет вести личный прогресс: статус просмотра, оценку от 1 до 10 и заметку.
Фильм можно явно добавить в библиотеку отдельной кнопкой на карточке поиска или на странице фильма; после добавления на странице фильма доступен блок личного рейтинга и заметки.

## Следующие улучшения

- Добавить полноценную регистрацию и вход вместо mock-пользователя.
- Добавить пагинацию и фильтры поиска по жанрам, году и типу.
- Кешировать ответы TMDB на backend.
- Добавить тесты resolvers и UI-компонентов.
- Реализовать drag-and-drop сортировку фильмов внутри коллекции.
