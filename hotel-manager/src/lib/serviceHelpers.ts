import { ForbiddenError } from "@/lib/apiResponse";
import type { Session } from "@/services/authService";
import type { Role } from "@/types/employee";

export function assertRole(session: Session, ...roles: Role[]): void {
    if (!roles.includes(session.role)) throw new ForbiddenError();
}

// escapes % and _ so that search queries containing them don't do anything weird with the LIKE operator
export function likePattern(text: string): string {
    return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}