import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';

export class CampaignController {
    private campaignService: CampaignService;

    constructor() {
        this.campaignService = new CampaignService();
    }

    getAll = async (req: Request, res: Response) => {
        try {
            const campaigns = await this.campaignService.findAll();
            // Parse impacts JSON for frontend
            const formattedCampaigns = campaigns.map(c => ({
                ...c,
                impacts: c.impacts ? JSON.parse(c.impacts) : []
            }));
            res.json({ success: true, data: formattedCampaigns });
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    getById = async (req: Request, res: Response) => {
        try {
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
        } catch (error) {
            console.error('Error fetching campaign:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            // Assuming auth middleware populates req.user
            // @ts-ignore
            const userId = req.user?.id || 1; // Fallback to 1 if no auth (dev) or handle error
            
            const campaign = await this.campaignService.create(req.body, userId);
            return res.status(201).json({ success: true, data: campaign });
        } catch (error) {
            console.error('Error creating campaign:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const campaign = await this.campaignService.update(id, req.body);
            
            if (!campaign) {
                return res.status(404).json({ success: false, message: 'Campaign not found' });
            }

            return res.json({ success: true, data: campaign });
        } catch (error) {
            console.error('Error updating campaign:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const success = await this.campaignService.delete(id);
            
            if (!success) {
                return res.status(404).json({ success: false, message: 'Campaign not found' });
            }

            return res.json({ success: true, message: 'Campaign deleted successfully' });
        } catch (error) {
            console.error('Error deleting campaign:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    };
}
