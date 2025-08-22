import { FastifyRequest } from 'fastify'

// Tipos para listagem de campanhas
export interface ListCampaignsQuery {
  page?: string
  limit?: string
}

// Tipos para criação de campanha com regras obrigatórias
export interface CreateCampaignBody {
  name: string
  startDate: string
  endDate: string
  isDefault?: boolean
  status?: string
  rules: Array<{
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

// Tipos para atualização de campanha (apenas dados básicos)
export interface UpdateCampaignParams {
  id: string
}

export interface UpdateCampaignBody {
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

// Tipos para deleção de campanha
export interface DeleteCampaignParams {
  id: string
}

// Tipos de resposta da API
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  meta?: any
  error?: string
  message?: string
}

// Tipos de requests do Fastify
export type ListCampaignsRequest = FastifyRequest<{
  Querystring: ListCampaignsQuery
}>

export type CreateCampaignRequest = FastifyRequest<{
  Body: CreateCampaignBody
}>

export type UpdateCampaignRequest = FastifyRequest<{
  Params: UpdateCampaignParams
  Body: UpdateCampaignBody
}>

export type DeleteCampaignRequest = FastifyRequest<{
  Params: DeleteCampaignParams
}>

// Tipos para paginação
export interface PaginationQuery {
  page: number
  limit: number
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Tipos para atualização de rule
export interface UpdateRuleParams {
  id: string
}

export interface UpdateRuleBody {
  minLives?: number
  maxLives?: number
  plans?: number[]
  value?: number
  paymentMethod?: string[]
  accommodation?: string[]
  typeProduct?: string[]
  obstetrics?: string[]
}

export type UpdateRuleRequest = FastifyRequest<{
  Params: UpdateRuleParams
  Body: UpdateRuleBody
}>

export interface GetActiveCampaignQuery {
  proposalDate?: string
}

export type GetActiveCampaignRequest = FastifyRequest<{
  Querystring: GetActiveCampaignQuery
}>
