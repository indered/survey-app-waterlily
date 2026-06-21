export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  fullname: string;
  email: string;
  role: UserRole;
};

export type AuthResponse = {
  ok: true;
  user: AuthUser;
  token: string;
};

export type ApiError = {
  ok: false;
  message: string;
};

export type Survey = {
  _id: string;
  name: string;
  friendlyUrl: string;
  description: string;
  note: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdAt: string;
  questions?: Question[];
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type QuestionInputType = 'text' | 'number' | 'mcq' | 'date' | 'boolean' | 'rating';

export type Question = {
  _id: string;
  surveyId: string;
  title: string;
  order: number;
  description: string;
  inputType: QuestionInputType;
  maxLength?: number;
  options: string[];
  isActive: boolean;
  isRequired: boolean;
};

export type CreateSurveyQuestionPayload = {
  title: string;
  description?: string;
  inputType: QuestionInputType;
  maxLength?: number;
  options?: string[];
  isActive?: boolean;
  isRequired?: boolean;
};

export type Answer = {
  questionId: string;
  response: unknown;
};

export type Submission = {
  _id: string;
  userId:
    | string
    | {
        _id: string;
        fullname?: string;
        email?: string;
      };
  surveyId:
    | string
    | {
        _id: string;
        name: string;
        friendlyUrl?: string;
        status?: 'ACTIVE' | 'INACTIVE';
      };
  status: 'DRAFT' | 'SUBMITTED';
  responses: Answer[];
  submittedAt: string;
};

const STORAGE_KEY = 'survey_app_auth';

const API_BASE = '/api';

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const normalizePage = <T>(payload: PaginatedResponse<T> | T[]) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: 1,
      limit: payload.length || 10,
      total: payload.length,
      totalPages: payload.length ? 1 : 1
    };
  }

  return payload;
};

export const getStoredAuth = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { token: string; user: AuthUser };
  } catch {
    return null;
  }
};

export const setStoredAuth = (token: string, user: AuthUser) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
};

export const clearStoredAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const apiFetch = async <T>(path: string, options: globalThis.RequestInit = {}) => {
  const auth = getStoredAuth();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (auth?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const payload = (await response.json()) as ApiError | T;

  if (!response.ok || (payload as ApiError).ok === false) {
    const message = (payload as ApiError).message || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
};

export const signup = async (body: { fullname?: string; email: string; password: string }) => {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const login = async (body: { email: string; password: string }) => {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const fetchMe = async () => {
  return apiFetch<{ ok: true; user: AuthUser }>('/auth/me');
};

export const createSurvey = async (body: {
  name: string;
  description: string;
  note: string;
  status?: 'ACTIVE' | 'INACTIVE';
  questions?: CreateSurveyQuestionPayload[];
}) => {
  return apiFetch<{ ok: true; data: Survey }>('/surveys', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const updateSurvey = async (
  friendlyUrl: string,
  body: {
    name?: string;
    description?: string;
    note?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    questions?: CreateSurveyQuestionPayload[];
  }
) => {
  return apiFetch<{ ok: true; data: Survey }>(`/surveys/by-url/${encodeURIComponent(friendlyUrl)}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
};

export const fetchSurveys = async (params: {
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
  page?: number;
  limit?: number;
} = {}) => {
  const query = buildQueryString(params);
  const response = await apiFetch<{ ok: true; data: PaginatedResponse<Survey> | Survey[] }>(`/surveys${query}`, {
    method: 'GET'
  });

  return {
    ...response,
    data: normalizePage(response.data)
  };
};

export const fetchSurveyByFriendlyUrl = async (friendlyUrl: string) => {
  return apiFetch<{ ok: true; data: Survey }>(`/surveys/by-url/${encodeURIComponent(friendlyUrl)}`, {
    method: 'GET'
  });
};

export const fetchSurveyById = fetchSurveyByFriendlyUrl;

export const deleteSurveyByFriendlyUrl = async (friendlyUrl: string) => {
  return apiFetch<{ ok: true; data: { id: string } }>(`/surveys/by-url/${encodeURIComponent(friendlyUrl)}`, {
    method: 'DELETE'
  });
};

export const fetchSubmissions = async (params: {
  surveyId?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) => {
  const query = buildQueryString(params);
  const response = await apiFetch<{ ok: true; data: PaginatedResponse<Submission> | Submission[] }>(`/submissions${query}`, {
    method: 'GET'
  });

  return {
    ...response,
    data: normalizePage(response.data)
  };
};

export const fetchMySubmissions = async () => {
  return apiFetch<{ ok: true; data: Submission[] }>('/submissions/mine', {
    method: 'GET'
  });
};

export const fetchSurveySubmissions = async (friendlyUrl: string, params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}) => {
  const query = buildQueryString(params);
  const response = await apiFetch<{ ok: true; data: PaginatedResponse<Submission> | Submission[] }>(
    `/surveys/by-url/${encodeURIComponent(friendlyUrl)}/submissions${query}`,
    {
      method: 'GET'
    }
  );

  return {
    ...response,
    data: normalizePage(response.data)
  };
};

export const fetchSurveyBySlug = async (friendlyUrl: string) => {
  return apiFetch<{ ok: true; data: Survey }>(`/surveys/slug/${encodeURIComponent(friendlyUrl)}`, {
    method: 'GET'
  });
};

export const createSubmission = async (body: {
  surveyId: string;
  responses: Answer[];
  status?: 'DRAFT' | 'SUBMITTED';
}) => {
  return apiFetch<{ ok: true; data: Submission }>('/submissions', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const updateSubmission = async (
  id: string,
  body: {
    responses?: Answer[];
    status?: 'DRAFT' | 'SUBMITTED';
  }
) => {
  return apiFetch<{ ok: true; data: Submission }>(`/submissions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
};

export const createQuestion = async (body: {
  surveyId: string;
  title: string;
  description?: string;
  inputType: QuestionInputType;
  maxLength?: number;
  options?: string[];
  isActive?: boolean;
  isRequired?: boolean;
}) => {
  return apiFetch<{ ok: true; data: Question }>('/questions', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

export const fetchQuestions = async (surveyFriendlyUrl: string) => {
  return apiFetch<{ ok: true; data: Question[] }>(`/questions/survey/${encodeURIComponent(surveyFriendlyUrl)}`, {
    method: 'GET'
  });
};

export const updateQuestion = async (
  id: string,
  body: {
  title?: string;
  description?: string;
  inputType?: QuestionInputType;
  maxLength?: number;
  options?: string[];
  isActive?: boolean;
    isRequired?: boolean;
  }
) => {
  return apiFetch<{ ok: true; data: Question }>(`/questions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
};
