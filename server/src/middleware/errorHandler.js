export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ok: false,
      message: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      ok: false,
      message: 'Invalid ID format'
    });
  }

  return res.status(500).json({
    ok: false,
    message: 'Internal server error'
  });
};
