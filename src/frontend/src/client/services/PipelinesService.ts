/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PipelineRunOut } from '../models/PipelineRunOut';
import type { PipelineRunsOut } from '../models/PipelineRunsOut';
import type { TriggerDasiPipelineRequest } from '../models/TriggerDasiPipelineRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PipelinesService {
    /**
     * Read Pipeline Runs
     * @returns PipelineRunsOut Successful Response
     * @throws ApiError
     */
    public static pipelinesReadPipelineRuns({
        skip,
        limit = 100,
    }: {
        /**
         * Number of records to skip before returning results
         */
        skip?: number,
        /**
         * Maximum number of records to return
         */
        limit?: number,
    }): CancelablePromise<PipelineRunsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pipelines/',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Pipeline Run By Uuid
     * @returns PipelineRunOut Successful Response
     * @throws ApiError
     */
    public static pipelinesReadPipelineRunByUuid({
        uuid,
    }: {
        /**
         * Pipeline run UUID
         */
        uuid: string,
    }): CancelablePromise<PipelineRunOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/pipelines/uuid/{uuid}',
            path: {
                'uuid': uuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Trigger Dasi Sync
     * @returns PipelineRunOut Successful Response
     * @throws ApiError
     */
    public static pipelinesTriggerDasiSync({
        requestBody,
    }: {
        requestBody: TriggerDasiPipelineRequest,
    }): CancelablePromise<PipelineRunOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/pipelines/dasi/sync',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
