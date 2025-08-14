import { CampaignRepository } from '../infra/database/repositories/index.js'

export interface DeleteCampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  minLives: number
  maxLives: number
  plans: number[]
  value: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date
}

export interface DeleteCampaignUseCase {
  execute(id: string): Promise<DeleteCampaignResponse>
}

export class DeleteCampaignUseCaseImpl implements DeleteCampaignUseCase {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async execute(id: string): Promise<DeleteCampaignResponse> {
    if (!id || id.trim() === '') {
      throw new Error('Invalid campaign ID: ID is required')
    }

    if (!/^\d+$/.test(id)) {
      throw new Error('Invalid campaign ID: ID must be a positive number')
    }

    const existingCampaign = await this.campaignRepository.findById(id)
    if (!existingCampaign) {
      throw new Error('Campaign not found')
    }

    const deletedCampaign = await this.campaignRepository.delete(id)

    return {
      id: deletedCampaign.id.toString(),
      name: deletedCampaign.name,
      startDate: deletedCampaign.startDate,
      endDate: deletedCampaign.endDate,
      isDefault: deletedCampaign.isDefault,
      minLives: deletedCampaign.minLives,
      maxLives: deletedCampaign.maxLives,
      plans: deletedCampaign.plans as number[],
      value: deletedCampaign.value,
      createdAt: deletedCampaign.createdAt,
      updatedAt: deletedCampaign.updatedAt,
      deletedAt: deletedCampaign.deletedAt!,
    }
  }
}
