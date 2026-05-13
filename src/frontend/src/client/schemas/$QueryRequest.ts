/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $QueryRequest = {
    properties: {
        query: {
            type: 'string',
            isRequired: true,
        },
        conversation_history: {
            type: 'any-of',
            contains: [{
                type: 'array',
                contains: {
                    type: 'ConversationMessage',
                },
            }, {
                type: 'null',
            }],
        },
    },
} as const;
