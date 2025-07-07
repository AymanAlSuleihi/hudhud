/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $QueryResponse = {
    properties: {
        answer: {
            type: 'string',
            isRequired: true,
        },
        epigraphs: {
            type: 'array',
            contains: {
                type: 'EpigraphOut',
            },
        },
    },
} as const;
