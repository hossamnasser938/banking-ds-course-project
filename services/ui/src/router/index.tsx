export function canAccessAdminRoute(): boolean {
  const auth = localStorage.getItem("auth");
  if (!auth) return false;
  const parsed = JSON.parse(auth) as { role?: string };
  return parsed.role === "admin";
}
