import {
  CampaignRepository,
  UpdateCampaignParams,
} from '../infra/database/repositories/index.js'

export interface UpdateCampaignRequest {
  name?: string
  startDate?: string
  endDate?: string
  isDefault?: boolean
  status?: string
}

export interface UpdateCampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface UpdateCampaignUseCase {
  execute(
    id: string,
    request: UpdateCampaignRequest
  ): Promise<UpdateCampaignResponse>
}

export class UpdateCampaignUseCaseImpl implements UpdateCampaignUseCase {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async execute(
    id: string,
    request: UpdateCampaignRequest
  ): Promise<UpdateCampaignResponse> {
    const existingCampaign = await this.campaignRepository.findById(id)
    if (!existingCampaign) {
      throw new Error('Campaign not found')
    }

    const updateParams: UpdateCampaignParams = {}

    if (request.name !== undefined) {
      updateParams.name = request.name.trim()
    }

    if (request.startDate !== undefined) {
      updateParams.startDate = new Date(request.startDate)
    }

    if (request.endDate !== undefined) {
      updateParams.endDate = new Date(request.endDate)
    }

    if (request.isDefault !== undefined) {
      updateParams.isDefault = request.isDefault
    }

    if (request.status !== undefined) {
      updateParams.status = request.status
    }

    const updatedCampaign = await this.campaignRepository.update(
      id,
      updateParams
    )

    return {
      id: updatedCampaign.id.toString(),
      name: updatedCampaign.name,
      startDate: updatedCampaign.startDate,
      endDate: updatedCampaign.endDate,
      isDefault: updatedCampaign.isDefault,
      status: updatedCampaign.status,
      createdAt: updatedCampaign.createdAt,
      updatedAt: updatedCampaign.updatedAt,
    }
  }
}
