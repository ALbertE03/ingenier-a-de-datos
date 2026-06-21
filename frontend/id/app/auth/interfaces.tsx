

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

export interface Incident {
    id: number;
    incident_type: string;
    description: string | null;
    route: string | null;
    vehicle: number | null;
    report_date: string;
    status: string;
    created_by: string;
    created_at: string;
    resolved_at: string | null;
}
