export type Role = 'super_admin' | 'editor' | 'journalist' | 'contributor';

export type User = {
    id: number;
    name: string;
    email: string;
    role: Role;
    region_code: string | null;
};

export type Auth = {
    user: User | null;
};
