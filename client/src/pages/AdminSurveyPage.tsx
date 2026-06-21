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
  Tooltip,
  Toolbar,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { fetchSurveyByFriendlyUrl, type Survey } from '../lib/api';
import { FeedbackSnackbar, type FeedbackToast } from '../components/FeedbackSnackbar';

export function AdminSurveyPage() {
  const { friendlyUrl } = useParams<{ friendlyUrl: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<FeedbackToast>(null);

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

  const copySurveyLink = async () => {
    if (!survey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/survey/${survey.friendlyUrl}`);
      setToast({ message: `Copied ${survey.friendlyUrl}.`, severity: 'success' });
    } catch {
      setToast({ message: 'Could not copy the survey link.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, py: { xs: 0.75, sm: 0 } }}>
          <Button color="inherit" startIcon={<ArrowBackIcon fontSize="small" />} onClick={() => navigate('/home')} sx={{ minWidth: 0 }}>
            Back to surveys
          </Button>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Survey details
          </Typography>
          {friendlyUrl ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Edit">
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}/edit`)}
                    disabled={!survey}
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}/edit`)}
                    disabled={!survey}
                    sx={{ display: { xs: 'inline-flex', sm: 'none' }, minWidth: 40, px: 1 }}
                    aria-label="Edit survey"
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="View submissions">
                <span>
                  <Button
                    variant="contained"
                    startIcon={<ListAltIcon fontSize="small" />}
                    onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}/submissions`)}
                    disabled={!survey || survey.status !== 'ACTIVE'}
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    View submissions
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/home/surveys/${encodeURIComponent(friendlyUrl)}/submissions`)}
                    disabled={!survey || survey.status !== 'ACTIVE'}
                    sx={{ display: { xs: 'inline-flex', sm: 'none' }, minWidth: 40, px: 1 }}
                    aria-label="View submissions"
                  >
                    <ListAltIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          ) : null}
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ px: { xs: 1.5, md: 2 }, py: 2, width: 1 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            {loading ? (
              <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">
                  Loading survey...
                </Typography>
              </Stack>
            ) : error ? (
              <Alert severity="error">Could not load this survey. Try again.</Alert>
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Public slug: <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{survey.friendlyUrl}</Box>
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<ContentCopyIcon fontSize="small" />} onClick={() => void copySurveyLink()}>
                    Copy link
                  </Button>
                </Stack>
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
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
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
            <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' }, p: 1.25 }}>
              {(survey?.questions || []).map((question) => (
                <Paper key={question._id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {question.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {question.description || 'No description'}
                        </Typography>
                      </Box>
                      <Chip size="small" label={question.inputType} variant="outlined" />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Chip size="small" label={question.isRequired ? 'Required' : 'Optional'} color={question.isRequired ? 'primary' : 'default'} variant="outlined" />
                      <Chip size="small" label={question.isActive ? 'Active' : 'Inactive'} color={question.isActive ? 'success' : 'default'} variant="outlined" />
                      <Chip size="small" label={`Order ${question.order + 1}`} variant="outlined" />
                      {question.inputType === 'text' ? (
                        <Chip size="small" label={`${question.maxLength || 100} chars`} variant="outlined" />
                      ) : null}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
              {!survey?.questions?.length ? (
                <Box sx={{ py: 4, px: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    No questions were added to this survey yet.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <FeedbackSnackbar toast={toast} onClose={() => setToast(null)} />
    </Box>
  );
}
