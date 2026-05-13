/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WordCreate } from '../models/WordCreate';
import type { WordOut } from '../models/WordOut';
import type { WordsOut } from '../models/WordsOut';
import type { WordUpdate } from '../models/WordUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WordsService {
    /**
     * Read Words
     * Retrieve words.
     * @returns WordsOut Successful Response
     * @throws ApiError
     */
    public static wordsReadWords({
        skip,
        limit = 100,
        sortField,
        sortOrder,
        filters,
    }: {
        /**
         * Number of records to skip before returning results
         */
        skip?: number,
        /**
         * Maximum number of records to return
         */
        limit?: number,
        /**
         * Field name to use for sorting
         */
        sortField?: (string | null),
        /**
         * Sort direction
         */
        sortOrder?: ('asc' | 'desc' | null),
        /**
         * JSON-encoded filters
         */
        filters?: (string | null),
    }): CancelablePromise<WordsOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/words/',
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
     * Create Word
     * Create a new word.
     * @returns WordOut Successful Response
     * @throws ApiError
     */
    public static wordsCreateWord({
        requestBody,
    }: {
        requestBody: WordCreate,
    }): CancelablePromise<WordOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/words/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Word
     * Retrieve a word by ID.
     * @returns WordOut Successful Response
     * @throws ApiError
     */
    public static wordsReadWord({
        wordId,
    }: {
        /**
         * Internal resource identifier
         */
        wordId: number,
    }): CancelablePromise<WordOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/words/{word_id}',
            path: {
                'word_id': wordId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Word
     * Update a word.
     * @returns WordOut Successful Response
     * @throws ApiError
     */
    public static wordsUpdateWord({
        wordId,
        requestBody,
    }: {
        /**
         * Internal resource identifier
         */
        wordId: number,
        requestBody: WordUpdate,
    }): CancelablePromise<WordOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/words/{word_id}',
            path: {
                'word_id': wordId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Word
     * Delete a word.
     * @returns WordOut Successful Response
     * @throws ApiError
     */
    public static wordsDeleteWord({
        wordId,
    }: {
        /**
         * Internal resource identifier
         */
        wordId: number,
    }): CancelablePromise<WordOut> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/words/{word_id}',
            path: {
                'word_id': wordId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
