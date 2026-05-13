/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphSearchDefaultsResponse = {
    properties: {
        browse: {
            type: 'EpigraphSearchSortDefaultResponse',
            isRequired: true,
        },
        search: {
            type: 'EpigraphSearchSortDefaultResponse',
            isRequired: true,
        },
        scopeKeys: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
    },
} as const;
