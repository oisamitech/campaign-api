import {
  RuleRepository,
  UpdateRuleParams,
} from '../infra/database/repositories/index.js'

export interface UpdateRuleRequest {
  minLives?: number
  maxLives?: number
  plans?: number[]
  value?: number
  paymentMethod?: string[]
  accommodation?: string[]
  typeProduct?: string[]
  obstetrics?: string[]
}

export interface UpdateRuleResponse {
  id: string
  campaignId: string
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

export interface UpdateRuleUseCase {
  execute(id: string, request: UpdateRuleRequest): Promise<UpdateRuleResponse>
}

export class UpdateRuleUseCaseImpl implements UpdateRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(
    id: string,
    request: UpdateRuleRequest
  ): Promise<UpdateRuleResponse> {
    const existingRule = await this.ruleRepository.findById(id)
    if (!existingRule) {
      throw new Error('Rule not found')
    }

    const updateParams: UpdateRuleParams = {
      ...(request.minLives !== undefined && { minLives: request.minLives }),
      ...(request.maxLives !== undefined && { maxLives: request.maxLives }),
      ...(request.plans !== undefined && { plans: request.plans }),
      ...(request.value !== undefined && { value: request.value }),
      ...(request.paymentMethod !== undefined && {
        paymentMethod: request.paymentMethod,
      }),
      ...(request.accommodation !== undefined && {
        accommodation: request.accommodation,
      }),
      ...(request.typeProduct !== undefined && {
        typeProduct: request.typeProduct,
      }),
      ...(request.obstetrics !== undefined && {
        obstetrics: request.obstetrics,
      }),
    }

    const updatedRule = await this.ruleRepository.update(id, updateParams)

    return {
      id: updatedRule.id.toString(),
      campaignId: updatedRule.campaignId.toString(),
      minLives: updatedRule.minLives,
      maxLives: updatedRule.maxLives,
      plans: updatedRule.plans,
      value: updatedRule.value,
      paymentMethod: updatedRule.paymentMethod,
      accommodation: updatedRule.accommodation,
      typeProduct: updatedRule.typeProduct,
      obstetrics: updatedRule.obstetrics,
      createdAt: updatedRule.createdAt,
      updatedAt: updatedRule.updatedAt,
    }
  }
}
