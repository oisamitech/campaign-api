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

class DateOverlapError extends Error {
  public statusCode = 409
  public error = 'Date Overlap Error'

  constructor(message: string) {
    super(message)
    this.name = 'DateOverlapError'
  }
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

    if (
      updateParams.startDate !== undefined ||
      updateParams.endDate !== undefined
    ) {
      const newStartDate = updateParams.startDate ?? existingCampaign.startDate
      const newEndDate = updateParams.endDate ?? existingCampaign.endDate

      const overlappingCampaigns =
        await this.campaignRepository.findOverlappingCampaigns(
          newStartDate,
          newEndDate,
          id
        )

      if (overlappingCampaigns.length > 0) {
        const conflictingCampaign = overlappingCampaigns[0]
        throw new DateOverlapError(
          `Não é possível atualizar a campanha. O período informado (${newStartDate.toLocaleDateString('pt-BR')} a ${newEndDate.toLocaleDateString('pt-BR')}) está em conflito com a campanha "${conflictingCampaign.name}" (${conflictingCampaign.startDate.toLocaleDateString('pt-BR')} a ${conflictingCampaign.endDate.toLocaleDateString('pt-BR')}).`
        )
      }
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
