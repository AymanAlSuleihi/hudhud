/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MultiBatchResponse = {
    description: `Response model for multi-batch operations.`,
    properties: {
        status: {
            type: 'string',
            isRequired: true,
        },
        total_chunks: {
            type: 'number',
            isRequired: true,
        },
        num_batches: {
            type: 'number',
            isRequired: true,
        },
        batch_ids: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        estimated_cost: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isRequired: true,
        },
        message: {
            type: 'string',
            isRequired: true,
        },
    },
} as const;
