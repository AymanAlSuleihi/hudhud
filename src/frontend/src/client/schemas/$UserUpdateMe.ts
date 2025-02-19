/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UserUpdateMe = {
    properties: {
        password: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        full_name: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        email: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'email',
            }, {
                type: 'null',
            }],
        },
    },
} as const;
