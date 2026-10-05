import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
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
  it("keeps draft-conflict notices actionable while design notices stay in facilitator tools", () => {
    const captured = structuredClone(config);
    captured.packageVersion = "Earlier captured design";
    const run = beginCase(createRun(captured), "A1");
    const store = show(run, "/learner/assessment/A1/stage/A.I");
    expect(screen.queryByText(/current release has newer content/)).not.toBeInTheDocument();
    const stale = structuredClone(store.getSnapshot().run.sessions.A1.draft!);
    stale.updatedAt = "2000-01-01T00:00:00.000Z";
    act(() => store.edit("A1", stale));
    expect(screen.getByText(/draft changed in another tab/)).toBeVisible();
    expect(store.getSnapshot().run.config).toEqual(captured);
  });
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
  it("D10/D12 completed blanks show one pending message without invented profiles", () => {
    show(completeRun(""), "/learner/review");
    expect(screen.getAllByText(/Awaiting review/)).toHaveLength(1);
    expect(screen.queryByText("Developing")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Evidence availability|No human-review record/),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-review-id]")).toHaveLength(0);
    expect(
      document.querySelectorAll("details[data-format][open]"),
    ).toHaveLength(0);
  });
  it("D10 early ending preserves incomplete opportunities in the record", () => {
    const run = endRun(beginCase(createRun(config), "A1"), "Test interruption");
    show(run, "/learner/review");
    expect(screen.getByText(/You ended this session early/)).toBeVisible();
    expect(run.end!.incomplete).toHaveLength(20);
    expect(screen.queryByText("Developing")).not.toBeInTheDocument();
    expect(screen.queryByText(/A\.P1|A-R1/)).not.toBeInTheDocument();
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
        "After new information — your initial feedback is retained",
      ),
    ).toBeVisible();
    expect(screen.getAllByText(r.primary.strengthOrGap)).toHaveLength(2);
    expect(
      screen.getAllByText(r.primary.nextOpportunity, { exact: false }),
    ).toHaveLength(2);
  });
  it("D18 unreadable state exposes recovery without overwriting raw data", () => {
    localStorage.setItem("bharat-kalp:/:v3:learner", "broken");
    render(
      <App config={config} store={new RunStore(config, localStorage, "/")} />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "could not be opened",
    );
    expect(screen.getByText(/ask the facilitator for help/)).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /recovery/i }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("bharat-kalp:/:v3:learner")).toBe("broken");
  });
  it("keeps administration and internal codes out of the learner home", () => {
    show();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /Reviewer workspace|Recovery and files/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /General objectives|Design and source|Access or support/,
      ),
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /\b(?:[AB][12]|[AB]-LO\d|[AB]-R\d|[AB]\.P\d|KALP-ALIGN)\b/,
    );
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
  it("opens the first case with actual feedback, supports all twenty current judgements and keeps metadata private to facilitators", async () => {
    const run = completeRun(),
      bundle = await emptyReviewBundle(run);
    bundle.records = run.config.cases.flatMap((a) =>
      run.config.criteria
        .filter((c) => c.id.startsWith(a.set))
        .map((c) => reviewRecord(run, a.id, c.id)),
    );
    localStorage.setItem(
      `bharat-kalp:/:v3:learner:reviews:${run.runId}`,
      JSON.stringify(bundle),
    );
    show(run, "/learner/review");
    await waitFor(() =>
      expect(document.querySelectorAll("[data-review-id]")).toHaveLength(20),
    );
    const opened = document.querySelectorAll("details[data-format][open]");
    expect(opened).toHaveLength(1);
    expect(opened[0]).toHaveTextContent(
      "Flood response and essential movement",
    );
    expect(document.body.textContent).not.toMatch(
      /\b(?:[AB][12]|[AB]-LO\d|[AB]-R\d|[AB]\.P\d|[AB]\.[IU]|KALP-ALIGN)\b/,
    );
    expect(
      screen.queryByText("Reviewer, version and criterion details"),
    ).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
  it("shows current independent reviews and disagreement while preserving revision history and exact learner quotations", async () => {
    const run = completeRun("I wrote A.P1 and A-R1 in my response."),
      bundle = await emptyReviewBundle(run);
    const original = reviewRecord(run),
      revised = structuredClone(original),
      independent = structuredClone(original);
    original.primary.rationale = "Superseded reviewer explanation";
    revised.id = crypto.randomUUID();
    revised.supersedes = original.id;
    revised.primary.rationale = "A.P1 supports A-R1.";
    independent.id = crypto.randomUUID();
    independent.reviewer = "Independent reviewer";
    independent.primary.judgement = "Proficient";
    bundle.records = [original, revised, independent];
    localStorage.setItem(
      `bharat-kalp:/:v3:learner:reviews:${run.runId}`,
      JSON.stringify(bundle),
    );
    show(run, "/learner/review");
    await waitFor(() =>
      expect(document.querySelectorAll("[data-review-id]")).toHaveLength(2),
    );
    expect(
      screen.getByText(/Reviewers reached different judgements/),
    ).toBeVisible();
    expect(
      screen.getByText("Choose and compare supports Comparing options."),
    ).toBeVisible();
    expect(
      screen.queryByText("Superseded reviewer explanation"),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll("blockquote")[0]).toHaveTextContent(
      "I wrote A.P1 and A-R1 in my response.",
    );
    expect(
      JSON.parse(
        localStorage.getItem(`bharat-kalp:/:v3:learner:reviews:${run.runId}`)!,
      ).records,
    ).toHaveLength(3);
  });
  it("opens partial feedback in the reviewed case and explains missing evidence and uncertainty without inventing levels", async () => {
    const run = completeRun(""),
      bundle = await emptyReviewBundle(run);
    const missing = reviewRecord(run, "B2", "B-R1"),
      uncertain = reviewRecord(run, "B2", "B-R2");
    missing.primary.judgement = "Insufficient evidence";
    uncertain.primary.judgement = null;
    uncertain.primary.reviewStatus = "Uncertain";
    uncertain.primary.competingInterpretations =
      "A technical interruption may have prevented a response; an available opportunity may have been left blank.";
    bundle.records = [missing, uncertain];
    localStorage.setItem(
      `bharat-kalp:/:v3:learner:reviews:${run.runId}`,
      JSON.stringify(bundle),
    );
    show(run, "/learner/review");
    await waitFor(() =>
      expect(
        screen.getByText(/This feedback needs a further review/),
      ).toBeVisible(),
    );
    expect(
      document.querySelector("details[data-format][open]"),
    ).toHaveTextContent("Grievance closure and service resolution");
    expect(screen.getByText(/do not yet give enough evidence/)).toBeVisible();
    expect(document.querySelectorAll("[data-review-id]")).toHaveLength(2);
    expect(screen.queryByText("Developing")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/No human-review record/),
    ).not.toBeInTheDocument();
  });
  it("provides export, feedback import and source information on the direct facilitator route", () => {
    show(completeRun(), "/learner/files");
    expect(
      screen.getByRole("button", { name: "Export session for review" }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Import human-review feedback"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Session design and source information"),
    ).toBeVisible();
    expect(screen.getByLabelText("Access or support condition")).toBeDisabled();
  });
});
