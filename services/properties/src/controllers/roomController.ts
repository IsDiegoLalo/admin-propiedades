import { Request, Response, NextFunction } from 'express';
import { createRoomSchema, updateRoomSchema } from '../validators/roomValidator';
import * as roomService from '../services/roomService';

export async function createRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: propertyId } = req.params;
    const input = createRoomSchema.parse(req.body);
    const room = await roomService.createRoom(propertyId, input);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

export async function listRooms(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: propertyId } = req.params;
    const rooms = await roomService.listRooms(propertyId);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
}

export async function updateRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id: propertyId, roomId } = req.params;
    const input = updateRoomSchema.parse(req.body);
    const room = await roomService.updateRoom(propertyId, roomId, input);
    res.json(room);
  } catch (err) {
    next(err);
  }
}
