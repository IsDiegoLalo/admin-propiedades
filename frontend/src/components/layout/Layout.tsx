import { Outlet } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flex: 1, py: 3 }}
      >
        <Outlet />
      </Container>
    </Box>
  );
}
