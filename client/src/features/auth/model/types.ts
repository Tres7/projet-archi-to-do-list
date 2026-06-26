export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    birthDate: string;
}

export interface User {
    id: string;
    userName: string;
    email: string;
    birthDate: string | null;
}