import { useCallback } from "react";
import { useSelector } from "react-redux";

export default function usePermission() {
  const permissions = useSelector((state) => state.access.permissions);
  return useCallback(
    (permission) => permissions.includes("*") || permissions.includes(permission),
    [permissions]
  );
}
