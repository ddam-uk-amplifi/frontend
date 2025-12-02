/**
 * Role management utilities - simplified for superuser-only system
 */

export const roleUtils = {
  /**
   * Check if a user has access (simplified - always returns true for now)
   */
  hasRoleAccess: (_userRole?: any, _requiredRole?: any): boolean => {
    // All authenticated users have access
    // Superuser checks should be done explicitly where needed
    return true;
  },

  /**
   * Check if user is superuser
   */
  isSuperuser: (isSuperuser?: boolean): boolean => {
    return isSuperuser === true;
  },
};
