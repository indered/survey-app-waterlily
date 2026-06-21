import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { fetchSurveyByFriendlyUrl, fetchSurveySubmissions, type PaginatedResponse, type Submission, type Survey } from '../lib/api';

export function AdminSurveySubmissionsPage() {
  const { friendlyUrl } = useParams<{ friendlyUrl: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [submissionsPage, setSubmissionsPage] = useState<PaginatedResponse<Submission> | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingSurvey, setLoadingSurvey] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const loadSurvey = async () => {
      if (!friendlyUrl) {
        setError('No survey was selected.');
        setLoadingSurvey(false);
        return;
      }

      try {
        setLoadingSurvey(true);
        setError(null);
        const response = await fetchSurveyByFriendlyUrl(friendlyUrl);
        setSurvey(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this survey');
      } finally {
        setLoadingSurvey(false);
      }
    };

    void loadSurvey();
  }, [friendlyUrl]);

  useEffect(() => {
    const loadSubmissions = async () => {
      if (loadingSurvey) {
        return;
      }

      if (!friendlyUrl || !survey) {
        setLoadingSubmissions(false);
        return;
      }

      if (survey.status !== 'ACTIVE') {
        setSubmissionsPage(null);
        setLoadingSubmissions(false);
        return;
      }

      try {
        setLoadingSubmissions(true);
        setError(null);
        const response = await fetchSurveySubmissions(friendlyUrl, {
          page: page + 1,
          limit: rowsPerPage,
          search: debouncedSearch || undefined
        });
        setSubmissionsPage(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load submissions');
      } finally {
        setLoadingSubmissions(false);
      }
    };

    void loadSubmissions();
  }, [friendlyUrl, page, rowsPerPage, debouncedSearch, loadingSurvey, survey]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ minHeight: 64, gap: 1 }}>
          <Button color="inherit" onClick={() => navigate('/home')} sx={{ whiteSpace: 'nowrap' }}>
            Back to surveys
          </Button>
          {friendlyUrl ? (
            <Button color="inherit" onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}`)} sx={{ whiteSpace: 'nowrap' }}>
              Back to survey
            </Button>
          ) : null}
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Survey submissions
          </Typography>
          {survey ? (
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
              {survey.name}
            </Typography>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ px: { xs: 1.5, md: 2 }, py: 2, width: 1 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle1">{survey?.name || 'Loading survey...'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Filter submissions by user name or email and move through the list with pagination.
                </Typography>
              </Box>
              <TextField
                label="Search users"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                sx={{ width: { xs: '100%', md: 320 } }}
              />
            </Stack>
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            {loadingSurvey || loadingSubmissions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : survey?.status !== 'ACTIVE' ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="info">Submissions are available after the survey is active.</Alert>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '26%' }}>User</TableCell>
                        <TableCell sx={{ width: '24%' }}>Email</TableCell>
                        <TableCell sx={{ width: '14%' }}>Status</TableCell>
                        <TableCell sx={{ width: '20%' }}>Submitted</TableCell>
                        <TableCell align="right" sx={{ width: '16%' }}>
                          Answers
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(submissionsPage?.items || []).map((submission) => {
                        const user =
                          typeof submission.userId === 'string'
                            ? { fullname: submission.userId, email: '' }
                            : {
                                fullname: submission.userId.fullname || '',
                                email: submission.userId.email || ''
                              };

                        return (
                          <TableRow key={submission._id}>
                            <TableCell>{user.fullname || 'Unknown user'}</TableCell>
                            <TableCell>{user.email || 'No email'}</TableCell>
                            <TableCell>{submission.status}</TableCell>
                            <TableCell>{new Date(submission.submittedAt).toLocaleString()}</TableCell>
                            <TableCell align="right">{submission.responses.length}</TableCell>
                          </TableRow>
                        );
                      })}
                      {!submissionsPage?.items?.length ? (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Box sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No submissions match the current filter.
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={submissionsPage?.total || 0}
                  page={page}
                  onPageChange={(_event, nextPage) => setPage(nextPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
