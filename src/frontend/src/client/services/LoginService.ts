/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_login_login_access_token } from '../models/Body_login_login_access_token';
import type { Message } from '../models/Message';
import type { NewPassword } from '../models/NewPassword';
import type { Token } from '../models/Token';
import type { UserOut } from '../models/UserOut';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LoginService {
    /**
     * Login Access Token
     * OAuth2 compatible token login, get an access token for future requests
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static loginLoginAccessToken({
        formData,
    }: {
        formData: Body_login_login_access_token,
    }): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/login/access-token',
            formData: formData,
            mediaType: 'application/x-www-form-urlencoded',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Test Token
     * Test access token
     * @returns UserOut Successful Response
     * @throws ApiError
     */
    public static loginTestToken(): CancelablePromise<UserOut> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/login/test-token',
        });
    }
    /**
     * Recover Password
     * Password Recovery
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginRecoverPassword({
        email,
    }: {
        email: string,
    }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/password-recovery/{email}',
            path: {
                'email': email,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reset Password
     * Reset password
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static loginResetPassword({
        requestBody,
    }: {
        requestBody: NewPassword,
    }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/reset-password/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
