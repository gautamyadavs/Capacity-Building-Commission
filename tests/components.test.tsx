import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { RunStore } from "../src/persistence";
import {
  beginCase,
  createRun,
  emptyReviewBundle,
  endRun,
  submitPhase,
} from "../src/model";
import { config, completeRun, response, reviewRecord } from "./helpers";
beforeEach(() => {
  localStorage.clear();
  window.location.hash = "/learner";
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function show(run = createRun(config), path = "/learner") {
  localStorage.setItem("bharat-kalp:/:v3:learner", JSON.stringify(run));
  window.location.hash = path;
  const store = new RunStore(config, localStorage, "/");
  render(<App config={config} store={store} />);
  return store;
}
describe("learner evidence flow", () => {
  it("D01/D05 gives neutral purpose, four cases and assistance without extra controls", () => {
    show();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Reasoning through governance decisions",
    );
    for (const a of config.cases)
      expect(screen.getByRole("heading", { name: a.title })).toBeVisible();
    expect(
      screen.getAllByText(/generative AI are allowed without penalty/)[0],
    ).toBeVisible();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/maximum words|countdown|confidence rating/),
    ).not.toBeInTheDocument();
  });
  it("D09 gates direct update routes and case review routes before initial submission", () => {
    show(
      beginCase(createRun(config), "A1"),
      "/learner/assessment/A1/stage/A.U",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "not available",
    );
    expect(
      screen.queryByText(config.cases[0].phases[1].facts[0]),
    ).not.toBeInTheDocument();
  });
  it("D02/D03 displays exact phase prompts and controlling facts", () => {
    show(
      beginCase(createRun(config), "A1"),
      "/learner/assessment/A1/stage/A.I",
    );
    for (const p of config.cases[0].phases[0].prompts) {
      expect(screen.getByLabelText(p.label)).toHaveAttribute(
        "aria-describedby",
      );
      expect(screen.getByText(p.text)).toBeVisible();
    }
    expect(
      screen.getByRole("table", { name: "People, resources and conditions" }),
    ).toBeVisible();
    expect(
      screen.getByRole("cell", { name: "600 for emergency redeployment" }),
    ).toBeVisible();
    expect(screen.getByText(config.cases[0].phases[0].facts[0])).toBeVisible();
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });
  it("D19 cancelling confirmation leaves draft and reveal boundary intact", async () => {
    const user = userEvent.setup(),
      store = show(
        beginCase(createRun(config), "A1"),
        "/learner/assessment/A1/stage/A.I",
      );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
    );
    await user.type(screen.getAllByRole("textbox")[0], "A concise choice");
    await user.click(
      screen.getByRole("button", { name: "Submit initial response →" }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("A concise choice");
    expect(
      store.getSnapshot().run.sessions.A1.revealedAt["A.U"],
    ).toBeUndefined();
  });
  it("D04 update references preserve current draft and exact initial response", async () => {
    let run = beginCase(createRun(config), "A1");
    run = submitPhase(
      run,
      "A1",
      "A.I",
      response(run, "A1", "A.I", "Original exact answer"),
    );
    const store = show(run, "/learner/assessment/A1/stage/A.U");
    const input = screen.getAllByRole("textbox")[0];
    fireEvent.change(input, { target: { value: "Update draft" } });
    expect(screen.queryByText("Original exact answer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submitted response" }));
    expect(screen.getAllByText("Original exact answer")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Initial facts" }));
    expect(screen.getByText(config.cases[0].phases[0].facts[0])).toBeVisible();
    expect(store.getSnapshot().run.sessions.A1.draft?.answers["A.P5"]).toBe(
      "Update draft",
    );
  });
  it("D11/D12 after A1, A2 or B1 there is no substantive coaching or personalised feedback", () => {
    const run = completeRun();
    delete run.sessions.B2.submitted["B.U"];
    run.sessions.B2.draft = response(run, "B2", "B.U");
    run.end = null;
    run.submissionSequence.pop();
    show(run, "/learner/review");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "still in progress",
    );
    expect(screen.queryByText(/Supported strength/)).not.toBeInTheDocument();
  });
  it("D10/D12 completed blanks remain Awaiting review and never Developing", () => {
    show(completeRun(""), "/learner/review");
    expect(screen.getAllByText(/Awaiting review/)).toHaveLength(1);
    expect(
      screen.getByText(/A1 · Flood response/).closest("details"),
    ).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(/A1 · Flood response/));
    expect(
      screen.getAllByText(/Evidence availability: Insufficient evidence/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Developing")).not.toBeInTheDocument();
    expect(screen.getByText(/No criterion performance levels/)).toBeVisible();
  });
  it("D10 explicit early end records phase opportunities", () => {
    show(
      endRun(beginCase(createRun(config), "A1"), "Test interruption"),
      "/learner/review",
    );
    expect(screen.getByText(/ENDED EARLY/)).toBeVisible();
    expect(
      screen.getAllByText(/Evidence availability: Not elicited/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Developing")).not.toBeInTheDocument();
  });
  it("D13/D14 renders actual differing primary/supplementary human feedback", async () => {
    const run = completeRun(),
      bundle = await emptyReviewBundle(run),
      r = reviewRecord(run);
    r.supplementary = [
      {
        ...structuredClone(r.primary),
        judgement: "Proficient",
        rationale: "Later evidence supports a stronger relationship.",
        evidence: [
          {
            phaseId: "A.U",
            promptId: "A.P5",
            location: "First paragraph",
            excerpt: "",
          },
        ],
      },
    ];
    bundle.records = [r];
    localStorage.setItem(
      `bharat-kalp:/:v3:learner:reviews:${run.runId}`,
      JSON.stringify(bundle),
    );
    show(run, "/learner/review");
    await waitFor(() => expect(screen.getByText("Emerging")).toBeVisible());
    expect(screen.getByText("Proficient")).toBeVisible();
    expect(
      screen.getByText(
        "Later supplementary evidence — initial judgement retained",
      ),
    ).toBeVisible();
    expect(screen.getAllByText(r.primary.strengthOrGap)).toHaveLength(2);
    expect(screen.getAllByText(r.primary.nextOpportunity)).toHaveLength(2);
  });
  it("D18 unreadable state exposes recovery without overwriting raw data", () => {
    localStorage.setItem("bharat-kalp:/:v3:learner", "broken");
    render(
      <App config={config} store={new RunStore(config, localStorage, "/")} />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "needs recovery",
    );
    expect(
      screen.getByRole("link", { name: "Open recovery and files" }),
    ).toBeVisible();
    expect(localStorage.getItem("bharat-kalp:/:v3:learner")).toBe("broken");
  });
});
