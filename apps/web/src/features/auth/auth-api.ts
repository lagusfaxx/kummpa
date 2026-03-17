import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
  AuthTokens
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const AUTH_BASE_URL = `${API_URL}/api/v1/auth`;

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  accessToken?: string;
}

export class AuthApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function requestAuthApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken
        ? {
            Authorization: `Bearer ${options.accessToken}`
          }
        : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo completar la solicitud";
    throw new AuthApiError(message);
  }

  return payload.data;
}

interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const data = await requestAuthApi<AuthResponse>("/register", {
    method: "POST",
    body: payload
  });

  return {
    user: data.user,
    tokens: data.tokens
  };
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const data = await requestAuthApi<AuthResponse>("/login", {
    method: "POST",
    body: payload
  });

  return {
    user: data.user,
    tokens: data.tokens
  };
}

export async function refresh(refreshToken: string): Promise<AuthSession> {
  const data = await requestAuthApi<AuthResponse>("/refresh", {
    method: "POST",
    body: { refreshToken }
  });

  return {
    user: data.user,
    tokens: data.tokens
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await requestAuthApi("/logout", {
    method: "POST",
    body: { refreshToken }
  });
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const data = await requestAuthApi<{ user: AuthUser }>("/me", {
    method: "GET",
    accessToken
  });

  return data.user;
}

export async function forgotPassword(email: string): Promise<void> {
  await requestAuthApi("/forgot-password", {
    method: "POST",
    body: { email }
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await requestAuthApi("/reset-password", {
    method: "POST",
    body: {
      token,
      newPassword
    }
  });
}

export async function verifyEmail(token: string): Promise<void> {
  await requestAuthApi("/verify-email", {
    method: "POST",
    body: {
      token
    }
  });
}

export async function resendVerification(email: string): Promise<void> {
  await requestAuthApi("/verify-email/request", {
    method: "POST",
    body: {
      email
    }
  });
}
