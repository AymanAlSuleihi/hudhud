/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $EpigraphsOut = {
    properties: {
        epigraphs: {
            type: 'array',
            contains: {
                type: 'EpigraphOut',
            },
            isRequired: true,
        },
        count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
