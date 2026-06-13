import axios from 'axios';

const PROPERTIES_API_URL =
  import.meta.env.VITE_PROPERTIES_API_URL || 'http://localhost:3001';
const RESERVATIONS_API_URL =
  import.meta.env.VITE_RESERVATIONS_API_URL || 'http://localhost:3002';
const REVIEWS_API_URL =
  import.meta.env.VITE_REVIEWS_API_URL || 'http://localhost:3003';

/** Instancia de axios para el microservicio de Properties */
export const propertiesApi = axios.create({
  baseURL: PROPERTIES_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Instancia de axios para el microservicio de Reservations */
export const reservationsApi = axios.create({
  baseURL: RESERVATIONS_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Instancia de axios para el microservicio de Reviews */
export const reviewsApi = axios.create({
  baseURL: REVIEWS_API_URL,
  headers: { 'Content-Type': 'application/json' },
});
