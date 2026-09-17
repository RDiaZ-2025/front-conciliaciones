import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { NocAgentService, nocAgentService } from '../services/noc_agent.service';

export class NocAgentController {
  constructor(private agentService: NocAgentService = nocAgentService) {}

  agentChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
      return;
    }

    try {
      const result = await this.agentService.processChat(message, history);
      res.status(200).json(result);
    } catch (e: any) {
      console.error("Error en el agente de chat:", e.response?.data || e.message);
      res.status(500).json({ message: `Error en el agente: ${e.response?.data?.error?.message || e.message}` });
    }
  });

  agentHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(this.agentService.getHealth());
  });
}
