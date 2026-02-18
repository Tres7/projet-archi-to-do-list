export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    confirmPassword: string;
}

export interface User {
    id: string;
    userName: string;
}