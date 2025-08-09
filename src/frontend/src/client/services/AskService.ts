/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { QueryRequest } from '../models/QueryRequest';
import type { QueryResponse } from '../models/QueryResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AskService {
    /**
     * Query Hudhud
     * @returns QueryResponse Successful Response
     * @throws ApiError
     */
    public static askQueryHudhud({
        requestBody,
    }: {
        requestBody: QueryRequest,
    }): CancelablePromise<QueryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/ask/query',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
