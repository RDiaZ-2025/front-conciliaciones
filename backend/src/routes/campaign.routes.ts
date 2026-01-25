import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const campaignController = new CampaignController();

router.use(authenticateToken); // Protect all campaign routes

router.get('/', campaignController.getAll);
router.get('/:id', campaignController.getById);
router.post('/', campaignController.create);
router.put('/:id', campaignController.update);
router.delete('/:id', campaignController.delete);

export default router;
