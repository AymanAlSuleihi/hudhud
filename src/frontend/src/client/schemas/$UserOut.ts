/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UserOut = {
    properties: {
        email: {
            type: 'string',
            isRequired: true,
            format: 'email',
        },
        is_active: {
            type: 'boolean',
        },
        is_superuser: {
            type: 'boolean',
        },
        full_name: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        id: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
