import { Request, Response, NextFunction } from 'express';
import { createPropertySchema, updatePropertySchema } from '../validators/propertyValidator';
import * as propertyService from '../services/propertyService';

export async function createProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createPropertySchema.parse(req.body);
    const property = await propertyService.createProperty(input);
    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
}

export async function listProperties(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const properties = await propertyService.listProperties();
    res.json(properties);
  } catch (err) {
    next(err);
  }
}

export async function getProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const currency = req.query['currency'] as string | undefined;
    const property = await propertyService.getPropertyById(id, currency);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

export async function updateProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const input = updatePropertySchema.parse(req.body);
    const property = await propertyService.updateProperty(id, input);
    res.json(property);
  } catch (err) {
    next(err);
  }
}

export async function deleteProperty(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    await propertyService.softDeleteProperty(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getExtendedAttributes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const property = await propertyService.getPropertyById(id);
    res.json({ extendedAttributes: property.extendedAttributes });
  } catch (err) {
    next(err);
  }
}
