import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'signup';
const defaultRouteFor = (role: 'admin' | 'user') => (role === 'admin' ? '/home' : '');

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signOut, isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = typeof location.state === 'object' && location.state !== null && 'from' in location.state
    ? String((location.state as { from?: string }).from || '')
    : '';

  const destinationFor = useCallback((role: 'admin' | 'user') => {
    if (redirectTo && role === 'user') {
      return redirectTo;
    }

    return defaultRouteFor(role);
  }, [redirectTo]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const destination = destinationFor(user.role);
    if (destination) {
      navigate(destination, { replace: true });
    }
  }, [destinationFor, isAuthenticated, navigate, user]);

  const resetFields = () => {
    setFullname('');
    setEmail('');
    setPassword('');
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        const newUser = await signUp(email, password, fullname);
        const destination = destinationFor(newUser.role);
        if (destination) {
          navigate(destination, { replace: true });
        }
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        const currentUser = await signIn(email, password);
        const destination = destinationFor(currentUser.role);
        if (destination) {
          navigate(destination, { replace: true });
        }
      }
      resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth={false} sx={{ mt: { xs: 2, md: 4 }, px: { xs: 1.5, md: 2 }, width: 1 }}>
      <Paper sx={{ p: 2, width: 1, maxWidth: 420, margin: '0 auto' }}>
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            Waterlily Surveys
          </Typography>
          <Typography variant="subtitle1">{mode === 'login' ? 'Login' : 'Sign up'}</Typography>

          {isAuthenticated && user?.role === 'user' && !redirectTo ? (
            <Stack spacing={1.5}>
              <Alert severity="info">
                Open the survey link you were given to continue.
              </Alert>
              <Button variant="outlined" onClick={signOut}>
                Sign out
              </Button>
            </Stack>
          ) : (
            <>
              <Box component="form" onSubmit={submit}>
                <Stack spacing={1.5}>
                  {mode === 'signup' && (
                    <TextField
                      label="Full name"
                      value={fullname}
                      onChange={(event) => setFullname(event.target.value)}
                      placeholder="Optional"
                    />
                  )}

                  <TextField
                    label="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                  />

                  <TextField
                    label="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    required
                  />

                  <Button type="submit" variant="contained" fullWidth disabled={loading}>
                    {loading ? 'please wait...' : mode === 'login' ? 'Login' : 'Sign up'}
                  </Button>

                  {error && <Alert severity="error">{error}</Alert>}
                </Stack>
              </Box>

              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Back to login'}
              </Link>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
