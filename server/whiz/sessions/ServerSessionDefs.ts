import UserRole from "shared/whiz/tenants/UserRole"

export interface LoginUserData {
    userEmail: string,
    tenantId: string,
    role: UserRole
}
export interface ServerSessionUserData {
    userEmail: string,
    sessionToken: string,
    tenantId: string,
    role: UserRole
}
