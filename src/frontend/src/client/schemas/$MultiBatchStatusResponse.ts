/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $MultiBatchStatusResponse = {
    description: `Response model for multi-batch status check.`,
    properties: {
        batch_ids: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        statuses: {
            type: 'array',
            contains: {
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            },
            isRequired: true,
        },
        summary: {
            type: 'dictionary',
            contains: {
                type: 'number',
            },
            isRequired: true,
        },
        all_completed: {
            type: 'boolean',
            isRequired: true,
        },
        estimated_completion_time: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
