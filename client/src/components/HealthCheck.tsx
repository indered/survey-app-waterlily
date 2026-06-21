import { useEffect, useState } from 'react';
import { Alert, Box, Container, Paper, Typography } from '@mui/material';

type HealthResponse = {
  ok: boolean;
  service: string;
  mongo: string;
};

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <Container maxWidth={false} sx={{ mt: 2, px: { xs: 1.5, md: 2 }, width: 1 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          API Health
        </Typography>

        {loading && <Typography>Loading...</Typography>}
        {error && <Alert severity="error">{error}</Alert>}

        {health && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">{health.ok ? 'Healthy' : 'Unhealthy'}</Typography>
            <Typography variant="body2"><strong>Service:</strong> {health.service}</Typography>
            <Typography variant="body2"><strong>MongoDB:</strong> {health.mongo}</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
