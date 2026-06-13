import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import { useProperties } from '../hooks/useProperties';
import { ErrorAlert } from '../components/common/ErrorAlert';

const HERO_IMAGE_URL =
  'https://urubus.com.uy/blog/wp-content/uploads/2024/08/aerial-view-of-piriapolis-uruguay-and-harbor-from-cerro-san-antonio--1536x1024.jpg';

export default function HomePage() {
  const { filteredProperties, error, searchTerm, setSearchTerm } = useProperties();
  const navigate = useNavigate();

  return (
    <Box sx={{ mx: -3, mt: -3 }}>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 300, md: 420 },
          backgroundImage: `url(${HERO_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 30, 60, 0.55)',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 2 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{ color: '#fff', fontWeight: 700, mb: 1 }}
          >
            Propiedades en Piriápolis
          </Typography>
          <Typography
            variant="h5"
            component="p"
            sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}
          >
            Encuentra tu próximo alquiler frente al mar
          </Typography>
        </Box>
      </Box>

      {/* Search Section */}
      <Box sx={{ px: 3, py: 4, maxWidth: 700, mx: 'auto' }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre, dirección, tipo o servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'Buscar propiedades',
          }}
          variant="outlined"
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 2,
            '& .MuiOutlinedInput-root': { borderRadius: 2 },
          }}
        />
      </Box>

      {/* Properties Grid */}
      <Box sx={{ px: 3, pb: 4 }}>
        {error && <ErrorAlert message={error} />}

        {!error && filteredProperties.length === 0 && (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            {searchTerm
              ? 'No se encontraron propiedades.'
              : 'No hay propiedades registradas.'}
          </Typography>
        )}

        <Grid container spacing={3}>
          {filteredProperties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => navigate(`/properties/${property.id}`)}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={
                      property.photos.length > 0
                        ? property.photos[0].url
                        : HERO_IMAGE_URL
                    }
                    alt={`Foto de ${property.name}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {property.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {property.address}
                    </Typography>
                    <Typography variant="subtitle1" color="primary" fontWeight={600}>
                      USD {property.pricePerDayUSD}/día
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {property.maxGuests} huéspedes máx.
                      </Typography>
                    </Box>
                    {property.starRating !== null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                        <Rating
                          value={property.starRating}
                          precision={0.5}
                          size="small"
                          readOnly
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({property.starRating})
                        </Typography>
                      </Box>
                    )}
                    {property.services.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
                        {property.services.slice(0, 3).map((service) => (
                          <Chip
                            key={service}
                            label={service}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                        {property.services.length > 3 && (
                          <Chip
                            label={`+${property.services.length - 3}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
