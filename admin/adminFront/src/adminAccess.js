const ADMIN_ROLES = new Set(['editor', 'test_manager', 'administrator', 'super_administrator'])

export function hasAdminAccess(roles) {
  return Array.isArray(roles) && roles.some((role) => ADMIN_ROLES.has(role))
}
