/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ObjectCreate } from '../models/ObjectCreate';
import type { ObjectOut } from '../models/ObjectOut';
import type { ObjectsOut } from '../models/ObjectsOut';
import type { ObjectUpdate } from '../models/ObjectUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ObjectsService {
    /**
     * Read Objects
     * Retrieve objects.
     * @returns ObjectsOut Successful Response
     * @throws ApiError
     */
    public static objectsReadObjects({
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
    }): CancelablePromise<ObjectsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/objects/',
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
     * Create Object
     * Create a new object.
     * @returns ObjectOut Successful Response
     * @throws ApiError
     */
    public static objectsCreateObject({
        requestBody,
    }: {
        requestBody: ObjectCreate,
    }): CancelablePromise<ObjectOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/objects/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Object
     * Retrieve a single object by ID.
     * @returns ObjectOut Successful Response
     * @throws ApiError
     */
    public static objectsReadObject({
        objectId,
    }: {
        objectId: number,
    }): CancelablePromise<ObjectOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/objects/{object_id}',
            path: {
                'object_id': objectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Object
     * Update an existing object.
     * @returns ObjectOut Successful Response
     * @throws ApiError
     */
    public static objectsUpdateObject({
        objectId,
        requestBody,
    }: {
        objectId: number,
        requestBody: ObjectUpdate,
    }): CancelablePromise<ObjectOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/objects/{object_id}',
            path: {
                'object_id': objectId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Object
     * Delete an object by ID.
     * @returns ObjectOut Successful Response
     * @throws ApiError
     */
    public static objectsDeleteObject({
        objectId,
    }: {
        objectId: number,
    }): CancelablePromise<ObjectOut> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/objects/{object_id}',
            path: {
                'object_id': objectId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Object By Dasi Id
     * Retrieve a single object by DASI ID.
     * @returns ObjectOut Successful Response
     * @throws ApiError
     */
    public static objectsReadObjectByDasiId({
        dasiId,
    }: {
        dasiId: number,
    }): CancelablePromise<ObjectOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/objects/dasi_id/{dasi_id}',
            path: {
                'dasi_id': dasiId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Objects
     * Import objects from external api.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsImportObjects(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/objects/import',
        });
    }
    /**
     * Import Objects Range
     * Import objects from external api in a range.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsImportObjectsRange({
        startId,
        endId,
        dasiPublished,
    }: {
        startId: number,
        endId: number,
        dasiPublished?: (boolean | null),
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/objects/import_range',
            query: {
                'start_id': startId,
                'end_id': endId,
                'dasi_published': dasiPublished,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Dasi Object Fields
     * Get list of fields in all site.dasi_object jsonb column.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsGetDasiObjectFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/objects/fields/dasi_object',
        });
    }
    /**
     * Get Dasi Object Missing Fields
     * Get list of fields which are not in all Object.dasi_object jsonb column.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsGetDasiObjectMissingFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/objects/fields/dasi_object/missing',
        });
    }
    /**
     * Transfer Fields
     * Transfer fields for every object that's already in the db.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsTransferFields(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/objects/transfer_fields',
        });
    }
    /**
     * Link To Sites
     * Link all objects to their sites.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsLinkToSites(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/objects/link_to_sites/all',
        });
    }
    /**
     * Link To Epigraphs
     * Link all objects to their epigraphs.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static objectsLinkToEpigraphs(): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/objects/link_to_epigraphs/all',
        });
    }
}
