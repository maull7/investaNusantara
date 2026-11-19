export type Role =
    | 'super_admin'
    | 'sub_admin'
    | 'editor'
    | 'journalist'
    | 'contributor'
    | 'customer'
    | 'client';

/** Admin areas a Super Admin can grant to a Sub Admin (App\Enums\Permission). */
export type Permission =
    | 'articles'
    | 'categories'
    | 'users'
    | 'ai'
    | 'activity'
    | 'directory'
    | 'insights'
    | 'memberships';

export type PermissionOption = {
    value: Permission;
    label: string;
    description: string;
};

export type User = {
    id: number;
    name: string;
    email: string;
    role: Role;
    region_code: string | null;
    permissions?: Permission[] | null;
    organization?: string | null;
    subscription_ends_at?: string | null;
};

export type Auth = {
    user: (User & { access: Permission[] }) | null;
};
