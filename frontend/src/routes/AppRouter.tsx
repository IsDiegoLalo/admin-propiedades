import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import HomePage from '../pages/HomePage';
import PropertiesPage from '../pages/PropertiesPage';
import PropertyDetailPage from '../pages/PropertyDetailPage';
import BookingsPage from '../pages/BookingsPage';
import ReviewsPage from '../pages/ReviewsPage';
import NewPropertyPage from '../pages/NewPropertyPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/new" element={<NewPropertyPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/properties/:id/bookings" element={<BookingsPage />} />
          <Route path="/properties/:id/reviews" element={<ReviewsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
