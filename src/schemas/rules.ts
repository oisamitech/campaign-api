// Schema para uma regra individual
export const ruleSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique rule ID',
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
      description: 'Rule value (percentage from 1 to 100)',
    },
    paymentMethod: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['PIX', 'BANKSLIP', 'CREDITCARD'],
      },
      description: 'Array of accepted payment methods',
    },
    accommodation: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['INFIRMARY', 'APARTMENT'],
      },
      description: 'Array of accommodation types',
    },
    typeProduct: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['withParticipation', 'withoutParticipation'],
      },
      description: 'Array of product types',
    },
    obstetrics: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['withObstetric', 'withoutObstetric'],
      },
      description: 'Array of obstetric options',
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
    'minLives',
    'maxLives',
    'plans',
    'value',
    'paymentMethod',
    'accommodation',
    'typeProduct',
    'obstetrics',
    'createdAt',
    'updatedAt',
  ],
  additionalProperties: false,
}

// Schema para criação de regra dentro da campanha
export const createCampaignRuleSchema = {
  type: 'object',
  properties: {
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
      description: 'Rule value (percentage from 1 to 100)',
      minimum: 1,
      maximum: 100,
    },
    paymentMethod: {
      type: 'array',
      description: 'Array of accepted payment methods',
      items: {
        type: 'string',
        enum: ['PIX', 'BANKSLIP', 'CREDITCARD'],
      },
      minItems: 1,
      uniqueItems: true,
    },
    accommodation: {
      type: 'array',
      description: 'Array of accommodation types',
      items: {
        type: 'string',
        enum: ['INFIRMARY', 'APARTMENT'],
      },
      minItems: 1,
      uniqueItems: true,
    },
    typeProduct: {
      type: 'array',
      description: 'Array of product types',
      items: {
        type: 'string',
        enum: ['withParticipation', 'withoutParticipation'],
      },
      minItems: 1,
      uniqueItems: true,
    },
    obstetrics: {
      type: 'array',
      description: 'Array of obstetric options',
      items: {
        type: 'string',
        enum: ['withObstetric', 'withoutObstetric'],
      },
      minItems: 1,
      uniqueItems: true,
    },
  },
  required: [
    'minLives',
    'maxLives',
    'plans',
    'value',
    'paymentMethod',
    'accommodation',
    'typeProduct',
    'obstetrics',
  ],
  additionalProperties: false,
}
