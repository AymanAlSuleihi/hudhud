/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphFacetSchemaFieldResponse = {
    properties: {
        key: {
            type: 'string',
            isRequired: true,
        },
        label: {
            type: 'string',
            isRequired: true,
        },
        dependsOn: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        sortMode: {
            type: 'string',
            isRequired: true,
        },
        multiValue: {
            type: 'boolean',
            isRequired: true,
        },
    },
} as const;
