import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssessmentApp } from "@/components/assessment-app";

describe("reviewer sample workflow", () => {
  it("opens results and renders exact multi-page highlight overlays", async () => {
    const { container } = render(<AssessmentApp />);
    fireEvent.click(screen.getByRole("button", { name: /explore a sample result/i }));

    expect(screen.getByText("Question & answer mapping")).toBeInTheDocument();
    expect(screen.getByText("Unmatched answers")).toBeInTheDocument();
    expect(screen.queryByText("No answer was mapped")).not.toBeInTheDocument();

    await waitFor(() => expect(container.querySelectorAll(".active-highlight")).toHaveLength(2));
    const first = container.querySelector<HTMLElement>(".active-highlight");
    expect(first).toHaveStyle({ left: "10%", width: "84%" });

    fireEvent.click(screen.getByRole("button", { name: /state newton's second law/i }));
    await waitFor(() => expect(container.querySelectorAll(".active-highlight")).toHaveLength(1));
  });
});
