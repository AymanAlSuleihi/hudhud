/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserCreate } from '../models/UserCreate';
import type { UserCreateOpen } from '../models/UserCreateOpen';
import type { UserOut } from '../models/UserOut';
import type { UserUpdate } from '../models/UserUpdate';
import type { UserUpdateMe } from '../models/UserUpdateMe';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Read Users
     * Retrieve users.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersReadUsers({
        skip,
        limit = 100,
    }: {
        skip?: number,
        limit?: number,
    }): CancelablePromise<Array<UserOut>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/',
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
     * Create User
     * Create new user.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersCreateUser({
        requestBody,
    }: {
        requestBody: UserCreate,
    }): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/users/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User Me
     * Get current user.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersReadUserMe(): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/me',
        });
    }
    /**
     * Update User Me
     * Update own user.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersUpdateUserMe({
        requestBody,
    }: {
        requestBody: UserUpdateMe,
    }): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/me',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create User Open
     * Create new user without the need to be logged in.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersCreateUserOpen({
        requestBody,
    }: {
        requestBody: UserCreateOpen,
    }): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/users/open',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User By Id
     * Get a specific user by id.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersReadUserById({
        userId,
    }: {
        userId: number,
    }): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update User
     * Update a user.
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static usersUpdateUser({
        userId,
        requestBody,
    }: {
        userId: number,
        requestBody: UserUpdate,
    }): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/users/{user_id}',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
