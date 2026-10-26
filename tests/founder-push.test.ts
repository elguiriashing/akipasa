import {describe,expect,it} from "vitest";
import {claimPushUrl,founderPushEnabled,founderUserIds} from "../src/lib/founder-push";

const alex="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const andrew="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
describe("founder-only push authorization",()=>{
  it("defaults off",()=>expect(founderPushEnabled({})).toBe(false));
  it("rejects malformed founders and duplicates",()=>{
    expect([...founderUserIds("bad,"+alex+","+alex+","+andrew)]).toEqual([alex,andrew]);
  });
  it("requires BOTH the enable flag and configured founder UUID",()=>{
    expect(founderPushEnabled({AKIPASA_PUSH_ENABLED:"true"})).toBe(false);
    expect(founderPushEnabled({AKIPASA_PUSH_ENABLED:"false",AKIPASA_PUSH_FOUNDER_IDS:alex})).toBe(false);
    expect(founderPushEnabled({AKIPASA_PUSH_ENABLED:"true",AKIPASA_PUSH_FOUNDER_IDS:alex})).toBe(true);
  });
  it("does not accept arbitrary notification link targets",()=>{
    expect(claimPushUrl(alex)).toContain("queue=claims&claim="+alex);
    expect(()=>claimPushUrl("https://evil.test")).toThrow();
  });
});
