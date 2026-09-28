import { describe, it, expect } from "vitest";
import { AuthError, assertManagerRole, isManagerOrOwner } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

function user(role: SessionUser["role"]): SessionUser {
  return {
    id: "u1",
    email: `${role}@test.local`,
    name: role,
    role,
    workspace_id: "ws1",
    workspace_name: "WS",
    membership_id: "m1",
  };
}

describe("assertManagerRole / requireManager gate", () => {
  it("allows owner and manager", () => {
    expect(assertManagerRole(user("owner")).role).toBe("owner");
    expect(assertManagerRole(user("manager")).role).toBe("manager");
    expect(isManagerOrOwner("owner")).toBe(true);
    expect(isManagerOrOwner("manager")).toBe(true);
  });

  it("rejects agent with 403 (GET /api/users + imports use requireManager)", () => {
    expect(isManagerOrOwner("agent")).toBe(false);
    try {
      assertManagerRole(user("agent"));
      expect.fail("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).status).toBe(403);
      expect((e as AuthError).message).toMatch(/owners\/managers only/i);
    }
  });
});
