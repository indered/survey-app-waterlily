import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Rating,
  Stack,
  TextField,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { FeedbackSnackbar, type FeedbackToast } from '../components/FeedbackSnackbar';
import {
  createSubmission,
  fetchMySubmissions,
  fetchSurveyBySlug,
  updateSubmission,
  type Question,
  type Submission,
  type Survey
} from '../lib/api';

type AnswerMap = Record<string, unknown>;
type AnswerErrors = Record<string, string>;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const resumeKey = (userId: string, surveyId: string) => `survey_app_resume_${userId}_${surveyId}`;

const isBlank = (value: unknown) => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
};

const formatAnswer = (question: Question, value: unknown) => {
  if (isBlank(value)) {
    return 'Not answered yet';
  }

  if (question.inputType === 'boolean') {
    return value === true ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(', ') : 'Not answered yet';
  }

  return String(value);
};

const normalizeInputValue = (question: Question, value: unknown) => {
  if (question.inputType === 'number' || question.inputType === 'rating') {
    if (value === '') {
      return '';
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : '';
  }

  if (question.inputType === 'boolean') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  }

  if (question.inputType === 'mcq') {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.length ? String(value[0]) : '';
    }

    return String(value ?? '');
  }

  return typeof value === 'string' ? value : String(value ?? '');
};

const validateAnswer = (question: Question, value: unknown) => {
  if (question.isRequired && isBlank(value)) {
    return 'Please answer this question before moving on.';
  }

  if (isBlank(value)) {
    return '';
  }

  if (question.inputType === 'text') {
    const text = String(value);
    const maxLength = question.maxLength || 100;
    if (text.length > maxLength) {
      return `Keep this under ${maxLength} characters.`;
    }
  }

  if (question.inputType === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 'Enter a valid number.';
    }
  }

  if (question.inputType === 'date') {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      return 'Choose a valid date.';
    }
  }

  if (question.inputType === 'mcq') {
    const selectedValues = Array.isArray(value)
      ? value.map(String).filter(Boolean)
      : typeof value === 'string' && value.trim()
        ? [value]
        : [];

    if (selectedValues.length > 1) {
      return 'Choose one option.';
    }

    if (selectedValues.some((selectedValue) => !question.options.includes(selectedValue))) {
      return 'Choose only available options.';
    }
  }

  if (question.inputType === 'rating') {
    if (typeof value !== 'number' || value < 1 || value > 5) {
      return 'Choose a rating from 1 to 5.';
    }
  }

  return '';
};

const answersFromSubmission = (submission: Submission | null, questions: Question[] = []) => {
  if (!submission) {
    return {};
  }

  const questionsById = new Map(questions.map((question) => [question._id, question]));

  return submission.responses.reduce((accumulator, answer) => {
    const questionId = typeof answer.questionId === 'string' ? answer.questionId : answer.questionId._id;
    const question = questionsById.get(questionId);
    accumulator[questionId] = question?.inputType === 'mcq' && Array.isArray(answer.response)
      ? String(answer.response[0] ?? '')
      : answer.response;
    return accumulator;
  }, {} as AnswerMap);
};

const toResponses = (answers: AnswerMap) => {
  return Object.entries(answers)
    .filter(([, response]) => !isBlank(response))
    .map(([questionId, response]) => ({ questionId, response }));
};

const firstUnansweredIndex = (questions: Question[], answers: AnswerMap) => {
  const index = questions.findIndex((question) => isBlank(answers[question._id]));
  return index === -1 ? Math.max(questions.length - 1, 0) : index;
};

