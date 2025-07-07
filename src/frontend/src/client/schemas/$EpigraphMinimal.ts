/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphMinimal = {
    properties: {
        id: {
            type: 'number',
            isRequired: true,
        },
        dasi_id: {
            type: 'number',
            isRequired: true,
        },
        title: {
            type: 'string',
            isRequired: true,
        },
        period: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        dasi_published: {
            type: 'any-of',
            contains: [{
                type: 'boolean',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
