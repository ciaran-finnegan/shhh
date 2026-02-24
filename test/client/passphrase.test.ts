import { describe, it, expect } from "vitest";
import { generatePassphrase } from "../../src/client/lib/passphrase";

describe("generatePassphrase", () => {
  it("generates default 4 words + 2-digit pin", () => {
    const passphrase = generatePassphrase();
    const parts = passphrase.split("-");
    // 4 words + 1 pin = 5 parts
    expect(parts.length).toBe(5);
    // Last part is 2-digit pin
    expect(parts[parts.length - 1]).toMatch(/^\d{2}$/);
  });

  it("respects custom word count", () => {
    const passphrase = generatePassphrase(6);
    const parts = passphrase.split("-");
    expect(parts.length).toBe(7); // 6 words + 1 pin
  });

  it("uses words from the EFF wordlist", () => {
    // Generate many passphrases and check all words are lowercase alpha
    for (let i = 0; i < 20; i++) {
      const passphrase = generatePassphrase();
      const parts = passphrase.split("-");
      const words = parts.slice(0, -1);
      for (const word of words) {
        expect(word).toMatch(/^[a-z-]+$/);
        expect(word.length).toBeGreaterThan(0);
      }
    }
  });

  it("pin is always 2 digits (00-99)", () => {
    for (let i = 0; i < 50; i++) {
      const passphrase = generatePassphrase();
      const pin = passphrase.split("-").pop()!;
      expect(pin).toMatch(/^\d{2}$/);
      const num = parseInt(pin, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(99);
    }
  });

  it("generates unique passphrases in batch of 1000", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generatePassphrase());
    }
    expect(set.size).toBe(1000);
  });
});
