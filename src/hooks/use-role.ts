import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { currentUserQueryOptions } from "@/lib/query-options";

export function useRole() {
  const { data, isLoading } = useQuery(currentUserQueryOptions());
  const roles = data?.roles ?? [];
  return {
    isLoading,
    roles,
    isAdmin: roles.includes("admin"),
    isStaff: roles.includes("admin") || roles.includes("librarian"),
  };
}

/** Redirect non-staff users away from admin-only pages. */
export function useStaffGuard() {
  const { isLoading, isStaff } = useRole();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !isStaff) navigate({ to: "/catalog", replace: true });
  }, [isLoading, isStaff, navigate]);
  return isStaff;
}
