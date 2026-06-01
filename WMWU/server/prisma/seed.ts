import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const prismaDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(prismaDir, "../../.env") });
loadEnv({ path: resolve(prismaDir, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@movie.local" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@movie.local"
    }
  });

  const collections = [
    {
      title: "Фильмы на вечер",
      description: "Спокойные и увлекательные фильмы для буднего вечера.",
      tags: ["вечер", "уютно"]
    },
    {
      title: "Лучшие триллеры",
      description: "Напряженные истории с сильной атмосферой.",
      tags: ["триллер", "напряжение"]
    },
    {
      title: "Посмотреть позже",
      description: "Все, что хочется не потерять после поиска.",
      tags: ["позже"]
    },
    {
      title: "Хочу посмотреть",
      description: "Фильмы и сериалы, которые хочется посмотреть позже.",
      tags: ["watchlist"]
    },
    {
      title: "Русское кино",
      description: "Подборка российских фильмов и сериалов.",
      tags: ["русское-кино"]
    }
  ];

  await Promise.all(
    collections.map((collection) =>
      prisma.collection.upsert({
        where: {
          id: `${user.id}:${collection.title}`
        },
        update: {
          tags: collection.tags
        },
        create: {
          id: `${user.id}:${collection.title}`,
          ...collection,
          userId: user.id
        }
      })
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
