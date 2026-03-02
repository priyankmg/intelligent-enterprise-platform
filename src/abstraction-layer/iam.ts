import type { SessionUser, UserGroup, SystemScope, Operation } from "@/data-layer/types";
import { userGroups } from "@/data-layer/mock-data";

export function canAccess(
  user: SessionUser,
  system: SystemScope,
  operation: Operation,
  attributeScope?: string
): boolean {
  const groups = userGroups.filter((g) => user.groupIds.includes(g.id));
  for (const group of groups) {
    for (const perm of group.permissions) {
      if (perm.system !== system) continue;
      const opOk =
        perm.operation === operation ||
        (perm.operation === "write" && operation === "read");
      if (!opOk) continue;
      if (perm.attributeScope === "no_medical" && attributeScope === "medical")
        return false;
      if (perm.attributeScope === "basic" && attributeScope === "pii") return false;
      return true;
    }
  }
  return false;
}

export function getSessionUser(): SessionUser {
  const { currentUser } = require("@/data-layer/mock-data");
  return currentUser;
}
