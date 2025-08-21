import { FastifySchema } from 'fastify'
import { ruleSchema, createCampaignRuleSchema } from './rules.js'
import { errorResponseSchema } from './index.js'

export const listCampaignsQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'string',
      description: 'Page number (must be greater than 0)',
    },
    limit: {
      type: 'string',
      description:
        'Number of items per page (must be greater than 0, maximum 100)',
    },
  },
  additionalProperties: false,
}

export const paginationMetaSchema = {
  type: 'object',
  properties: {
    currentPage: {
      type: 'number',
      description: 'Current page',
    },
    totalPages: {
      type: 'number',
      description: 'Total number of pages',
    },
    totalItems: {
      type: 'number',
      description: 'Total number of items',
    },
    itemsPerPage: {
      type: 'number',
      description: 'Items per page',
    },
    hasNextPage: {
      type: 'boolean',
      description: 'Whether there is a next page',
    },
    hasPreviousPage: {
      type: 'boolean',
      description: 'Whether there is a previous page',
    },
  },
  required: [
    'currentPage',
    'totalPages',
    'totalItems',
    'itemsPerPage',
    'hasNextPage',
    'hasPreviousPage',
  ],
  additionalProperties: false,
}

export const campaignSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique campaign ID',
    },
    name: {
      type: 'string',
      description: 'Campaign name',
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign start date',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign end date',
    },
    isDefault: {
      type: 'boolean',
      description: 'Whether this is the default campaign',
    },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PAUSED'],
      description: 'Campaign status',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Creation date',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Last update date',
    },
    rules: {
      type: 'array',
      items: ruleSchema,
      description: 'Array of campaign rules',
    },
  },
  required: [
    'id',
    'name',
    'startDate',
    'endDate',
    'isDefault',
    'status',
    'createdAt',
    'updatedAt',
    'rules',
  ],
  additionalProperties: false,
}

export const listCampaignsResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    data: {
      type: 'array',
      items: campaignSchema,
      description: 'Array of campaigns',
    },
    meta: paginationMetaSchema,
  },
  required: ['success', 'data', 'meta'],
  additionalProperties: false,
}

export const createCampaignBodySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Campaign name (required, max 255 characters)',
      minLength: 1,
      maxLength: 255,
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign start date (ISO format)',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign end date (ISO format)',
    },
    isDefault: {
      type: 'boolean',
      description:
        'Whether this is the default campaign (optional, defaults to false)',
      default: false,
    },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PAUSED'],
      description: 'Campaign status (optional, defaults to ACTIVE)',
      default: 'ACTIVE',
    },
    rules: {
      type: 'array',
      description: 'Array of campaign rules (at least one required)',
      items: createCampaignRuleSchema,
      minItems: 1,
    },
  },
  required: ['name', 'startDate', 'endDate', 'rules'],
  additionalProperties: false,
}

export const createCampaignResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    data: campaignSchema,
  },
  required: ['success', 'data'],
  additionalProperties: false,
}

export const listCampaignsSchema: FastifySchema = {
  description: 'List all campaigns with their rules and pagination support',
  tags: ['Campaigns'],
  summary: 'List campaigns',
  security: [
    {
      bearerAuth: [],
    },
  ],
  querystring: listCampaignsQuerySchema,
  response: {
    200: {
      description: 'Campaigns list returned successfully',
      ...listCampaignsResponseSchema,
    },
    401: {
      description: 'Unauthorized - Bearer token required or invalid',
      ...errorResponseSchema,
    },
    500: {
      description: 'Internal server error',
      ...errorResponseSchema,
    },
  },
}

export const updateCampaignParamsSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Campaign ID',
      pattern: '^[0-9]+$',
    },
  },
  required: ['id'],
  additionalProperties: false,
}

