import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import FlashCardService from './flash-card.service';
import {
  createFlashCardSchema,
  type ICreateFlashCardProps,
  type IUpdateFlashCardProps,
  updateFlashCardSchema,
} from './flash-card.validation';

export const FlashCardController = Router()
  // Create or initial save for flash card data for existing game
  .post(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: createFlashCardSchema,
      file_fields: [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'files_to_upload', maxCount: 50 },
      ],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, ICreateFlashCardProps>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = await FlashCardService.createFlashCard(
          request.params.game_id,
          request.body,
          request.user!.user_id,
        );
        const responseBody = new SuccessResponse(
          StatusCodes.CREATED,
          'Flash card created',
          result,
        );

        return response
          .status(responseBody.statusCode)
          .json(responseBody.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // Update flash card (including publish flag)
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: updateFlashCardSchema,
      file_fields: [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'files_to_upload', maxCount: 50 },
      ],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateFlashCardProps>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const updated = await FlashCardService.updateFlashCard(
          request.params.game_id,
          request.body,
          request.user!.user_id,
          request.user!.role,
        );
        const responseBody = new SuccessResponse(
          StatusCodes.OK,
          'Flash card updated',
          updated,
        );

        return response
          .status(responseBody.statusCode)
          .json(responseBody.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // Get detail (for edit/play)
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const game = await FlashCardService.getFlashCardDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const responseBody = new SuccessResponse(
          StatusCodes.OK,
          'Get flash card successfully',
          game,
        );

        return response
          .status(responseBody.statusCode)
          .json(responseBody.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // Delete flash card
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const result = await FlashCardService.deleteFlashCard(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const responseBody = new SuccessResponse(
          StatusCodes.OK,
          'Flash card deleted',
          result,
        );

        return response
          .status(responseBody.statusCode)
          .json(responseBody.json());
      } catch (error) {
        return next(error);
      }
    },
  )

  // Play endpoint specific to flash-card (increments play counts)
  .post(
    '/:game_id/play',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        // user optional, get from auth if present
        const userId = (request as AuthedRequest).user?.user_id;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await FlashCardService.incrementPlay(request.params.game_id, userId);
        const responseBody = new SuccessResponse(
          StatusCodes.OK,
          'Play count updated',
        );

        return response
          .status(responseBody.statusCode)
          .json(responseBody.json());
      } catch (error) {
        return next(error);
      }
    },
  );
