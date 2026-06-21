import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  Grid,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
  SelectChangeEvent
} from '@mui/material';
import {
  createSurvey,
  fetchSurveyByFriendlyUrl,
  updateSurvey,
  type Question,
  type QuestionInputType,
  type Survey
} from '../lib/api';

type NewSurveyForm = {
  name: string;
  description: string;
  note: string;
};

type NewQuestionForm = {
  id: string;
  title: string;
  description: string;
  inputType: QuestionInputType;
  maxLength: number;
  options: string;
  isActive: boolean;
  isRequired: boolean;
};

type PersistedDraft = {
  surveyId?: string;
  form: NewSurveyForm;
  questions: Array<Partial<NewQuestionForm>>;
};

type QuestionCreatePayload = {
  title: string;
  description: string;
  inputType: QuestionInputType;
  maxLength?: number;
  options: string[];
  isActive: boolean;
  isRequired: boolean;
};

const DRAFT_STORAGE_KEY = 'survey_app_admin_create_survey_draft_v1';

const safeMaxLength = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return 100;
  }

  return Math.floor(value);
};

const emptyDraft = {
  form: {
    name: '',
    description: '',
    note: ''
  },
  questions: []
};

const createQuestionDraft = (question?: Partial<NewQuestionForm>): NewQuestionForm => ({
  id: question?.id || crypto.randomUUID(),
  title: question?.title || '',
  description: question?.description || '',
  inputType: question?.inputType || 'text',
  maxLength: question?.maxLength || 100,
  options: question?.options || '',
  isActive: question?.isActive ?? true,
  isRequired: question?.isRequired ?? false
});

const createQuestionDraftFromSurvey = (question: Question): NewQuestionForm => createQuestionDraft({
  id: question._id,
  title: question.title,
  description: question.description,
  inputType: question.inputType,
  maxLength: question.maxLength || 100,
  options: (question.options || []).join(', '),
  isActive: question.isActive,
  isRequired: question.isRequired
});

const toQuestionPayload = (question: NewQuestionForm): QuestionCreatePayload => {
  const normalizedOptions = question.options
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option.length > 0);

  return {
    title: question.title.trim(),
    description: question.description.trim(),
    inputType: question.inputType,
    maxLength: question.inputType === 'text' ? safeMaxLength(question.maxLength) : undefined,
    options: normalizedOptions,
    isActive: question.isActive,
    isRequired: question.isRequired
  };
};

const normalizeQuestionList = (questions: NewQuestionForm[]) =>
  questions
    .map(toQuestionPayload)
    .filter((question) => question.title.length > 0);

const normalizeSurveyPayload = (form: NewSurveyForm, questions: NewQuestionForm[]) => {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    note: form.note.trim(),
    questions: normalizeQuestionList(questions)
  };
};

