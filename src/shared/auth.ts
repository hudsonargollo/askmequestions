import { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    provider?: 'google' | 'email';
    isAdmin?: boolean;
}

export const AUTH_COOKIE_NAME = 'auth_session';

// Simple session store (in production, use a proper database)
const sessions = new Map<string, User>();

export function generateSessionId(): string {
    return crypto.randomUUID();
}

export function createSession(user: User): string {
    const sessionId = generateSessionId();
    sessions.set(sessionId, user);
    return sessionId;
}

export function getSession(sessionId: string): User | null {
    return sessions.get(sessionId) || null;
}

export function deleteSession(sessionId: string): void {
    sessions.delete(sessionId);
}

export async function authMiddleware(c: Context, next: () => Promise<void>) {
    const sessionId = getCookie(c, AUTH_COOKIE_NAME);

    if (!sessionId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = getSession(sessionId);
    if (!user) {
        return c.json({ error: 'Invalid session' }, 401);
    }

    c.set('user', user);
    await next();
}

export function setAuthCookie(c: Context, sessionId: string) {
    setCookie(c, AUTH_COOKIE_NAME, sessionId, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 24 * 60 * 60, // 60 days
    });
}

export function clearAuthCookie(c: Context) {
    setCookie(c, AUTH_COOKIE_NAME, '', {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
        maxAge: 0,
    });
}

// Google OAuth utilities
export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    id_token: string;
}

export interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
}

export function getGoogleAuthUrl(clientId: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
): Promise<GoogleTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to exchange Google code for token');
    }

    return response.json() as Promise<GoogleTokenResponse>;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);

    if (!response.ok) {
        throw new Error('Failed to get Google user info');
    }

    return response.json() as Promise<GoogleUserInfo>;
}