/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SocialMetaService {
    /**
     * Get Epigraph Page
     * Serve epigraph page with proper meta tags for social media crawlers
     * @returns string Successful Response
     * @throws ApiError
     */
    public static socialMetaGetEpigraphPage({
        dasiId,
    }: {
        dasiId: number,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/epigraphs/{dasi_id}',
            path: {
                'dasi_id': dasiId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
