/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TaskProgresssOut = {
    properties: {
        task_progress: {
            type: 'array',
            contains: {
                type: 'TaskProgressOut',
            },
            isRequired: true,
        },
        count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
