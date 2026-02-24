import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ShareView from "../../../src/client/components/ShareView";

describe("ShareView", () => {
  const defaultProps = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    passphrase: "test-pass-phrase-42",
    expiresIn: 3600,
    onReset: vi.fn(),
  };

  it("displays the share URL", () => {
    render(<ShareView {...defaultProps} />);
    expect(screen.getByText(/\/s\/550e8400/)).toBeInTheDocument();
  });

  it("displays the passphrase", () => {
    render(<ShareView {...defaultProps} />);
    expect(screen.getByText("test-pass-phrase-42")).toBeInTheDocument();
  });

  it("shows expiry time", () => {
    render(<ShareView {...defaultProps} />);
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("shows one-time warning", () => {
    render(<ShareView {...defaultProps} />);
    expect(
      screen.getByText(/can only be opened once/),
    ).toBeInTheDocument();
  });

  it("has copy buttons", () => {
    render(<ShareView {...defaultProps} />);
    const copyButtons = screen.getAllByText("Copy");
    expect(copyButtons.length).toBe(2);
  });
});
