import { Request, Response, NextFunction } from 'express';
import { createReviewSchema } from '../validators/reviewValidator';
import * as reviewService from '../services/reviewService';

export async function createReview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createReviewSchema.parse(req.body);
    const review = await reviewService.createReview(input);
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}

export async function listReviews(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { propertyId } = req.query;
    const reviews = await reviewService.listReviews(String(propertyId ?? ''));
    res.json(reviews);
  } catch (err) {
    next(err);
  }
}

export async function getRating(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const propertyId = req.params['propertyId'] as string;
    const rating = await reviewService.getRating(propertyId);
    res.json(rating);
  } catch (err) {
    next(err);
  }
}
