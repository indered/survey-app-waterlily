import express from 'express';
import { CreateSurveyDto, UpdateSurveyDto } from '../dtos/surveyDto.js';
import { surveyController } from '../controllers/surveyController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateDto } from '../middleware/validation.js';

const router = express.Router();

router.get('/slug/:friendlyUrl', surveyController.getSurveyByFriendlyUrl);
router.get('/by-url/:friendlyUrl/submissions', requireAuth, requireRole('admin'), surveyController.getSurveySubmissions);
router.post('/', requireAuth, requireRole('admin'), validateDto(CreateSurveyDto), surveyController.createSurvey);
router.get('/', requireAuth, surveyController.getSurveys);
router.get('/by-url/:friendlyUrl', requireAuth, requireRole('admin'), surveyController.getSurveyByFriendlyUrl);
router.put('/by-url/:friendlyUrl', requireAuth, requireRole('admin'), validateDto(UpdateSurveyDto), surveyController.updateSurveyByFriendlyUrl);
router.delete('/by-url/:friendlyUrl', requireAuth, requireRole('admin'), surveyController.deleteSurveyByFriendlyUrl);

export default router;
