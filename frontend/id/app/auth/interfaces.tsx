

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    role: string;
}

export interface ApiResult {
    [key: string]: unknown;
}

export interface CardProps {
    onSuccess: (token: string, user: UserProfile) => void;
}
