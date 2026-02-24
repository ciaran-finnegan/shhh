import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SealView from "../../../src/client/components/SealView";

describe("SealView", () => {
  it("renders secret textarea and passphrase input", () => {
    render(<SealView onSealed={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByPlaceholderText("Paste your secret here...")).toBeInTheDocument();
    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
  });

  it("generates a passphrase by default", () => {
    render(<SealView onSealed={vi.fn()} onError={vi.fn()} />);
    const input = screen.getByLabelText("Passphrase") as HTMLInputElement;
    expect(input.value).toMatch(/.+-.+-.+-.+-\d{2}/);
  });

  it("disables Seal button when secret is empty", () => {
    render(<SealView onSealed={vi.fn()} onError={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Seal it" });
    expect(button).toBeDisabled();
  });

  it("enables Seal button when secret has content", () => {
    render(<SealView onSealed={vi.fn()} onError={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Paste your secret here..."), {
      target: { value: "my secret" },
    });
    const button = screen.getByRole("button", { name: "Seal it" });
    expect(button).not.toBeDisabled();
  });

  it("renders all TTL preset buttons", () => {
    render(<SealView onSealed={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("12h")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(screen.getByText("72h")).toBeInTheDocument();
  });

  it("regenerates passphrase on click", () => {
    render(<SealView onSealed={vi.fn()} onError={vi.fn()} />);
    const input = screen.getByLabelText("Passphrase") as HTMLInputElement;
    const original = input.value;
    fireEvent.click(screen.getByText("Regenerate"));
    expect(input.value).not.toBe(original);
  });
});
