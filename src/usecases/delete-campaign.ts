import {
  CampaignRepository,
  RuleRepository,
} from '../infra/database/repositories/index.js'

export interface DeleteCampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  status: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date
}

export interface DeleteCampaignUseCase {
  execute(id: string): Promise<DeleteCampaignResponse>
}

export class DeleteCampaignUseCaseImpl implements DeleteCampaignUseCase {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly ruleRepository: RuleRepository
  ) {}

  async execute(id: string): Promise<DeleteCampaignResponse> {
    const existingCampaign = await this.campaignRepository.findById(id)
    if (!existingCampaign) {
      throw new Error('Campaign not found')
    }

    await this.ruleRepository.deleteByCampaignId(id)
    const deletedCampaign = await this.campaignRepository.delete(id)

    return {
      id: deletedCampaign.id.toString(),
      name: deletedCampaign.name,
      startDate: deletedCampaign.startDate,
      endDate: deletedCampaign.endDate,
      isDefault: deletedCampaign.isDefault,
      status: deletedCampaign.status,
      createdAt: deletedCampaign.createdAt,
      updatedAt: deletedCampaign.updatedAt,
      deletedAt: deletedCampaign.deletedAt!,
    }
  }
}
