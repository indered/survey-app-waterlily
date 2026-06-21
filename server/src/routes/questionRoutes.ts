import express from 'express';
import { CreateQuestionDto, UpdateQuestionDto } from '../dtos/questionDto.js';
import { questionController } from '../controllers/questionController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateDto } from '../middleware/validation.js';

const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), validateDto(CreateQuestionDto), questionController.createQuestion);
router.get('/', requireAuth, requireRole('admin'), questionController.getQuestions);
router.get('/survey/:friendlyUrl', requireAuth, requireRole('admin'), questionController.getQuestionsBySurveyFriendlyUrl);
router.get('/:id', requireAuth, requireRole('admin'), questionController.getQuestionById);
router.put('/:id', requireAuth, requireRole('admin'), validateDto(UpdateQuestionDto), questionController.updateQuestion);
router.delete('/:id', requireAuth, requireRole('admin'), questionController.deleteQuestion);

export default router;
