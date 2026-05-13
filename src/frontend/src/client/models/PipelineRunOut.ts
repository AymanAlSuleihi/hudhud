/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PipelineRunOut = {
    pipeline_name: string;
    trigger?: string;
    status?: string;
    current_step?: (string | null);
    celery_task_id?: (string | null);
    total_items?: (number | null);
    processed_items?: number;
    skipped_items?: number;
    failed_items?: number;
    parameters?: Record<string, any>;
    metrics?: Record<string, any>;
    error?: (string | null);
    started_at?: (string | null);
    finished_at?: (string | null);
    id: number;
    uuid: string;
    created_at: string;
    updated_at: string;
};

