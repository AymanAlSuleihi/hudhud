/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $PipelineRunOut = {
    properties: {
        pipeline_name: {
            type: 'string',
            isRequired: true,
        },
        trigger: {
            type: 'string',
        },
        status: {
            type: 'string',
        },
        current_step: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        celery_task_id: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        total_items: {
            type: 'any-of',
            contains: [{
                type: 'number',
            }, {
                type: 'null',
            }],
        },
        processed_items: {
            type: 'number',
        },
        skipped_items: {
            type: 'number',
        },
        failed_items: {
            type: 'number',
        },
        parameters: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        metrics: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        error: {
            type: 'any-of',
            contains: [{
                type: 'string',
            }, {
                type: 'null',
            }],
        },
        started_at: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date-time',
            }, {
                type: 'null',
            }],
        },
        finished_at: {
            type: 'any-of',
            contains: [{
                type: 'string',
                format: 'date-time',
            }, {
                type: 'null',
            }],
        },
        id: {
            type: 'number',
            isRequired: true,
        },
        uuid: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        created_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
        updated_at: {
            type: 'string',
            isRequired: true,
            format: 'date-time',
        },
    },
} as const;
