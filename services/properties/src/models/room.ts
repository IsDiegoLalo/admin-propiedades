export interface Room {
  id: string;
  property_id: string;
  name: string;
  type: string;
  beds: number;
  description: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRoomDto {
  name: string;
  type: string;
  beds: number;
  description: string;
}

export interface UpdateRoomDto {
  name?: string;
  type?: string;
  beds?: number;
  description?: string;
  active?: boolean;
}
