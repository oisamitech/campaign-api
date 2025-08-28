import {
  CampaignRepository,
  CampaignWithRules,
} from '../infra/database/repositories/index.js'
import { parseISODate, normalizeDateToCampaignTime } from '../utils/index.js'

export interface GetActiveCampaignRequest {
  proposalDate?: string
  schedulingDate?: string
}

export interface ActiveCampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  status: string
  createdAt: Date
  updatedAt: Date
  rules: Array<{
    id: string
    minLives: number
    maxLives: number
    plans: number[]
    value: number
    paymentMethod: string[]
    accommodation: string[]
    typeProduct: string[]
    obstetrics: string[]
    createdAt: Date
    updatedAt: Date
  }>
}

export interface GetActiveCampaignUseCase {
  execute(request: GetActiveCampaignRequest): Promise<ActiveCampaignResponse>
}

export class GetActiveCampaignUseCaseImpl implements GetActiveCampaignUseCase {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async execute(
    request: GetActiveCampaignRequest
  ): Promise<ActiveCampaignResponse> {
    // 1ª PRIORIDADE: Buscar campanha específica que estava ativa na proposalDate (regra 30 dias)
    if (request.proposalDate) {
      const proposalDate = parseISODate(request.proposalDate)
      if (!proposalDate) {
        throw new Error('Invalid proposalDate format.')
      }

      const normalizedProposalDate = normalizeDateToCampaignTime(proposalDate)

      const campaignByProposal =
        await this.campaignRepository.findActiveCampaignByProposalDate(
          normalizedProposalDate
        )

      if (!campaignByProposal) {
        throw new Error('No active campaign found')
      }

      if (request.schedulingDate) {
        const schedulingDate = parseISODate(request.schedulingDate)
        if (!schedulingDate) {
          throw new Error('Invalid schedulingDate format.')
        }

        const normalizedSchedulingDate = normalizeDateToCampaignTime(schedulingDate)

        // Se o agendamento for até 30 dias após o fim da campanha, retorna a campanha da proposta
        const millisecondsPerDay = 1000 * 60 * 60 * 24
        const diffDays =
          (normalizedSchedulingDate.getTime() - campaignByProposal.endDate.getTime()) /
          millisecondsPerDay

        if (diffDays <= 30) {
          return this.mapCampaignToResponse(campaignByProposal)
        }

        // Se passou de 30 dias, busca campanha ativa no momento do agendamento
        const campaignAtScheduling =
          await this.campaignRepository.findActiveCampaignByProposalDate(
            normalizedSchedulingDate
          )

        if (campaignAtScheduling) {
          return this.mapCampaignToResponse(campaignAtScheduling)
        }

        throw new Error('No active campaign found for the scheduling date')
      }

      // Se não há schedulingDate, ou não passou dos 30 dias, retorna campanha da proposta
      if (campaignByProposal) {
        return this.mapCampaignToResponse(campaignByProposal)
      }
    }

    // 2ª PRIORIDADE: Buscar campanha específica ativa (isDefault: false)
    const specificCampaign = await this.campaignRepository.findCampaign(false)

    if (specificCampaign) {
      return this.mapCampaignToResponse(specificCampaign)
    }

    // 3ª PRIORIDADE: Buscar campanha padrão ativa (isDefault: true)
    const defaultCampaign = await this.campaignRepository.findCampaign()

    if (defaultCampaign) {
      return this.mapCampaignToResponse(defaultCampaign)
    }

    throw new Error('No active campaign found')
  }

  private mapCampaignToResponse(
    campaign: CampaignWithRules
  ): ActiveCampaignResponse {
    return {
      id: campaign.id.toString(),
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      isDefault: campaign.isDefault,
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      rules: campaign.rules.map(rule => ({
        id: rule.id.toString(),
        minLives: rule.minLives,
        maxLives: rule.maxLives,
        plans: rule.plans as number[],
        value: rule.value,
        paymentMethod: rule.paymentMethod as string[],
        accommodation: rule.accommodation as string[],
        typeProduct: rule.typeProduct as string[],
        obstetrics: rule.obstetrics as string[],
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
    }
  }
}
