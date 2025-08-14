import {
  CampaignRepository,
  UpdateCampaignParams,
} from '../infra/database/repositories/index.js'

export interface UpdateCampaignRequest {
  name?: string
  startDate?: string
  endDate?: string
  isDefault?: boolean
  minLives?: number
  maxLives?: number
  plans?: number[]
  value?: number
  paymentMethod?: string[]
  accommodation?: string[]
  typeProduct?: string[]
  obstetrics?: string[]
}

export interface UpdateCampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
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
    // Verificar se a campanha existe
    const existingCampaign = await this.campaignRepository.findById(id)
    if (!existingCampaign) {
      throw new Error('Campaign not found')
    }

    // Validar ID
    if (!id || id.trim() === '') {
      throw new Error('Campaign ID is required')
    }

    // Se nenhum campo foi fornecido para atualização, retornar erro
    const hasUpdates = Object.keys(request).length > 0
    if (!hasUpdates) {
      throw new Error('At least one field must be provided for update')
    }

    const updateParams: UpdateCampaignParams = {}

    // Validar e processar nome
    if (request.name !== undefined) {
      if (
        typeof request.name !== 'string' ||
        request.name.trim().length === 0
      ) {
        throw new Error('Campaign name is required')
      }

      if (request.name.trim().length > 255) {
        throw new Error('Campaign name must be 255 characters or less')
      }

      updateParams.name = request.name.trim()
    }

    // Validar e processar datas
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (request.startDate !== undefined) {
      startDate = new Date(request.startDate)
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date format')
      }
      updateParams.startDate = startDate
    }

    if (request.endDate !== undefined) {
      endDate = new Date(request.endDate)
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date format')
      }
      updateParams.endDate = endDate
    }

    // Validar se startDate é antes de endDate (considerando valores existentes)
    const finalStartDate = startDate || existingCampaign.startDate
    const finalEndDate = endDate || existingCampaign.endDate

    if (finalStartDate >= finalEndDate) {
      throw new Error('Start date must be before end date')
    }

    // Validar e processar lives
    if (request.minLives !== undefined) {
      if (request.minLives <= 0) {
        throw new Error('Minimum lives must be greater than 0')
      }
      updateParams.minLives = request.minLives
    }

    if (request.maxLives !== undefined) {
      if (request.maxLives <= 0) {
        throw new Error('Maximum lives must be greater than 0')
      }
      updateParams.maxLives = request.maxLives
    }

    // Validar se minLives <= maxLives (considerando valores existentes)
    const finalMinLives =
      request.minLives !== undefined
        ? request.minLives
        : existingCampaign.minLives
    const finalMaxLives =
      request.maxLives !== undefined
        ? request.maxLives
        : existingCampaign.maxLives

    if (finalMinLives > finalMaxLives) {
      throw new Error('Minimum lives cannot be greater than maximum lives')
    }

    // Validar e processar value
    if (request.value !== undefined) {
      if (request.value < 1 || request.value > 100) {
        throw new Error('Value must be between 1 and 100')
      }
      updateParams.value = request.value
    }

    // Validar e processar plans
    if (request.plans !== undefined) {
      if (!Array.isArray(request.plans) || request.plans.length === 0) {
        throw new Error('Plans must be a non-empty array')
      }

      if (request.plans.some(plan => typeof plan !== 'number' || plan <= 0)) {
        throw new Error('All plans must be positive numbers')
      }

      updateParams.plans = request.plans
    }

    // Processar campos enum sem validação (Fastify valida)
    if (request.paymentMethod !== undefined) {
      updateParams.paymentMethod = request.paymentMethod
    }

    if (request.accommodation !== undefined) {
      updateParams.accommodation = request.accommodation
    }

    if (request.typeProduct !== undefined) {
      updateParams.typeProduct = request.typeProduct
    }

    if (request.obstetrics !== undefined) {
      updateParams.obstetrics = request.obstetrics
    }

    // Processar isDefault
    if (request.isDefault !== undefined) {
      updateParams.isDefault = request.isDefault
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
      minLives: updatedCampaign.minLives,
      maxLives: updatedCampaign.maxLives,
      plans: updatedCampaign.plans as number[],
      value: updatedCampaign.value,
      paymentMethod: updatedCampaign.paymentMethod as string[],
      accommodation: updatedCampaign.accommodation as string[],
      typeProduct: updatedCampaign.typeProduct as string[],
      obstetrics: updatedCampaign.obstetrics as string[],
      createdAt: updatedCampaign.createdAt,
      updatedAt: updatedCampaign.updatedAt,
    }
  }
}
