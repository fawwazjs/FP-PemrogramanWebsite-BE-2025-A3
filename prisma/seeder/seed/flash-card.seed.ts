import { type Prisma, PrismaClient } from '@prisma/client';
import { v4 } from 'uuid';

// Prisma client typing: some environments may not reflect newly generated models
// in the TS types immediately. For seeder scripts we can treat the client as
// `any` to avoid compile-time errors while keeping runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma: any = new PrismaClient();

interface IFlashCardJson {
  type: string;
  settings: Record<string, unknown> | null;
  items: Array<{
    question_type: string;
    question_text: string | null;
    question_image: string | null;
    back_type: string;
  }>;
}

export const flashCardSeed = async () => {
  try {
    console.log('🌱 Seed flash-card game');

    // Get first user from database (creator)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await prisma.users.findFirst({
      select: { id: true },
    });

    if (!user) {
      console.log('⚠️  No user found for flash-card seeding. Skipping.');

      return;
    }

    // Get flash-card template
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const flashCardTemplate = await prisma.gameTemplates.findUnique({
      where: { slug: 'flash-cards' },
      select: { id: true },
    });

    if (!flashCardTemplate) {
      console.log('⚠️  Flash-card template not found. Skipping.');

      return;
    }

    const flashCardGames = [
      {
        id: 'fc-001-vocab-english',
        name: 'English Vocabulary Level 1',
        description: 'Learn basic English vocabulary with flash cards',
        is_published: true,
        settings: { shuffle: true, lang: 'en' },
        items: [
          {
            position: 0,
            question_type: 'text',
            question_text: 'What does "cat" mean?',
            question_image: null,
            back_type: 'text',
            answer_text: 'A domestic animal with four legs and fur',
            back_image: null,
            is_correct: true,
          },
          {
            position: 1,
            question_type: 'text',
            question_text: 'Translate "rumah" to English',
            question_image: null,
            back_type: 'text',
            answer_text: 'House',
            back_image: null,
            is_correct: true,
          },
          {
            position: 2,
            question_type: 'text',
            question_text: 'What is "mata" in English?',
            question_image: null,
            back_type: 'text',
            answer_text: 'Eye',
            back_image: null,
            is_correct: true,
          },
          {
            position: 3,
            question_type: 'text',
            question_text: 'Translate "air" to English',
            question_image: null,
            back_type: 'text',
            answer_text: 'Water',
            back_image: null,
            is_correct: true,
          },
          {
            position: 4,
            question_type: 'text',
            question_text: 'What is "buku" in English?',
            question_image: null,
            back_type: 'text',
            answer_text: 'Book',
            back_image: null,
            is_correct: true,
          },
        ],
      },
      {
        id: 'fc-002-vocab-spanish',
        name: 'Spanish Vocabulary Beginner',
        description: 'Basic Spanish words for beginners',
        is_published: true,
        settings: { shuffle: false, lang: 'es' },
        items: [
          {
            position: 0,
            question_type: 'text',
            question_text: 'How do you say "hello" in Spanish?',
            question_image: null,
            back_type: 'text',
            answer_text: 'Hola',
            back_image: null,
            is_correct: true,
          },
          {
            position: 1,
            question_type: 'text',
            question_text: 'What does "gracias" mean?',
            question_image: null,
            back_type: 'text',
            answer_text: 'Thank you',
            back_image: null,
            is_correct: true,
          },
          {
            position: 2,
            question_type: 'text',
            question_text: 'Translate "agua" to English',
            question_image: null,
            back_type: 'text',
            answer_text: 'Water',
            back_image: null,
            is_correct: true,
          },
          {
            position: 3,
            question_type: 'text',
            question_text: 'What is "pan" in English?',
            question_image: null,
            back_type: 'text',
            answer_text: 'Bread',
            back_image: null,
            is_correct: true,
          },
        ],
      },
      {
        id: 'fc-003-math-basics',
        name: 'Math Basics - Numbers',
        description: 'Learn basic math and numbers',
        is_published: false,
        settings: { shuffle: true, difficulty: 'easy' },
        items: [
          {
            position: 0,
            question_type: 'text',
            question_text: '2 + 2 = ?',
            question_image: null,
            back_type: 'text',
            answer_text: '4',
            back_image: null,
            is_correct: true,
          },
          {
            position: 1,
            question_type: 'text',
            question_text: '5 x 3 = ?',
            question_image: null,
            back_type: 'text',
            answer_text: '15',
            back_image: null,
            is_correct: true,
          },
          {
            position: 2,
            question_type: 'text',
            question_text: '10 - 4 = ?',
            question_image: null,
            back_type: 'text',
            answer_text: '6',
            back_image: null,
            is_correct: true,
          },
          {
            position: 3,
            question_type: 'text',
            question_text: '20 / 4 = ?',
            question_image: null,
            back_type: 'text',
            answer_text: '5',
            back_image: null,
            is_correct: true,
          },
        ],
      },
    ];

    for (const gameData of flashCardGames) {
      // Create Games entry
      const gameJson: IFlashCardJson = {
        type: 'flash-card',
        settings: gameData.settings,
        items: gameData.items.map(item => ({
          question_type: item.question_type,
          question_text: item.question_text,
          question_image: item.question_image,
          back_type: item.back_type,
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const game = await prisma.games.upsert({
        where: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          id: gameData.id,
        },
        create: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          id: gameData.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: gameData.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: gameData.description,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          game_template_id: flashCardTemplate.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          creator_id: user.id,
          thumbnail_image: 'uploads/game/flash-card/default-thumb.png',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          is_published: gameData.is_published,
          game_json: gameJson as unknown as Prisma.InputJsonValue,
        },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: gameData.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: gameData.description,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          game_template_id: flashCardTemplate.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          creator_id: user.id,
          thumbnail_image: 'uploads/game/flash-card/default-thumb.png',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          is_published: gameData.is_published,
          game_json: gameJson as unknown as Prisma.InputJsonValue,
        },
      });

      // Create FlashCard entry
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await prisma.flashCard.upsert({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where: { game_id: gameData.id },
        create: {
          id: v4(),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          game_id: game.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          title: gameData.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: gameData.description,
          thumbnail: 'uploads/game/flash-card/default-thumb.png',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          settings: gameData.settings as Prisma.InputJsonValue,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          is_published: gameData.is_published,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          items: {
            create: gameData.items,
          },
        },
        update: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          title: gameData.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: gameData.description,
          thumbnail: 'uploads/game/flash-card/default-thumb.png',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          settings: gameData.settings as Prisma.InputJsonValue,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          is_published: gameData.is_published,
          items: {
            deleteMany: {},
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            create: gameData.items,
          },
        },
      });
    }

    console.log('✅ Flash-card games seeded successfully');
  } catch (error) {
    console.log(`❌ Error in flash-card game. ${error}`);

    throw error;
  }
};
