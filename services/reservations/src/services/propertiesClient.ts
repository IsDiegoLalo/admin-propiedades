import { PROPERTIES_SERVICE_URL } from '../config/env';

interface PropertyInfo {
  cancellationPenaltyPercent: number;
}

export async function getPropertyInfo(propertyId: string): Promise<PropertyInfo> {
  const url = `${PROPERTIES_SERVICE_URL}/properties/${propertyId}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`Properties Service unavailable: ${String(err)}`);
  }
  if (!response.ok) {
    throw new Error(`Properties Service responded with ${response.status}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const penalty = typeof data['cancellationPenaltyPercent'] === 'number'
    ? data['cancellationPenaltyPercent']
    : 0;
  return {
    cancellationPenaltyPercent: penalty,
  };
}
