import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequest } from '../models/ProductionRequest';
import { Team } from '../models/Team';
import { User } from '../models/User';

export class WorkflowService {
    public readonly TEAM_OPERACIONES = 2;
    public readonly TEAM_ESTRATEGIA = 3;
    public readonly TEAM_PRODUCCION = 4;
    public readonly TEAM_DATA = 5;
    public readonly TEAM_COMERCIAL = 6;
    public readonly TEAM_ADMINISTRACION = 7;
    public readonly TEAM_MMK = 8;
    public readonly TEAM_MERCADO_DINAMICO = 9;
    public readonly TEAM_ATL = 10;

    public readonly STAGE_TEAM_MAP: Record<string, number> = {
        'quotation': this.TEAM_COMERCIAL,
        'create_proposal': this.TEAM_ESTRATEGIA,
        'get_data': this.TEAM_DATA,
        'validate_proposal': this.TEAM_ESTRATEGIA,
        'in_sell': this.TEAM_COMERCIAL,
        'consecutive_generation': this.TEAM_ADMINISTRACION,
        'closed_won': this.TEAM_COMERCIAL,
        'implementation': this.TEAM_OPERACIONES,
        'customer_review': this.TEAM_COMERCIAL,
        'completed': this.TEAM_COMERCIAL
    };

    /**
     * Determine the next stage based on the current stage and request data (e.g., budget, sales outcome).
     * Based on rules from workflow.md
     */
    public getNextStage(currentStage: string, request: ProductionRequest, additionalData?: Record<string, unknown>): string | null {
        if (additionalData?.targetStage === 'cancelled') return 'cancelled';
        if (additionalData?.targetStage === 'completed' && currentStage !== 'in_sell' && currentStage !== 'customer_review') return 'completed';

        switch (currentStage) {
            case 'quotation':
                const budget = Number(additionalData?.budget) || (request.campaignDetail?.budget ? parseInt(String(request.campaignDetail.budget).replace(/[^0-9]/g, '')) : 0);
                return budget > 50000000 ? 'create_proposal' : 'get_data';

            case 'create_proposal':
                return 'get_data';

            case 'get_data':
                const dataBudget = Number(additionalData?.budget) || (request.campaignDetail?.budget ? parseInt(String(request.campaignDetail.budget).replace(/[^0-9]/g, '')) : 0);
                return dataBudget > 50000000 ? 'validate_proposal' : 'in_sell';

            case 'validate_proposal':
                return 'in_sell';

            case 'in_sell':
                const saleClosed = additionalData?.saleClosed ?? true;
                return saleClosed ? 'consecutive_generation' : 'completed';

            case 'consecutive_generation':
                return 'closed_won';

            case 'closed_won':
                return 'implementation';

            case 'implementation':
                return 'customer_review';

            case 'customer_review':
                return 'completed';

            default:
                return 'quotation';
        }
    }

    public async advanceStage(request: ProductionRequest, additionalData?: Record<string, unknown>): Promise<{ assignmentMethod: string; oldAssignedUserId: number | null; newStage: string | null }> {
        let assignmentMethod = 'Manual';
        const oldAssignedUserId = request.assignedUserId;

        const currentStage = request.status || '';
        const newStage = this.getNextStage(currentStage, request, additionalData);

        if (!newStage || newStage === currentStage) {
            return { assignmentMethod, oldAssignedUserId, newStage: currentStage };
        }

        request.status = newStage;
        const targetTeamId = this.STAGE_TEAM_MAP[newStage];

        if (!targetTeamId) {
            return { assignmentMethod, oldAssignedUserId, newStage };
        }

        const teamRepository = AppDataSource.getRepository(Team);
        const userRepository = AppDataSource.getRepository(User);

        const team = await teamRepository.findOne({ where: { id: targetTeamId } });
        if (team) {
            request.department = team.name;

            if (targetTeamId === this.TEAM_COMERCIAL) {
                if (request.userCreatorId) {
                    request.assignedUserId = request.userCreatorId;
                    assignmentMethod = `Auto-assigned back to Creator in ${team.name}`;
                }
            } else if (additionalData?.assignedUserId) {
                request.assignedUserId = Number(additionalData.assignedUserId);
                assignmentMethod = `Manually assigned to user ID ${additionalData.assignedUserId} in ${team.name}`;
            } else {
                const teamUsers = await userRepository.find({ where: { teamId: targetTeamId, status: 1 } });
                if (teamUsers.length > 0) {
                    const randomUser = teamUsers[Math.floor(Math.random() * teamUsers.length)];
                    request.assignedUserId = randomUser.id;
                    assignmentMethod = `Auto-assigned to random user in ${team.name}`;
                }
            }
        }

        return { assignmentMethod, oldAssignedUserId, newStage };
    }
}
