import {
  CampaignRepository,
  UpdateCampaignParams,
  RuleRepository,
} from '../infra/database/repositories/index.js'

export interface UpdateCampaignRequest {
  name?: string
  startDate?: string
  endDate?: string
  isDefault?: boolean
  status?: string
  rules?: Array<{
    minLives: number
    maxLives: number
    plans: number[]
    value: number
    paymentMethod: string[]
    accommodation: string[]
    typeProduct: string[]
    obstetrics: string[]
  }>
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
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly ruleRepository: RuleRepository
  ) {}

  async execute(
    id: string,
    request: UpdateCampaignRequest
  ): Promise<UpdateCampaignResponse> {
    const existingCampaign = await this.campaignRepository.findById(id)
    if (!existingCampaign) {
      throw new Error('Campaign not found')
    }

    const updateParams: UpdateCampaignParams = {
      ...(request.name !== undefined && { name: request.name.trim() }),
      ...(request.startDate !== undefined && {
        startDate: new Date(request.startDate),
      }),
      ...(request.endDate !== undefined && {
        endDate: new Date(request.endDate),
      }),
      ...(request.isDefault !== undefined && { isDefault: request.isDefault }),
      ...(request.status !== undefined && { status: request.status }),
    }

    const hasDateChanges =
      updateParams.startDate !== undefined || updateParams.endDate !== undefined

    const hasTypeChange = updateParams.isDefault !== undefined

    if (hasDateChanges || hasTypeChange) {
      const newStartDate = updateParams.startDate ?? existingCampaign.startDate
      const newEndDate = updateParams.endDate ?? existingCampaign.endDate
      const newIsDefault = updateParams.isDefault ?? existingCampaign.isDefault

      const overlappingCampaigns =
        await this.campaignRepository.findOverlappingCampaigns(
          newStartDate,
          newEndDate,
          id,
          newIsDefault
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

    // Handle rules replacement if provided
    if (request.rules !== undefined) {
      // Soft delete all existing rules for this campaign
      await this.ruleRepository.deleteByCampaignId(id)

      // Create new rules
      for (const ruleData of request.rules) {
        await this.ruleRepository.create({
          campaignId: BigInt(id),
          ...ruleData,
        })
      }
    }

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
