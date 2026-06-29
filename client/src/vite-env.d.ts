/// <reference types="vite/client" />

type ApiVersion = 'legacy' | 'v1' | 'v2';

declare const __API_CONFIG__: {
    authApiVersion: ApiVersion;
};
