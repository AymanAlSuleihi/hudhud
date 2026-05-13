/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Message } from '../models/Message';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UtilsService {
    /**
     * Health Check
     * Health check endpoint.
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static utilsHealthCheck(): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/utils/health-check',
        });
    }
}
