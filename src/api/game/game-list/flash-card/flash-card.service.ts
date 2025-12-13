import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, prisma } from '@/common';
import { FileManager } from '@/utils';

import {
  type ICreateFlashCardProps,
  type IUpdateFlashCardProps,
} from './flash-card.validation';

export abstract class FlashCardService {
  private static readonly slug = 'flash-card';

  static async createFlashCard(
    game_id: string,
    data: ICreateFlashCardProps,
    user_id: string,
  ) {
    // check game exists and belongs to correct template
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        creator_id: true,
        game_template: { select: { slug: true, id: true } },
      },
    });

    if (!game || game.game_template.slug !== this.slug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot create flash-card for this game',
      );

    // ensure flash card not exists already for this game
    const existing = await prisma.flashCard.findUnique({ where: { game_id } });
    if (existing)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Flash card already exists for this game',
      );

    // upload thumbnail if provided
    let thumbnailPath: string | null = null;

    if (data.thumbnail) {
      thumbnailPath = await FileManager.upload(
        `game/flash-card/${game_id}`,
        data.thumbnail,
      );
    }

    // process files_to_upload array into paths
    let imageArray: string[] = [];

    if (data.files_to_upload) {
      for (const file of data.files_to_upload) {
        const path = await FileManager.upload(
          `game/flash-card/${game_id}`,
          file,
        );
        imageArray = [...imageArray, path];
      }
    }

    // transform items
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const items = (data.cards ?? []).map((item, index) => ({
      position: index,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      question_type: item.question_type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      question_text: item.question_text ?? null,
      question_image:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof item.question_image_array_index === 'number'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            imageArray[item.question_image_array_index]
          : null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      back_type: item.back_type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      answer_text: item.answer_text,
      back_image:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        typeof item.back_image_array_index === 'number'
          ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            imageArray[item.back_image_array_index]
          : null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      is_correct: item.is_correct ?? false,
    }));

    const newFlashCard = await prisma.flashCard.create({
      data: {
        id: v4(),
        game_id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        title: data.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: data.description,
        thumbnail: thumbnailPath,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        settings: data.settings as Prisma.InputJsonValue | undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        is_published: data.is_publish_immediately,
        items: {
          create: items,
        },
      },
      select: { id: true, game_id: true },
    });

    // also update games table so listing endpoints (getAllGame /me/game) show preview data
    const gameJson = {
      type: 'flash-card',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      settings: data.settings ?? null,
      items: items.map(it => ({
        question_type: it.question_type,
        question_text: it.question_text,
        question_image: it.question_image,
        back_type: it.back_type,
      })),
    } as unknown as Prisma.InputJsonValue;

    await prisma.games.update({
      where: { id: game_id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        name: data.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: data.description ?? undefined,
        thumbnail_image: thumbnailPath ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        is_published: data.is_publish_immediately,
        game_json: gameJson,
      },
    });

    return newFlashCard;
  }

  static async getFlashCardDetail(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const flash = await prisma.flashCard.findUnique({
      where: { game_id },
      select: {
        id: true,
        game_id: true,
        title: true,
        description: true,
        thumbnail: true,
        settings: true,
        is_published: true,
        total_played: true,
        created_at: true,
        updated_at: true,
        game: {
          select: {
            creator_id: true,
            game_template: { select: { slug: true } },
          },
        },
        items: { orderBy: { position: 'asc' } },
      },
    });

    if (!flash || flash.game.game_template.slug !== this.SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Flash card not found');

    if (user_role !== 'SUPER_ADMIN' && flash.game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this flash-card',
      );

    // clean response
    const items = flash.items.map(it => ({
      question_type: it.question_type,
      question_text: it.question_text,
      question_image: it.question_image,
      back_type: it.back_type,
      answer_text: it.answer_text,
      back_image: it.back_image,
      is_correct: it.is_correct,
      position: it.position,
    }));

    return {
      id: flash.id,
      game_id: flash.game_id,
      title: flash.title,
      description: flash.description,
      thumbnail: flash.thumbnail,
      settings: flash.settings,
      is_published: flash.is_published,
      total_played: flash.total_played,
      items,
    };
  }

  static async updateFlashCard(
    game_id: string,
    data: IUpdateFlashCardProps,
    user_id: string,
    user_role: ROLE,
  ) {
    const flash = await prisma.flashCard.findUnique({
      where: { game_id },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        is_published: true,
        settings: true,
        game: {
          select: {
            creator_id: true,
            game_template: { select: { slug: true } },
          },
        },
        items: true,
      },
    });

    if (!flash || flash.game.game_template.slug !== this.SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Flash card not found');

    if (user_role !== 'SUPER_ADMIN' && flash.game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot edit this flash-card',
      );

    // handle thumbnail
    let thumbnailPath = flash.thumbnail ?? null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.thumbnail) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      thumbnailPath = await FileManager.upload(
        `game/flash-card/${game_id}`,
        data.thumbnail,
      );
    }

    // process files
    let imageArray: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (data.files_to_upload) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const file of data.files_to_upload) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const path = await FileManager.upload(
          `game/flash-card/${game_id}`,
          file,
        );
        imageArray = [...imageArray, path];
      }
    }

    // if cards present, replace items
    let itemsToCreate: Array<Record<string, unknown>> | undefined;

    if (data.cards) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      itemsToCreate = (data.cards ?? []).map((item, index) => ({
        position: index,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        question_type: item.question_type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        question_text: item.question_text ?? null,
        question_image:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          typeof item.question_image_array_index === 'number'
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              imageArray[item.question_image_array_index]
            : null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        back_type: item.back_type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        answer_text: item.answer_text,
        back_image:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          typeof item.back_image_array_index === 'number'
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              imageArray[item.back_image_array_index]
            : null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        is_correct: item.is_correct ?? false,
      }));
    }

    const updated = await prisma.flashCard.update({
      where: { game_id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        title: data.name ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: data.description ?? undefined,
        thumbnail: thumbnailPath,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        is_published: data.is_publish ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        settings: data.settings as Prisma.InputJsonValue | undefined,
        items: itemsToCreate
          ? {
              deleteMany: {},
              create: itemsToCreate,
            }
          : undefined,
      },
      select: { id: true },
    });

    // sync to games.game_json and fields to keep listing consistent
    const gameJson = {
      type: 'flash-card',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      settings: data.settings ?? undefined,
      items: itemsToCreate
        ? itemsToCreate.map(it => ({
            question_type: it.question_type,
            question_text: it.question_text,
            question_image: it.question_image,
            back_type: it.back_type,
          }))
        : undefined,
    } as unknown as Prisma.InputJsonValue;

    await prisma.games.update({
      where: { id: game_id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        name: data.name ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        description: data.description ?? undefined,
        thumbnail_image: thumbnailPath ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        is_published: data.is_publish ?? undefined,
        game_json: gameJson,
      },
    });

    return updated;
  }

  static async deleteFlashCard(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const flash = await prisma.flashCard.findUnique({
      where: { game_id },
      select: {
        id: true,
        game: {
          select: {
            creator_id: true,
            game_template: { select: { slug: true } },
          },
        },
        thumbnail: true,
      },
    });

    if (!flash || flash.game.game_template.slug !== this.SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Flash card not found');

    if (user_role !== 'SUPER_ADMIN' && flash.game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this flash-card',
      );

    // remove thumbnail file if exists
    if (flash.thumbnail) await FileManager.remove(flash.thumbnail);

    await prisma.flashCardItem.deleteMany({
      where: { flash_card_id: flash.id },
    });
    await prisma.flashCard.delete({ where: { id: flash.id } });

    return { id: flash.id };
  }

  static async incrementPlay(game_id: string, user_id?: string) {
    // ensure published
    const fc = await prisma.flashCard.findUnique({
      where: { game_id },
      select: { id: true, is_published: true },
    });
    if (!fc || !fc.is_published)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Flash card not found');

    let txItems = [
      prisma.flashCard.update({
        where: { id: fc.id },
        data: { total_played: { increment: 1 } },
      }),
      prisma.games.update({
        where: { id: game_id },
        data: { total_played: { increment: 1 } },
      }),
    ];

    if (user_id)
      txItems = [
        ...txItems,
        prisma.users.update({
          where: { id: user_id },
          data: { total_game_played: { increment: 1 } },
        }),
      ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    await prisma.$transaction(txItems as any);
  }
}
