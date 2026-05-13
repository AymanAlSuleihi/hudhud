/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PipelineRunsOut = {
    properties: {
        pipeline_runs: {
            type: 'array',
            contains: {
                type: 'PipelineRunOut',
            },
            isRequired: true,
        },
        count: {
            type: 'number',
            isRequired: true,
        },
    },
} as const;
