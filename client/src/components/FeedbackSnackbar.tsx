import { Alert, Snackbar } from '@mui/material';

export type FeedbackToast = {
  message: string;
  severity: 'success' | 'error' | 'info';
} | null;

type FeedbackSnackbarProps = {
  toast: FeedbackToast;
  onClose: () => void;
};

export function FeedbackSnackbar({ toast, onClose }: FeedbackSnackbarProps) {
  return (
    <Snackbar
      open={Boolean(toast)}
      autoHideDuration={3600}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={toast?.severity || 'info'} variant="filled" sx={{ width: '100%' }}>
        {toast?.message}
      </Alert>
    </Snackbar>
  );
}
