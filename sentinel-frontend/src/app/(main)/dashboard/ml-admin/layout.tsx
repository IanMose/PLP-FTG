import { redirect } from "next/navigation";
import { getAuthToken } from "@/server/server-actions";

const ALLOWED_ROLES = ["Admin", "ML Admin"];

function decodeRoleFromJwt(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export default async function MlAdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getAuthToken();
  if (!token) redirect("/unauthorized");
  const role = decodeRoleFromJwt(token);
  if (!role || !ALLOWED_ROLES.includes(role)) redirect("/unauthorized");
  return <>{children}</>;
}
