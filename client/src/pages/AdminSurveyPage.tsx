import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography
} from '@mui/material';
import { fetchSurveyByFriendlyUrl, type Survey } from '../lib/api';

export function AdminSurveyPage() {
  const { friendlyUrl } = useParams<{ friendlyUrl: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      if (!friendlyUrl) {
        setError('No survey was selected.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetchSurveyByFriendlyUrl(friendlyUrl);
        setSurvey(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this survey');
      } finally {
        setLoading(false);
      }
    };

    void loadSurvey();
  }, [friendlyUrl]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ minHeight: 64 }}>
          <Button color="inherit" onClick={() => navigate('/home')} sx={{ mr: 1 }}>
            Back to surveys
          </Button>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Survey details
          </Typography>
          {friendlyUrl ? (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}/edit`)}
                disabled={!survey}
              >
                Edit
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}/submissions`)}
                disabled={!survey || survey.status !== 'ACTIVE'}
              >
                View submissions
              </Button>
            </Stack>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ px: { xs: 1.5, md: 2 }, py: 2, width: 1 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : survey ? (
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1">{survey.name}</Typography>
                  <Chip
                    size="small"
                    label={survey.status}
                    color={survey.status === 'ACTIVE' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {survey.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Note: {survey.note}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Friendly URL: {survey.friendlyUrl}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created by: {survey.createdBy}
                </Typography>
              </Stack>
            ) : null}
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle1">Questions</Typography>
            </Box>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '32%' }}>Title</TableCell>
                    <TableCell sx={{ width: '14%' }}>Type</TableCell>
                    <TableCell sx={{ width: '14%' }}>Required</TableCell>
                    <TableCell sx={{ width: '14%' }}>Active</TableCell>
                    <TableCell sx={{ width: '14%' }}>Text Limit</TableCell>
                    <TableCell sx={{ width: '12%' }}>Order</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(survey?.questions || []).map((question) => (
                    <TableRow key={question._id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {question.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {question.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>{question.inputType}</TableCell>
                      <TableCell>{question.isRequired ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{question.isActive ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{question.inputType === 'text' ? question.maxLength || 100 : 'N/A'}</TableCell>
                      <TableCell>{question.order}</TableCell>
                    </TableRow>
                  ))}
                  {!survey?.questions?.length ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No questions were added to this survey yet.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