export function CreateSurveyPage() {
  const navigate = useNavigate();
  const { friendlyUrl } = useParams<{ friendlyUrl: string }>();
  const isEditMode = Boolean(friendlyUrl);
  const [form, setForm] = useState<NewSurveyForm>(emptyDraft.form);
  const [questions, setQuestions] = useState<NewQuestionForm[]>(emptyDraft.questions);
  const [draftSurveyId, setDraftSurveyId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE');
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Autosave will keep this draft inactive.');
  const [lastSaved, setLastSaved] = useState<Survey | null>(null);
  const lastSavedPayload = useRef('');

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedDraft;
      if (parsed.form) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          name: parsed.form.name || '',
          description: parsed.form.description || '',
          note: parsed.form.note || ''
        });
      }

      if (Array.isArray(parsed.questions)) {
        setQuestions(
          parsed.questions.map((question) => createQuestionDraft(question))
        );
      }

      if (parsed.surveyId) {
        setDraftSurveyId(parsed.surveyId);
      }
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (!friendlyUrl) {
      return;
    }

    const loadSurveyForEdit = async () => {
      try {
        setLoadingSurvey(true);
        setError(null);
        const response = await fetchSurveyByFriendlyUrl(friendlyUrl);
        const nextSurvey = response.data;
        const nextForm = {
          name: nextSurvey.name,
          description: nextSurvey.description,
          note: nextSurvey.note
        };
        const nextQuestions = (nextSurvey.questions || []).map(createQuestionDraftFromSurvey);
        const nextPayload = {
          ...normalizeSurveyPayload(nextForm, nextQuestions),
          status: nextSurvey.status
        };

        setForm(nextForm);
        setQuestions(nextQuestions);
        setDraftSurveyId(nextSurvey.friendlyUrl);
        setEditingStatus(nextSurvey.status);
        setLastSaved(nextSurvey);
        lastSavedPayload.current = JSON.stringify(nextPayload);
        setStatusText(`Editing ${nextSurvey.status.toLowerCase()} survey.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this survey.');
      } finally {
        setLoadingSurvey(false);
      }
    };

    void loadSurveyForEdit();
  }, [friendlyUrl]);

  const normalizedPayload = useMemo(
    () => normalizeSurveyPayload(form, questions),
    [form, questions]
  );

  const hasMinimumInput = normalizedPayload.name.length >= 2 && normalizedPayload.description.length >= 3 && normalizedPayload.note.length >= 1;

  const saveDraft = async () => {
    if (isEditMode) {
      return;
    }

    const payload = {
      ...normalizedPayload,
      status: 'INACTIVE' as const,
      questions: normalizedPayload.questions
    };
    const serialized = JSON.stringify(payload);
    if (!hasMinimumInput || serialized === lastSavedPayload.current) {
      return;
    }

    setIsAutosaving(true);
    setError(null);
    setStatusText('Saving draft...');

    try {
      let response;
      if (!draftSurveyId) {
        response = await createSurvey(payload);
        setDraftSurveyId(response.data.friendlyUrl);
      } else {
        response = await updateSurvey(draftSurveyId, payload);
      }

      setLastSaved(response?.data || null);
      lastSavedPayload.current = serialized;
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          surveyId: draftSurveyId || response?.data.friendlyUrl,
          form,
          questions
        })
      );
      setStatusText('Draft saved as INACTIVE.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autosave failed.');
      setStatusText('Autosave failed.');
    } finally {
      setIsAutosaving(false);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    const draft = {
      surveyId: draftSurveyId || undefined,
      form,
      questions
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

    const handle = setTimeout(() => {
      void saveDraft();
    }, 900);

    return () => {
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, questions, isEditMode]);

  const addQuestion = () => {
    setQuestions((current) => [...current, createQuestionDraft()]);
  };

  const updateTextLimit = (index: number, value: string) => {
    const parsed = Number(value);
    const nextValue = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 100;

    updateQuestion(index, { maxLength: nextValue });
  };

  const removeQuestion = (index: number) => {
    setQuestions((current) => current.filter((_, i) => i !== index));
  };

  const updateQuestion = <T extends keyof NewQuestionForm>(index: number, patch: Pick<NewQuestionForm, T>) => {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  };

  const updateQuestionOptions = (index: number, options: string) => {
    setQuestions((current) =>
      current.map((question, questionIndex) => (questionIndex === index ? { ...question, options } : question))
    );
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftSurveyId(null);
    setForm(emptyDraft.form);
    setQuestions(emptyDraft.questions);
    setLastSaved(null);
    setEditingStatus('INACTIVE');
    lastSavedPayload.current = '';
    setStatusText('Autosave will keep this draft inactive.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasMinimumInput) {
      setError('Please add a name, description, and note before publishing.');
      return;
    }

    const payload = {
      ...normalizedPayload,
      status: isEditMode ? editingStatus : 'ACTIVE' as const
    };
    const serialized = JSON.stringify(payload);

    if (isEditMode && serialized === lastSavedPayload.current) {
      navigate('/home');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      if (!draftSurveyId) {
        await createSurvey(payload);
      } else {
        await updateSurvey(draftSurveyId, payload);
      }

      if (!isEditMode) {
        clearDraft();
      }
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? 'Could not save survey.' : 'Could not publish survey.');
    } finally {
      setIsPublishing(false);
    }
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, name: event.target.value }));
  };

  const onDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, description: event.target.value }));
  };

  const onNoteChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, note: event.target.value }));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {isEditMode ? 'Edit Survey' : 'Create Survey'}
          </Typography>
          <Button color="inherit" onClick={() => navigate('/home')}>
            Back
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ mt: 2, px: { xs: 1.5, md: 2 }, width: 1 }}>
        <Paper sx={{ p: 2 }}>
          {loadingSurvey ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">{isEditMode ? 'Edit your survey' : 'Build your survey'}</Typography>
              <TextField
                label="Survey Name"
                value={form.name}
                onChange={onNameChange}
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={onDescriptionChange}
                required
                multiline
                minRows={2}
                fullWidth
              />
              <TextField label="Note" value={form.note} onChange={onNoteChange} required fullWidth />
              <Typography variant="body2" color="text.secondary">
                {statusText}
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Questions</Typography>
                <Button type="button" variant="outlined" size="small" onClick={addQuestion}>
                  Add Question
                </Button>
              </Box>
              <Stack spacing={1.25}>
                {questions.map((question, index) => (
                  <Paper key={question.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.25}>
                      <TextField
                        label="Question Title"
                        value={question.title}
                        onChange={(event) => updateQuestion(index, { title: event.target.value })}
                        required
                        fullWidth
                      />

                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id={`question-type-label-${index}`}>Type</InputLabel>
                            <Select
                              labelId={`question-type-label-${index}`}
                              label="Type"
                              value={question.inputType}
                              onChange={(event: SelectChangeEvent) =>
                                updateQuestion(index, { inputType: event.target.value as QuestionInputType })
                              }
                            >
                              <MenuItem value="text">text</MenuItem>
                              <MenuItem value="number">number</MenuItem>
                              <MenuItem value="mcq">mcq</MenuItem>
                              <MenuItem value="date">date</MenuItem>
                              <MenuItem value="boolean">boolean</MenuItem>
                              <MenuItem value="rating">rating</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {question.inputType === 'text' ? (
                          <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                              label="Text Limit"
                              type="number"
                              slotProps={{
                                htmlInput: {
                                  min: 1,
                                  max: 10000
                                }
                              }}
                              value={question.maxLength}
                              onChange={(event) => updateTextLimit(index, event.target.value)}
                              helperText="Max characters for text answers"
                              fullWidth
                            />
                          </Grid>
                        ) : null}
                      </Grid>

                      <TextField
                        label="Description"
                        multiline
                        minRows={2}
                        value={question.description}
                        onChange={(event) => updateQuestion(index, { description: event.target.value })}
                        fullWidth
                      />

                      {question.inputType === 'mcq' ? (
                        <TextField
                          label="Options"
                          value={question.options}
                          onChange={(event) => updateQuestionOptions(index, event.target.value)}
                          helperText="Separate options with commas"
                          fullWidth
                        />
                      ) : null}

                      <Stack direction="row" spacing={2}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={question.isActive}
                              onChange={(event) => updateQuestion(index, { isActive: event.target.checked })}
                            />
                          }
                          label="Active"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={question.isRequired}
                              onChange={(event) => updateQuestion(index, { isRequired: event.target.checked })}
                            />
                          }
                          label="Required"
                        />
                      </Stack>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="button" size="small" color="error" onClick={() => removeQuestion(index)}>
                          Remove question
                        </Button>
                      </Box>
                    </Stack>
                  </Paper>
                ))}

                {questions.length === 0 ? <Typography variant="body2">No questions yet. Add a question to begin.</Typography> : null}
              </Stack>

              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={isPublishing || !hasMinimumInput}>
                  {isPublishing ? (isEditMode ? 'Saving...' : 'Publishing...') : (isEditMode ? 'Save changes' : 'Publish')}
                </Button>
                {isAutosaving ? <CircularProgress size={24} /> : null}
              </Stack>
            </Stack>
          </form>
          )}
        </Paper>

        {error ? <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert> : null}
        {!isEditMode && !error && lastSaved ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            Last saved draft: {lastSaved.friendlyUrl}
          </Alert>
        ) : null}
      </Container>
    </Box>
  );
}
