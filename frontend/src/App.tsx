import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import BookingsPage from './pages/BookingsPage';
import ReviewsPage from './pages/ReviewsPage';

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #ddd', fontFamily: 'sans-serif' }}>
        <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#333' }}>
          Admin Propiedades
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<PropertiesPage />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route path="/properties/:id/bookings" element={<BookingsPage />} />
        <Route path="/properties/:id/reviews" element={<ReviewsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
