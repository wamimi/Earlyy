import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authenticated, body, failure } from "../src/lib/early/http";
const auth=vi.hoisted(()=>vi.fn());
vi.mock("../src/lib/privy-server",()=>({authenticatePrivyRequest:auth}));
it("rejects cross-origin mutations before authenticating",async()=>{
  vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost:3000");auth.mockReset();
  await expect(authenticated(new NextRequest("http://localhost:3000/api/early/rules",{method:"POST",headers:{origin:"https://attacker.example"}}),{wallet:"0x0000000000000000000000000000000000000001"})).rejects.toMatchObject({code:"ORIGIN_FORBIDDEN"});
  expect(auth).not.toHaveBeenCalled();
});
it("uses server-authenticated user identity, never a supplied user ID",async()=>{
  vi.stubEnv("NEXT_PUBLIC_APP_URL","http://localhost:3000");auth.mockResolvedValue({user_id:"real-user",wallet:"wallet"});
  const result=await authenticated(new NextRequest("http://localhost:3000/api/early/rules",{method:"POST",headers:{origin:"http://localhost:3000"}}),{wallet:"0x0000000000000000000000000000000000000001",user_id:"attacker"});
  expect(result.user_id).toBe("real-user");
});
it("limits callback bodies and rejects malformed JSON",async()=>{
  await expect(body(new Request("http://localhost",{method:"POST",headers:{"Content-Type":"application/json"},body:"{"}))).rejects.toMatchObject({code:"INVALID_JSON"});
  await expect(body(new Request("http://localhost",{method:"POST",headers:{"Content-Type":"application/json"},body:"x".repeat(1048577)}))).rejects.toMatchObject({code:"BODY_TOO_LARGE"});
});
it("never returns SDK, proof or database error details",async()=>{
  const response=failure(new Error("cookie=private; proof=private"));expect(JSON.stringify(await response.json())).not.toContain("private");
});