export function SurveyViewPage() {
  const { friendlyUrl } = useParams<{ friendlyUrl: string }>();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [errors, setErrors] = useState<AnswerErrors>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<FeedbackToast>(null);
  const autosaveTimer = useRef<number | null>(null);
  const lastSavedPayload = useRef('');

  const activeQuestions = useMemo(
    () => (survey?.questions || []).filter((question) => question.isActive),
    [survey]
  );
  const currentQuestion = activeQuestions[activeIndex] || null;
  const answeredCount = useMemo(
    () => activeQuestions.filter((question) => !isBlank(answers[question._id])).length,
    [activeQuestions, answers]
  );
  const progress = activeQuestions.length ? Math.round((answeredCount / activeQuestions.length) * 100) : 0;
  const displayName = user?.fullname?.trim() || user?.email || 'Survey user';
  const resumeStorageKey = user && survey ? resumeKey(user.id, survey._id) : null;

  useEffect(() => {
    if (!isAuthenticated || !user || !friendlyUrl) {
      return;
    }

    const loadSurvey = async () => {
      setLoading(true);
      setError(null);

      try {
        const surveyResponse = await fetchSurveyBySlug(friendlyUrl);
        const nextSurvey = surveyResponse.data;
        const questions = (nextSurvey.questions || []).filter((question) => question.isActive);
        const submissionsResponse = await fetchMySubmissions();
        const draft = submissionsResponse.data.find((item) => {
          const itemSurveyId = typeof item.surveyId === 'string' ? item.surveyId : item.surveyId._id;
          return itemSurveyId === nextSurvey._id && item.status === 'DRAFT';
        });
        const nextSubmission = draft || (await createSubmission({
          surveyId: nextSurvey._id,
          responses: [],
          status: 'DRAFT'
        })).data;
        const nextAnswers = answersFromSubmission(nextSubmission, questions);
        const storedIndex = Number(localStorage.getItem(resumeKey(user.id, nextSurvey._id)));
        const nextIndex = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < questions.length
          ? storedIndex
          : firstUnansweredIndex(questions, nextAnswers);

        setSurvey(nextSurvey);
        setSubmission(nextSubmission);
        setAnswers(nextAnswers);
        setActiveIndex(nextIndex);
        setIsReviewing(false);
        lastSavedPayload.current = JSON.stringify(toResponses(nextAnswers));
        setSaveState('saved');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load this survey.');
      } finally {
        setLoading(false);
      }
    };

    void loadSurvey();
  }, [friendlyUrl, isAuthenticated, user]);

  useEffect(() => {
    if (!resumeStorageKey || isReviewing) {
      return;
    }

    localStorage.setItem(resumeStorageKey, String(activeIndex));
  }, [activeIndex, isReviewing, resumeStorageKey]);

  useEffect(() => {
    if (!submission || submission.status !== 'DRAFT') {
      return;
    }

    const nextResponses = toResponses(answers);
    const serialized = JSON.stringify(nextResponses);
    if (serialized === lastSavedPayload.current) {
      return;
    }

    setSaveState('saving');

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(() => {
      updateSubmission(submission._id, {
        responses: nextResponses,
        status: 'DRAFT'
      })
        .then((response) => {
          setSubmission(response.data);
          lastSavedPayload.current = serialized;
          setSaveState('saved');
        })
        .catch((err) => {
          setSaveState('error');
          const message = err instanceof Error ? err.message : 'Could not save your answer.';
          setError(message);
          setToast({ message, severity: 'error' });
        });
    }, 500);

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [answers, submission]);

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  const updateAnswer = (question: Question, value: unknown) => {
    const normalized = normalizeInputValue(question, value);
    setAnswers((current) => ({
      ...current,
      [question._id]: normalized
    }));
    setErrors((current) => ({
      ...current,
      [question._id]: validateAnswer(question, normalized)
    }));
  };

  const validateCurrent = () => {
    if (!currentQuestion) {
      return true;
    }

    const message = validateAnswer(currentQuestion, answers[currentQuestion._id]);
    setErrors((current) => ({
      ...current,
      [currentQuestion._id]: message
    }));
    return !message;
  };

  const goNext = () => {
    if (!validateCurrent()) {
      return;
    }

    if (activeIndex >= activeQuestions.length - 1) {
      setIsReviewing(true);
      return;
    }

    setActiveIndex((current) => current + 1);
  };

  const goPrevious = () => {
    if (isReviewing) {
      setIsReviewing(false);
      return;
    }

    setActiveIndex((current) => Math.max(current - 1, 0));
  };

  const jumpToQuestion = (index: number) => {
    setActiveIndex(index);
    setIsReviewing(false);
  };

  const submitFinal = async () => {
    if (submitting || saveState === 'saving') {
      return;
    }

    if (!submission) {
      return;
    }

    const nextErrors = activeQuestions.reduce((accumulator, question) => {
      const message = validateAnswer(question, answers[question._id]);
      if (message) {
        accumulator[question._id] = message;
      }

      return accumulator;
    }, {} as AnswerErrors);

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = activeQuestions.findIndex((question) => nextErrors[question._id]);
      setActiveIndex(firstInvalid === -1 ? 0 : firstInvalid);
      setIsReviewing(false);
      setToast({ message: 'Please complete the required questions.', severity: 'error' });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await updateSubmission(submission._id, {
        responses: toResponses(answers),
        status: 'SUBMITTED'
      });
      setSubmission(response.data);
      if (resumeStorageKey) {
        localStorage.removeItem(resumeStorageKey);
      }
      setToast({ message: 'Survey submitted.', severity: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit this survey.';
      setError(message);
      setToast({ message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const saveLabel = saveState === 'saving'
    ? 'Saving'
    : saveState === 'error'
      ? 'Save failed'
      : saveState === 'saved'
        ? 'Saved'
        : 'Ready';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 1.5, alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {displayName}
            </Typography>
            <Typography variant="subtitle1" noWrap>
              {survey?.name || 'Survey'}
            </Typography>
          </Box>
          <Chip size="small" label={saveLabel} color={saveState === 'error' ? 'error' : 'default'} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 2, md: 3 }, px: { xs: 1.5, md: 2 } }}>
        {authLoading || loading ? (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography>Loading your survey...</Typography>
              <LinearProgress />
            </Stack>
          </Paper>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !survey ? (
          <Alert severity="error">We could not find this survey.</Alert>
        ) : submission?.status === 'SUBMITTED' ? (
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Chip label="Submitted" color="success" sx={{ alignSelf: 'flex-start' }} />
              <Typography variant="h5">Your response is in.</Typography>
              <Typography color="text.secondary">
                Thanks for taking the time. You can close this page now.
              </Typography>
            </Stack>
          </Paper>
        ) : activeQuestions.length === 0 ? (
          <Alert severity="info">This survey does not have any active questions yet.</Alert>
        ) : (
          <Stack spacing={2}>
            <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="subtitle1">
                      {answeredCount} of {activeQuestions.length} answers saved
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
              </Stack>
            </Paper>

            {isReviewing ? (
              <ReviewStep
                questions={activeQuestions}
                answers={answers}
                errors={errors}
                submitting={submitting}
                savingDraft={saveState === 'saving'}
                onEdit={jumpToQuestion}
                onBack={goPrevious}
                onSubmit={submitFinal}
              />
            ) : currentQuestion ? (
              <QuestionStep
                question={currentQuestion}
                value={answers[currentQuestion._id]}
                error={errors[currentQuestion._id]}
                index={activeIndex}
                total={activeQuestions.length}
                onChange={updateAnswer}
                onPrevious={goPrevious}
                onNext={goNext}
                previousDisabled={activeIndex === 0}
              />
            ) : null}
          </Stack>
        )}
      </Container>
      <FeedbackSnackbar toast={toast} onClose={() => setToast(null)} />
    </Box>
  );
}

type QuestionStepProps = {
  question: Question;
  value: unknown;
  error?: string;
  index: number;
  total: number;
  // eslint-disable-next-line no-unused-vars
  onChange: (...args: [Question, unknown]) => void;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled: boolean;
};

function QuestionStep({
  question,
  value,
  error,
  index,
  total,
  onChange,
  onPrevious,
  onNext,
  previousDisabled
}: QuestionStepProps) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Question {index + 1} of {total}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            {question.title}
          </Typography>
          {question.description ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {question.description}
            </Typography>
          ) : null}
          {question.isRequired ? (
            <Chip label="Required" size="small" sx={{ mt: 1.5 }} />
          ) : (
            <Chip label="Optional" size="small" variant="outlined" sx={{ mt: 1.5 }} />
          )}
        </Box>

        <AnswerInput question={question} value={value} error={error} onChange={onChange} />

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
          <Button variant="outlined" onClick={onPrevious} disabled={previousDisabled} sx={{ minHeight: 44 }}>
            Previous
          </Button>
          <Button variant="contained" onClick={onNext} sx={{ minHeight: 44 }}>
            {index === total - 1 ? 'Review answers' : 'Next'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

type AnswerInputProps = {
  question: Question;
  value: unknown;
  error?: string;
  // eslint-disable-next-line no-unused-vars
  onChange: (...args: [Question, unknown]) => void;
};

function AnswerInput({
  question,
  value,
  error,
  onChange
}: AnswerInputProps) {
  if (question.inputType === 'number') {
    return (
      <TextField
        label="Answer"
        type="number"
        value={value ?? ''}
        onChange={(event) => onChange(question, event.target.value)}
        error={Boolean(error)}
        helperText={error || 'Enter a number.'}
        fullWidth
      />
    );
  }

  if (question.inputType === 'date') {
    return (
      <TextField
        label="Answer"
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(question, event.target.value)}
        error={Boolean(error)}
        helperText={error || 'Pick a date.'}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
    );
  }

  if (question.inputType === 'boolean') {
    return (
      <FormControl error={Boolean(error)}>
        <FormLabel>Answer</FormLabel>
        <RadioGroup
          value={typeof value === 'boolean' ? String(value) : ''}
          onChange={(event) => onChange(question, event.target.value)}
        >
          <FormControlLabel value="true" control={<Radio />} label="Yes" />
          <FormControlLabel value="false" control={<Radio />} label="No" />
        </RadioGroup>
        <FormHelperText>{error || 'Choose one.'}</FormHelperText>
      </FormControl>
    );
  }

  if (question.inputType === 'mcq') {
    const selectedOption = typeof value === 'string'
      ? value
      : Array.isArray(value) && value.length
        ? String(value[0])
        : '';

    return (
      <FormControl fullWidth error={Boolean(error)}>
        <FormLabel sx={{ mb: 1 }}>Answer</FormLabel>
        <ToggleButtonGroup
          exclusive
          value={selectedOption}
          onChange={(_event, nextValue: string | null) => {
            if (nextValue !== null) {
              onChange(question, nextValue);
            }
          }}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiToggleButtonGroup-grouped': {
              border: 1,
              borderColor: 'divider',
              borderRadius: '999px',
              mx: 0,
              px: 2,
              py: 1,
              minHeight: 42,
              textTransform: 'none'
            },
            '& .MuiToggleButtonGroup-grouped.Mui-selected': {
              bgcolor: 'primary.main',
              borderColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }
          }}
        >
          {question.options.map((option) => (
            <ToggleButton key={option} value={option} aria-label={option}>
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormHelperText>{error || 'Choose one option.'}</FormHelperText>
      </FormControl>
    );
  }

  if (question.inputType === 'rating') {
    return (
      <FormControl error={Boolean(error)}>
        <FormLabel sx={{ mb: 1 }}>Answer</FormLabel>
        <Rating
          value={typeof value === 'number' ? value : null}
          onChange={(_event, nextValue) => onChange(question, nextValue || '')}
        />
        <FormHelperText>{error || 'Choose a rating from 1 to 5.'}</FormHelperText>
      </FormControl>
    );
  }

  const maxLength = question.maxLength || 100;
  const textValue = typeof value === 'string' ? value : '';

  return (
    <TextField
      label="Answer"
      value={textValue}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(question, event.target.value.slice(0, maxLength))}
      slotProps={{ htmlInput: { maxLength } }}
      error={Boolean(error)}
      helperText={error || `${textValue.length}/${maxLength} characters`}
      multiline
      minRows={4}
      fullWidth
    />
  );
}

type ReviewStepProps = {
  questions: Question[];
  answers: AnswerMap;
  errors: AnswerErrors;
  submitting: boolean;
  savingDraft: boolean;
  // eslint-disable-next-line no-unused-vars
  onEdit: (...args: [number]) => void;
  onBack: () => void;
  onSubmit: () => void;
};

function ReviewStep({
  questions,
  answers,
  errors,
  submitting,
  savingDraft,
  onEdit,
  onBack,
  onSubmit
}: ReviewStepProps) {
  const missingRequired = questions.filter((question) => question.isRequired && isBlank(answers[question._id]));

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Review
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5 }}>
            Check your answers before submitting.
          </Typography>
        </Box>

        {missingRequired.length > 0 ? (
          <Alert severity="warning">
            {missingRequired.length} required question{missingRequired.length === 1 ? ' is' : 's are'} still missing.
          </Alert>
        ) : null}

        <Stack spacing={1.25}>
          {questions.map((question, index) => {
            const answer = answers[question._id];
            const missing = question.isRequired && isBlank(answer);
            return (
              <Paper key={question._id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2">{question.title}</Typography>
                      <Typography variant="body2" color={missing ? 'error' : 'text.secondary'}>
                        {formatAnswer(question, answer)}
                      </Typography>
                      {errors[question._id] ? (
                        <Typography variant="caption" color="error">
                          {errors[question._id]}
                        </Typography>
                      ) : null}
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => onEdit(index)}>
                      Edit
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
          <Button variant="outlined" onClick={onBack} sx={{ minHeight: 44 }}>
            Back
          </Button>
          <Button variant="contained" onClick={onSubmit} disabled={submitting || savingDraft} sx={{ minHeight: 44 }}>
            {submitting ? (
              <CircularProgress color="inherit" size={20} />
            ) : savingDraft ? (
              'Saving...'
            ) : (
              'Submit survey'
            )}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
