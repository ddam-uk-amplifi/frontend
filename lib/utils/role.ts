/**
 * Role management utilities
 */

import { ROLE_HIERARCHY, UserRole } from "@/lib/types/auth";

export const roleUtils = {
  /**
   * Check if a user role has access to a required role level
   */
  hasRoleAccess: (userRole?: string, requiredRole?: string): boolean => {
    if (!requiredRole) return true;
    if (!userRole) return false;

    const userLevel = ROLE_HIERARCHY[userRole as UserRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole as UserRole] || 0;

    return userLevel >= requiredLevel;
  },

  /**
   * Get numeric level for a role
   */
  getRoleLevel: (role: string): number => {
    return ROLE_HIERARCHY[role as UserRole] || 0;
  },

  /**
   * Check if role is admin
   */
  isAdmin: (role?: string): boolean => {
    return role === UserRole.ADMIN;
  },

  /**
   * Check if role is moderator or higher
   */
  isModerator: (role?: string): boolean => {
    return roleUtils.hasRoleAccess(role, UserRole.MODERATOR);
  },

  /**
   * Get all available roles
   */
  getAllRoles: (): UserRole[] => {
    return Object.values(UserRole);
  },
};
