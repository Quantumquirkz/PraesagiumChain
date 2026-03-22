import { describe, expect, it } from "vitest";
import {
  addressToGradient,
  detectCategory,
  formatEth,
  truncateAddress,
} from "./utils";

describe("formatEth", () => {
  it("formats whole ETH amounts", () => {
    expect(formatEth(BigInt("1000000000000000000"))).toBe("1.0 ETH");
  });

  it("formats fractional wei", () => {
    const half = BigInt("5") * BigInt("100000000000000000");
    expect(formatEth(half)).toMatch(/^0\.5/);
  });
});

describe("truncateAddress", () => {
  it("returns short form for long addresses", () => {
    const a = "0x1234567890abcdef1234567890abcdef12345678";
    expect(truncateAddress(a)).toBe("0x1234...5678");
  });

  it("returns input unchanged when too short", () => {
    expect(truncateAddress("0xabc")).toBe("0xabc");
  });
});

describe("addressToGradient", () => {
  it("returns a css gradient string", () => {
    const g = addressToGradient("0xabc");
    expect(g).toContain("linear-gradient");
  });
});

describe("detectCategory", () => {
  it("detects crypto keywords", () => {
    expect(detectCategory("Will ETH beat BTC this month?")).toBe("Crypto");
  });

  it("defaults to Other", () => {
    expect(detectCategory("Unknown obscure topic xyz")).toBe("Other");
  });
});
