import { db } from '../db/postgres';
import { NotFoundError } from '../middleware/errors';
import type { Room, UpdateRoomDto } from '../models/room';
import type { CreateRoomInput, UpdateRoomInput } from '../validators/roomValidator';

export async function createRoom(propertyId: string, input: CreateRoomInput): Promise<Room> {
  const [room] = await db<Room>('rooms')
    .insert({
      property_id: propertyId,
      name: input.name,
      type: input.type,
      beds: input.beds,
      description: input.description,
    })
    .returning('*');
  return room;
}

export async function listRooms(propertyId: string): Promise<Room[]> {
  return db<Room>('rooms').where({ property_id: propertyId, active: true });
}

export async function updateRoom(
  propertyId: string,
  roomId: string,
  input: UpdateRoomInput,
): Promise<Room> {
  const existing = await db<Room>('rooms')
    .where({ id: roomId, property_id: propertyId })
    .first();

  if (!existing) {
    throw new NotFoundError(`Habitación con id ${roomId} no encontrada`);
  }

  const updates: Partial<UpdateRoomDto & { updated_at: Date }> = { updated_at: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.type !== undefined) updates.type = input.type;
  if (input.beds !== undefined) updates.beds = input.beds;
  if (input.description !== undefined) updates.description = input.description;
  if (input.active !== undefined) updates.active = input.active;

  const [updated] = await db<Room>('rooms')
    .where({ id: roomId })
    .update(updates)
    .returning('*');

  return updated;
}
