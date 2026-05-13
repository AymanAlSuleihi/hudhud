/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphFacetBucket = {
    properties: {
        value: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'boolean',
            }, {
                type: 'number',
            }, {
                type: 'number',
            }],
            isRequired: true,
        },
        count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
