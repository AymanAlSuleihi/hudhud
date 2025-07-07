/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskProgressCreate } from '../models/TaskProgressCreate';
import type { TaskProgressOut } from '../models/TaskProgressOut';
import type { TaskProgresssOut } from '../models/TaskProgresssOut';
import type { TaskProgressUpdate } from '../models/TaskProgressUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TaskProgressService {
    /**
     * Read Task Progress
     * Retrieve task progress.
     * @returns TaskProgresssOut Successful Response
     * @throws ApiError
     */
    public static taskProgressReadTaskProgress({
        skip,
        limit = 100,
        sortField,
        sortOrder,
        filters,
    }: {
        skip?: number,
        limit?: number,
        sortField?: (string | null),
        sortOrder?: (string | null),
        filters?: (string | null),
    }): CancelablePromise<TaskProgresssOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/task_progress/',
            query: {
                'skip': skip,
                'limit': limit,
                'sort_field': sortField,
                'sort_order': sortOrder,
                'filters': filters,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Task Progress
     * Create new task progress.
     * @returns TaskProgressOut Successful Response
     * @throws ApiError
     */
    public static taskProgressCreateTaskProgress({
        requestBody,
    }: {
        requestBody: TaskProgressCreate,
    }): CancelablePromise<TaskProgressOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/task_progress/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Task Progress By Id
     * Retrieve task progress by id.
     * @returns TaskProgressOut Successful Response
     * @throws ApiError
     */
    public static taskProgressReadTaskProgressById({
        taskId,
    }: {
        taskId: number,
    }): CancelablePromise<TaskProgressOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/task_progress/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Task Progress
     * Update task progress.
     * @returns TaskProgressOut Successful Response
     * @throws ApiError
     */
    public static taskProgressUpdateTaskProgress({
        taskId,
        requestBody,
    }: {
        taskId: number,
        requestBody: TaskProgressUpdate,
    }): CancelablePromise<TaskProgressOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/task_progress/{task_id}',
            path: {
                'task_id': taskId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Task Progress
     * Delete task progress.
     * @returns void
     * @throws ApiError
     */
    public static taskProgressDeleteTaskProgress({
        taskId,
    }: {
        taskId: number,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/task_progress/{task_id}',
            path: {
                'task_id': taskId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Task Progress By Uuid
     * Retrieve task progress by uuid.
     * @returns TaskProgressOut Successful Response
     * @throws ApiError
     */
    public static taskProgressReadTaskProgressByUuid({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<TaskProgressOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/task_progress/uuid/{uuid}',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Task Progress Metrics
     * Retrieve task progress metrics.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static taskProgressReadTaskProgressMetrics({
        uuid,
    }: {
        uuid: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/task_progress/uuid/{uuid}/metrics',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
