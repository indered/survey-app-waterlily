import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Container,
  IconButton,
  Paper,
  Stack,
  Switch,
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
import { useAuth } from '../context/AuthContext';
import { deleteSurveyByFriendlyUrl, fetchSurveys, updateSurvey, type PaginatedResponse, type Survey } from '../lib/api';

function DeleteSurveyIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden="true" sx={{ width: 18, height: 18, display: 'block' }}>
      <path
        fill="currentColor"
        d="M9 3.75h6l.75 1.5H20v1.5H4v-1.5h4.25L9 3.75Zm1.5 6v7.5H12v-7.5h-1.5Zm3 0v7.5H15v-7.5h-1.5ZM6.5 7.5h11l-.75 11.25a1.5 1.5 0 0 1-1.5 1.5h-6.5a1.5 1.5 0 0 1-1.5-1.5L6.5 7.5Z"
      />
    </Box>
  );
}

export function AdminHome() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [surveysPage, setSurveysPage] = useState<PaginatedResponse<Survey> | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(0);
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadSurveys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchSurveys({
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch || undefined
      });
      setSurveysPage(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load surveys');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, rowsPerPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSurveys();
  }, [loadSurveys]);

  const handleDeleteSurvey = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      await deleteSurveyByFriendlyUrl(deleteTarget.friendlyUrl);
      setDeleteTarget(null);
      if (page > 0 && (surveysPage?.items?.length || 0) === 1) {
        setPage(page - 1);
        return;
      }

      await loadSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete survey');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusToggle = async (survey: Survey, checked: boolean) => {
    const nextStatus = checked ? 'ACTIVE' : 'INACTIVE';
    const previousStatus = survey.status;

    setStatusUpdating((current) => ({ ...current, [survey._id]: true }));
    setError(null);
    setSurveysPage((current) => current
      ? {
        ...current,
        items: current.items.map((item) => item._id === survey._id ? { ...item, status: nextStatus } : item)
      }
      : current
    );

    try {
      await updateSurvey(survey.friendlyUrl, { status: nextStatus });
    } catch (err) {
      setSurveysPage((current) => current
        ? {
          ...current,
          items: current.items.map((item) => item._id === survey._id ? { ...item, status: previousStatus } : item)
        }
        : current
      );
      setError(err instanceof Error ? err.message : 'Could not update survey status');
    } finally {
      setStatusUpdating((current) => {
        const next = { ...current };
        delete next[survey._id];
        return next;
      });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ minHeight: 64, gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Waterlily Surveys
          </Typography>
          <Chip
            size="small"
            label={user?.fullname || user?.email || 'Admin'}
            sx={{ maxWidth: 240 }}
          />
          <Button
            color="inherit"
            onClick={() => {
              signOut();
              navigate('/auth');
            }}
          >
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ px: { xs: 1.5, md: 2 }, py: 2, width: 1 }}>
        <Stack spacing={2}>
          <Box sx={{ px: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Surveys
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Create a survey, review inactive drafts, and jump into submissions without leaving the table.
            </Typography>
          </Box>

          <Paper sx={{ p: 2 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
            >
              <TextField
                fullWidth
                size="small"
                label="Search surveys"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, description, or friendly URL"
              />
              <Button variant="contained" onClick={() => navigate('/home/create')} sx={{ whiteSpace: 'nowrap' }}>
                Create survey
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '34%' }}>Name</TableCell>
                        <TableCell sx={{ width: '32%' }}>Public URL</TableCell>
                        <TableCell sx={{ width: '18%' }}>Status</TableCell>
                        <TableCell sx={{ width: '20%' }}>Created</TableCell>
                        <TableCell align="right" sx={{ width: 80 }}>
                          Edit
                        </TableCell>
                        <TableCell align="right" sx={{ width: '18%' }}>
                          Open
                        </TableCell>
                        <TableCell align="right" sx={{ width: 56 }}>
                          Delete
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(surveysPage?.items || []).map((survey) => (
                        <TableRow
                          key={survey._id}
                          hover
                          onClick={() => navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}`)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {survey.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {survey.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', minWidth: 0 }}
                              onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
                            >
                              <Typography
                                variant="body2"
                                sx={{ minWidth: 0, wordBreak: 'break-all', fontFamily: 'monospace' }}
                              >
                                {`${window.location.origin}/survey/${survey.friendlyUrl}`}
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                                onClick={async (event: MouseEvent<HTMLButtonElement>) => {
                                  event.stopPropagation();
                                  await navigator.clipboard.writeText(
                                    `${window.location.origin}/survey/${survey.friendlyUrl}`
                                  );
                                }}
                              >
                                Copy
                              </Button>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center' }}
                              onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
                            >
                              <Switch
                                size="small"
                                checked={survey.status === 'ACTIVE'}
                                disabled={Boolean(statusUpdating[survey._id])}
                                onChange={(event) => void handleStatusToggle(survey, event.target.checked)}
                              />
                              <Chip
                                size="small"
                                label={survey.status}
                                color={survey.status === 'ACTIVE' ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(survey.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="text"
                              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}/edit`);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="text"
                              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}`);
                              }}
                            >
                              Open
                            </Button>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                setDeleteTarget(survey);
                              }}
                              aria-label={`Delete ${survey.name}`}
                            >
                              <DeleteSurveyIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!surveysPage?.items?.length ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Box sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No surveys yet. Create the first one from the button above.
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
                  count={surveysPage?.total || 0}
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

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete survey?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget ? (
              <>
                This will delete <strong>{deleteTarget.name}</strong> and its questions. The survey will disappear
                from the table right away.
              </>
            ) : null}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={() => void handleDeleteSurvey()} color="error" variant="contained" disabled={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
