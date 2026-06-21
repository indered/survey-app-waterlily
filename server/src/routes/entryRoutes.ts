import express from 'express';
import { entryController } from '../controllers/entryController.js';

const router = express.Router();

router.post('/', entryController.createEntry);
router.get('/', entryController.getEntries);
router.get('/:id', entryController.getEntryById);
router.put('/:id', entryController.updateEntry);
router.delete('/:id', entryController.deleteEntry);

export default router;
