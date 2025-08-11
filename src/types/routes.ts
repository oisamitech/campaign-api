import { FastifyRequest } from 'fastify'

export interface ListCampaignsQuery {
  page?: string
  limit?: string
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
