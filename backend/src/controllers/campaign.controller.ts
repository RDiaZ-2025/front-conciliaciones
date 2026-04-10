import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';
import { asyncHandler } from "../utils/asyncHandler";

export class CampaignController {
    private campaignService: CampaignService;

    constructor() {
        this.campaignService = new CampaignService();
    }

    getAll = asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await this.campaignService.findAll();
                const formattedCampaigns = campaigns.map(c => ({
                    ...c,
                    impacts: c.impacts ? JSON.parse(c.impacts) : []
                }));
                res.json({ success: true, data: formattedCampaigns });
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
                const campaign = await this.campaignService.findById(id);

                if (!campaign) {
                    return res.status(404).json({ success: false, message: 'Campaign not found' });
                }

                return res.json({
                    success: true,
                    data: {
                        ...campaign,
                        impacts: campaign.impacts ? JSON.parse(campaign.impacts) : []
                    }
                });
    });

    create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId || 1;

                const campaign = await this.campaignService.create(req.body, userId);
                return res.status(201).json({ success: true, data: campaign });
    });

    update = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
                const campaign = await this.campaignService.update(id, req.body);

                if (!campaign) {
                    return res.status(404).json({ success: false, message: 'Campaign not found' });
                }

                return res.json({ success: true, data: campaign });
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
                const success = await this.campaignService.delete(id);

                if (!success) {
                    return res.status(404).json({ success: false, message: 'Campaign not found' });
                }

                return res.json({ success: true, message: 'Campaign deleted successfully' });
    });
}
