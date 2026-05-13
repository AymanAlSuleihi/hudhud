/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphSearchSchemaResponse = {
    properties: {
        fields: {
            type: 'array',
            contains: {
                type: 'EpigraphSearchFieldResponse',
            },
            isRequired: true,
        },
        scopes: {
            type: 'array',
            contains: {
                type: 'EpigraphSearchScopeResponse',
            },
            isRequired: true,
        },
        sortOptions: {
            type: 'array',
            contains: {
                type: 'EpigraphSearchSortOptionResponse',
            },
            isRequired: true,
        },
        defaults: {
            type: 'EpigraphSearchDefaultsResponse',
            isRequired: true,
        },
        operators: {
            type: 'array',
            contains: {
                type: 'EpigraphSearchOperatorResponse',
            },
            isRequired: true,
        },
    },
} as const;
