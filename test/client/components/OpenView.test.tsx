import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OpenView from "../../../src/client/components/OpenView";

describe("OpenView", () => {
  const defaultProps = {
    secretId: "550e8400-e29b-41d4-a716-446655440000",
    onError: vi.fn(),
    onReset: vi.fn(),
  };

  it("renders passphrase input", () => {
    render(<OpenView {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter the passphrase...")).toBeInTheDocument();
  });

  it("shows the intro message", () => {
    render(<OpenView {...defaultProps} />);
    expect(screen.getByText("Someone sent you a secret.")).toBeInTheDocument();
  });

  it("disables Open button when passphrase is empty", () => {
    render(<OpenView {...defaultProps} />);
    const button = screen.getByRole("button", { name: "Open it" });
    expect(button).toBeDisabled();
  });

  it("enables Open button when passphrase has content", () => {
    render(<OpenView {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Enter the passphrase..."), {
      target: { value: "some-passphrase" },
    });
    const button = screen.getByRole("button", { name: "Open it" });
    expect(button).not.toBeDisabled();
  });

  it("shows one-shot warning message", () => {
    render(<OpenView {...defaultProps} />);
    expect(
      screen.getByText("Enter the passphrase to open it. You only get one shot."),
    ).toBeInTheDocument();
  });
});
