/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TaskProgressCreate = {
    properties: {
        task_type: {
            type: 'string',
            isRequired: true,
        },
        total_items: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        processed_items: {
            type: 'number',
        },
        status: {
            type: 'string',
        },
        error: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
