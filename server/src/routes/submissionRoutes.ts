import express from 'express';
import { CreateSubmissionDto, UpdateSubmissionDto } from '../dtos/submissionDto.js';
import { submissionController } from '../controllers/submissionController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateDto } from '../middleware/validation.js';

const router = express.Router();

router.post('/', requireAuth, requireRole('user'), validateDto(CreateSubmissionDto), submissionController.createSubmission);
router.get('/mine', requireAuth, requireRole('user'), submissionController.getMySubmissions);
router.get('/', requireAuth, requireRole('admin'), submissionController.getAllSubmissions);
router.get('/:id', requireAuth, requireRole('user', 'admin'), submissionController.getSubmissionById);
router.put('/:id', requireAuth, requireRole('user'), validateDto(UpdateSubmissionDto), submissionController.updateSubmission);

export default router;