export const simpleCampaignSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique campaign ID',
    },
    name: {
      type: 'string',
      description: 'Campaign name',
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign start date',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign end date',
    },
    isDefault: {
      type: 'boolean',
      description: 'Whether this is the default campaign',
    },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PAUSED'],
      description: 'Campaign status',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Creation date',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Last update date',
    },
  },
  required: [
    'id',
    'name',
    'startDate',
    'endDate',
    'isDefault',
    'status',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
}

export const updateCampaignBodySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'Campaign name (optional, max 255 characters)',
      minLength: 1,
      maxLength: 255,
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign start date (ISO format, optional)',
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      description: 'Campaign end date (ISO format, optional)',
    },
    isDefault: {
      type: 'boolean',
      description: 'Whether this is the default campaign (optional)',
    },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PAUSED'],
      description: 'Campaign status (optional)',
    },
    rules: {
      type: 'array',
      description:
        'Array of campaign rules (optional - replaces all existing rules)',
      items: createCampaignRuleSchema,
      minItems: 1,
    },
  },
  additionalProperties: false,
  minProperties: 1,
}

export const updateCampaignResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    data: simpleCampaignSchema,
  },
  required: ['success', 'data'],
  additionalProperties: false,
}

export const createCampaignSchema: FastifySchema = {
  description: 'Create a new campaign with rules',
  tags: ['Campaigns'],
  summary: 'Create campaign',
  security: [
    {
      bearerAuth: [],
    },
  ],
  body: createCampaignBodySchema,
  response: {
    201: {
      description: 'Campaign created successfully',
      ...createCampaignResponseSchema,
    },
    400: {
      description: 'Invalid request data',
      ...errorResponseSchema,
    },
    401: {
      description: 'Unauthorized - Bearer token required or invalid',
      ...errorResponseSchema,
    },
    409: {
      description:
        'Date overlap conflict - Campaign dates overlap with existing campaign',
      ...errorResponseSchema,
    },
    500: {
      description: 'Internal server error',
      ...errorResponseSchema,
    },
  },
}

export const updateCampaignSchema: FastifySchema = {
  description: 'Update an existing campaign',
  tags: ['Campaigns'],
  summary: 'Update campaign',
  security: [
    {
      bearerAuth: [],
    },
  ],
  params: updateCampaignParamsSchema,
  body: updateCampaignBodySchema,
  response: {
    200: {
      description: 'Campaign updated successfully',
      ...updateCampaignResponseSchema,
    },
    400: {
      description: 'Invalid request data',
      ...errorResponseSchema,
    },
    401: {
      description: 'Unauthorized - Bearer token required or invalid',
      ...errorResponseSchema,
    },
    404: {
      description: 'Campaign not found',
      ...errorResponseSchema,
    },
    409: {
      description:
        'Date overlap conflict - Campaign dates overlap with existing campaign',
      ...errorResponseSchema,
    },
    500: {
      description: 'Internal server error',
      ...errorResponseSchema,
    },
  },
}

export const deleteCampaignParamsSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Campaign ID',
      pattern: '^[0-9]+$',
    },
  },
  required: ['id'],
  additionalProperties: false,
}

export const deleteCampaignResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    data: {
      type: 'object',
      properties: {
        ...simpleCampaignSchema.properties,
        deletedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Deletion date',
        },
      },
      required: [...simpleCampaignSchema.required, 'deletedAt'],
      additionalProperties: false,
    },
  },
  required: ['success', 'data'],
  additionalProperties: false,
}

export const deleteCampaignSchema: FastifySchema = {
  description: 'Delete a campaign and its rules (soft delete)',
  tags: ['Campaigns'],
  summary: 'Delete campaign',
  security: [
    {
      bearerAuth: [],
    },
  ],
  params: deleteCampaignParamsSchema,
  response: {
    200: {
      description: 'Campaign deleted successfully',
      ...deleteCampaignResponseSchema,
    },
    401: {
      description: 'Unauthorized - Bearer token required or invalid',
      ...errorResponseSchema,
    },
    404: {
      description: 'Campaign not found',
      ...errorResponseSchema,
    },
    500: {
      description: 'Internal server error',
      ...errorResponseSchema,
    },
  },
}
