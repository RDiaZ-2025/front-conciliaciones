import express from 'express';
import { getGenders, getAgeRanges, getSocioeconomicLevels } from '../controllers/audience.controller';

const router = express.Router();

router.get('/genders', getGenders);
router.get('/age-ranges', getAgeRanges);
router.get('/socioeconomic-levels', getSocioeconomicLevels);

export default router;
