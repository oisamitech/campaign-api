import { FastifySchema } from 'fastify'

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
    minLives: {
      type: 'number',
      description: 'Minimum number of lives',
    },
    maxLives: {
      type: 'number',
      description: 'Maximum number of lives',
    },
    plans: {
      type: 'array',
      items: {
        type: 'number',
      },
      description: 'Array of available plans',
    },
    value: {
      type: 'number',
      description: 'Campaign value (percentage from 1 to 100)',
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
    'minLives',
    'maxLives',
    'plans',
    'value',
    'createdAt',
    'updatedAt',
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

export const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      description: 'HTTP status code',
    },
    success: {
      type: 'boolean',
      description: 'Whether the operation was successful',
    },
    error: {
      type: 'string',
      description: 'Error type',
    },
    message: {
      type: 'string',
      description: 'Descriptive error message',
    },
  },
  required: ['statusCode', 'success', 'error', 'message'],
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
    minLives: {
      type: 'number',
      description: 'Minimum number of lives (must be positive)',
      minimum: 1,
    },
    maxLives: {
      type: 'number',
      description: 'Maximum number of lives (must be positive)',
      minimum: 1,
    },
    plans: {
      type: 'array',
      description: 'Array of available plans (positive numbers)',
      items: {
        type: 'number',
        minimum: 1,
      },
      minItems: 1,
    },
    value: {
      type: 'number',
      description: 'Campaign value (percentage from 1 to 100)',
      minimum: 1,
      maximum: 100,
    },
  },
  required: [
    'name',
    'startDate',
    'endDate',
    'minLives',
    'maxLives',
    'plans',
    'value',
  ],
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
  description: 'List all campaigns with pagination support',
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

export const createCampaignSchema: FastifySchema = {
  description: 'Create a new campaign',
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
    500: {
      description: 'Internal server error',
      ...errorResponseSchema,
    },
  },
}
