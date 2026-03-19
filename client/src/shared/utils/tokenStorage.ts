const TOKEN_KEY = 'auth_token';
const USERNAME_CACHE_KEY = 'username_cache';

export function setUsernameCache(username: string): void {
    localStorage.setItem(USERNAME_CACHE_KEY, username);
}
export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(USERNAME_CACHE_KEY);
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_CACHE_KEY);
}

export function removeNotifications(): void {
    const userId = getUserId();
    localStorage.removeItem(`notifications_${userId ?? 'guest'}`);
}

export function getUsername(): string | null {
    const cache = localStorage.getItem(USERNAME_CACHE_KEY);
    if (cache) return cache;
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.username ?? null;
    } catch {
        return null;
    }
}
export function getUserId(): string | null {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId ?? null;
    } catch {
        return null;
    }
}


export function getUserEmail(): string | null {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email ?? null;
    } catch {
        return null;
    }
}