import { AxiosError } from 'axios';
import { propertiesApi } from '../config/api';
import type {
  PropertyResponseDto,
  CreatePropertyDto,
  UpdatePropertyDto,
  CreateRoomDto,
  RoomDto,
  PhotoReferenceDto,
} from '../types';

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as { error?: string };
    return data.error ?? 'Error desconocido';
  }
  return 'Error de conexión con el servidor';
}

export async function listProperties(): Promise<PropertyResponseDto[]> {
  try {
    const { data } = await propertiesApi.get<PropertyResponseDto[]>('/properties');
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getProperty(
  id: string,
  currency?: string,
): Promise<PropertyResponseDto> {
  try {
    const params = currency ? { currency } : {};
    const { data } = await propertiesApi.get<PropertyResponseDto>(`/properties/${id}`, { params });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function createProperty(dto: CreatePropertyDto): Promise<PropertyResponseDto> {
  try {
    const { data } = await propertiesApi.post<PropertyResponseDto>('/properties', dto);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function updateProperty(
  id: string,
  dto: UpdatePropertyDto,
): Promise<PropertyResponseDto> {
  try {
    const { data } = await propertiesApi.put<PropertyResponseDto>(`/properties/${id}`, dto);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function deleteProperty(id: string): Promise<void> {
  try {
    await propertiesApi.delete(`/properties/${id}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function createRoom(propertyId: string, dto: CreateRoomDto): Promise<RoomDto> {
  try {
    const { data } = await propertiesApi.post<RoomDto>(
      `/properties/${propertyId}/rooms`,
      dto,
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function listRooms(propertyId: string): Promise<RoomDto[]> {
  try {
    const { data } = await propertiesApi.get<RoomDto[]>(`/properties/${propertyId}/rooms`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function updateRoom(
  propertyId: string,
  roomId: string,
  dto: Partial<CreateRoomDto>,
): Promise<RoomDto> {
  try {
    const { data } = await propertiesApi.patch<RoomDto>(
      `/properties/${propertyId}/rooms/${roomId}`,
      dto,
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function listPhotos(propertyId: string): Promise<PhotoReferenceDto[]> {
  try {
    const { data } = await propertiesApi.get<PhotoReferenceDto[]>(
      `/properties/${propertyId}/photos`,
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function uploadPhoto(propertyId: string, file: File): Promise<PhotoReferenceDto> {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await propertiesApi.post<PhotoReferenceDto>(
      `/properties/${propertyId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function deletePhoto(propertyId: string, photoId: string): Promise<void> {
  try {
    await propertiesApi.delete(`/properties/${propertyId}/photos/${photoId}`);
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function getExtendedAttributes(
  propertyId: string,
): Promise<Record<string, unknown>> {
  try {
    const { data } = await propertiesApi.get<{ extendedAttributes: Record<string, unknown> }>(
      `/properties/${propertyId}/extended-attributes`,
    );
    return data.extendedAttributes;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
