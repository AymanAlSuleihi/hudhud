/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $WordOut = {
    properties: {
        word: {
            type: 'string',
            isRequired: true,
        },
        classification: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        attributes: {
            type: 'any-of',
            contains: [{
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            }, {
                type: 'null',
            }],
        },
        id: {
            type: 'number',
            isRequired: true,
        },
        frequency: {
            type: 'number',
            isRequired: true,
        },
        epigraph_count: {
            type: 'number',
            isRequired: true,
        },
        word_count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
