import { FastifyRequest } from 'fastify'

export interface ListCampaignsQuery {
  page?: string
  limit?: string
}

export interface CreateCampaignBody {
  name: string
  startDate: string
  endDate: string
  isDefault?: boolean
  minLives: number
  maxLives: number
  plans: number[]
  value: number
  paymentMethod: string[]
  accommodation: string[]
  typeProduct: string[]
  obstetrics: string[]
}

export interface UpdateCampaignParams {
  id: string
}

export interface UpdateCampaignBody {
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

export interface DeleteCampaignParams {
  id: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  meta?: any
  error?: string
  message?: string
}

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
