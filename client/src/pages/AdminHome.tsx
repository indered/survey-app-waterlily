import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Tooltip,
  Toolbar,
  Typography
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../context/AuthContext';
import { FeedbackSnackbar, type FeedbackToast } from '../components/FeedbackSnackbar';
import { deleteSurveyByFriendlyUrl, fetchSurveys, updateSurvey, type PaginatedResponse, type Survey } from '../lib/api';

export function AdminHome() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [toast, setToast] = useState<FeedbackToast>(null);

  const surveys = surveysPage?.items || [];

  useEffect(() => {
    if (typeof location.state === 'object' && location.state !== null && 'toast' in location.state) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToast((location.state as { toast: FeedbackToast }).toast);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

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
        setToast({ message: 'Survey deleted.', severity: 'success' });
        return;
      }

      await loadSurveys();
      setToast({ message: 'Survey deleted.', severity: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete survey';
      setError(message);
      setToast({ message, severity: 'error' });
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
      setToast({
        message: checked ? 'Survey is live.' : 'Survey moved back to draft.',
        severity: 'success'
      });
    } catch (err) {
      setSurveysPage((current) => current
        ? {
          ...current,
          items: current.items.map((item) => item._id === survey._id ? { ...item, status: previousStatus } : item)
        }
        : current
      );
      const message = err instanceof Error ? err.message : 'Could not update survey status';
      setError(message);
      setToast({ message, severity: 'error' });
    } finally {
      setStatusUpdating((current) => {
        const next = { ...current };
        delete next[survey._id];
        return next;
      });
    }
  };

  const copySurveyLink = async (survey: Survey) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/survey/${survey.friendlyUrl}`);
      setToast({ message: `Copied ${survey.friendlyUrl}.`, severity: 'success' });
    } catch {
      setToast({ message: 'Could not copy the survey link.', severity: 'error' });
    }
  };

  const renderSurveyStatus = (survey: Survey) => (
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
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, gap: 1, py: { xs: 0.75, sm: 0 } }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Waterlily Surveys
          </Typography>
          <Chip
            size="small"
            label={user?.fullname || user?.email || 'Admin'}
            sx={{ maxWidth: { xs: 150, sm: 240 } }}
          />
          <Tooltip title="Sign out">
            <IconButton
              color="inherit"
              onClick={() => {
                signOut();
                navigate('/auth');
              }}
              sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
              aria-label="Sign out"
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            color="inherit"
            onClick={() => {
              signOut();
              navigate('/auth');
            }}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
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
              Create surveys, review drafts, and jump into submissions without wrestling the table.
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
              <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">
                  Loading surveys...
                </Typography>
              </Stack>
            ) : error ? (
              <Box sx={{ p: 2 }}>
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={() => void loadSurveys()}>
                      Try again
                    </Button>
                  }
                >
                  Couldn't load surveys. Try again.
                </Alert>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '34%' }}>Name</TableCell>
                        <TableCell sx={{ width: '18%' }}>Slug</TableCell>
                        <TableCell sx={{ width: '14%' }}>Submissions</TableCell>
                        <TableCell sx={{ width: '18%' }}>Status</TableCell>
                        <TableCell sx={{ width: '14%' }}>Created</TableCell>
                        <TableCell align="right" sx={{ width: 72 }}>
                          Edit
                        </TableCell>
                        <TableCell align="right" sx={{ width: 72 }}>
                          Open
                        </TableCell>
                        <TableCell align="right" sx={{ width: 56 }}>
                          Delete
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {surveys.map((survey) => (
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
                                sx={{ minWidth: 0, fontFamily: 'monospace' }}
                              >
                                {survey.friendlyUrl}
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<ContentCopyIcon fontSize="small" />}
                                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                                onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                  event.stopPropagation();
                                  void copySurveyLink(survey);
                                }}
                              >
                                Copy link
                              </Button>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{survey.submissionsCount || 0}</Typography>
                          </TableCell>
                          <TableCell>
                            {renderSurveyStatus(survey)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(survey.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}/edit`);
                              }}
                              aria-label={`Edit ${survey.name}`}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                                event.stopPropagation();
                                navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}`);
                              }}
                              aria-label={`Open ${survey.name}`}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
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
                              <DeleteOutlinedIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!surveys.length ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <Box sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No surveys yet. Create your first survey from the button above.
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: 1.25 }}>
                  {surveys.map((survey) => (
                    <Paper
                      key={survey._id}
                      variant="outlined"
                      onClick={() => navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}`)}
                      sx={{ p: 1.5, cursor: 'pointer' }}
                    >
                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {survey.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                              {survey.description || 'No description'}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={survey.status}
                            color={survey.status === 'ACTIVE' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary">
                              Public slug
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {survey.friendlyUrl}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyIcon fontSize="small" />}
                            onClick={(event: MouseEvent<HTMLButtonElement>) => {
                              event.stopPropagation();
                              void copySurveyLink(survey);
                            }}
                            sx={{ flexShrink: 0 }}
                          >
                            Copy link
                          </Button>
                        </Stack>

                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            {survey.submissionsCount || 0} submissions
                          </Typography>
                          <Box onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}>
                            {renderSurveyStatus(survey)}
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            startIcon={<EditOutlinedIcon fontSize="small" />}
                            onClick={(event: MouseEvent<HTMLButtonElement>) => {
                              event.stopPropagation();
                              navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}/edit`);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            startIcon={<OpenInNewIcon fontSize="small" />}
                            onClick={(event: MouseEvent<HTMLButtonElement>) => {
                              event.stopPropagation();
                              navigate(`/home/surveys/${encodeURIComponent(survey.friendlyUrl)}`);
                            }}
                          >
                            Open
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(event: MouseEvent<HTMLButtonElement>) => {
                              event.stopPropagation();
                              setDeleteTarget(survey);
                            }}
                            aria-label={`Delete ${survey.name}`}
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}

                  {!surveys.length ? (
                    <Box sx={{ py: 4, px: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No surveys yet. Create your first survey from the button above.
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>

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

      <FeedbackSnackbar toast={toast} onClose={() => setToast(null)} />
    </Box>
  );
}
