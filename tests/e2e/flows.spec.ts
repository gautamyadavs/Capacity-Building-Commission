import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { config, completeRun } from "../helpers";
import { beginCase, createRun } from "../../src/model";
const base = "/Capacity-Building-Commission/";
const key = `bharat-kalp:${base}:v3:learner`;
async function seed(
  page: Page,
  run: ReturnType<typeof createRun>,
  route = "/learner",
) {
  await page.goto(`${base}#/learner`);
  await page.evaluate(
    ({ key, run }) => localStorage.setItem(key, JSON.stringify(run)),
    { key, run },
  );
  await page.goto(`${base}#${route}`);
  await page.reload();
}
async function submit(page: Page) {
  await page
    .getByRole("form", { name: "Phase response" })
    .getByRole("button", { name: /Submit initial response|Submit update/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Submit initial response|Submit update/ })
    .click();
}
async function checkAxe(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
}
async function reflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
test("all four cases and eight phase submissions under the actual Pages subpath", async ({
  page,
}) => {
  await page.goto(`${base}#/learner`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Reasoning through governance decisions",
  );
  await checkAxe(page);
  for (const a of config.cases) {
    await page.goto(`${base}#/learner/assessment/${a.id}`);
    await page.getByRole("button", { name: "Begin or resume case →" }).click();
    for (const p of a.phases) {
      await expect(
        page.getByRole("heading", { name: p.title, exact: true }),
      ).toBeVisible();
      for (const block of p.briefingBlocks || []) {
        if (block.type === "paragraph")
          await expect(
            page.getByText(block.text, { exact: true }),
          ).toBeVisible();
        else
          await expect(
            page.getByRole("table", { name: block.caption }),
          ).toBeVisible();
      }
      expect(await page.getByRole("textbox").count()).toBe(p.prompts.length);
      if (p.kind === "initial") {
        await expect(
          page.getByText(a.phases[1].facts[0], { exact: true }),
        ).toHaveCount(0);
      }
      for (const f of p.prompts)
        await page
          .getByLabel(f.label, { exact: true })
          .fill(
            `${a.id} ${f.id}: • A defensible narrative\nReasons and remaining uncertainty.`,
          );
      if (p.kind === "update") {
        await page
          .getByRole("button", { name: "Initial facts", exact: true })
          .click();
        await expect(
          page.getByText(a.phases[0].facts[0], { exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Submitted response", exact: true })
          .click();
        await expect(
          page.getByText(
            `${a.id} ${a.phases[0].prompts[0].id}: • A defensible narrative\nReasons and remaining uncertainty.`,
            { exact: true },
          ),
        ).toBeVisible();
      }
      await checkAxe(page);
      await submit(page);
    }
    if (a.id !== "B2") {
      await expect(
        page.getByRole("heading", { name: "Your cases", exact: true }),
      ).toBeVisible();
      await expect(page.locator("[data-review-id]")).toHaveCount(0);
    }
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Submissions and feedback",
  );
  await expect(page.getByText(/Awaiting review/)).toHaveCount(1);
  await expect(page.locator("details[data-format][open]")).toHaveCount(0);
  await expect(page.locator("[data-review-id]")).toHaveCount(0);
  await checkAxe(page);
  const run = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(run.actualSequence).toEqual(["A1", "A2", "B1", "B2"]);
  expect(run.submissionSequence).toHaveLength(8);
  expect(run.end.kind).toBe("complete");
  expect(run.config.taskVersion).toBe("KALP-ALIGN-05:03");
});
test("keyboard cancel/confirm, exact draft recovery and direct-route reveal guard", async ({
  page,
}) => {
  await seed(
    page,
    beginCase(createRun(config), "A1"),
    "/learner/assessment/A1/stage/A.U",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "not available",
  );
  await expect(
    page.getByText(config.cases[0].phases[1].facts[0], { exact: true }),
  ).toHaveCount(0);
  await page.goto(`${base}#/learner/assessment/A1/stage/A.I`);
  const first = page.getByLabel("Choose and compare", { exact: true });
  await first.focus();
  await page.keyboard.type("Keyboard draft");
  await page.reload();
  await expect(first).toHaveValue("Keyboard draft");
  await first.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Submit initial response →" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Submit initial response →" }),
  ).toBeFocused();
  await expect(first).toHaveValue("Keyboard draft");
  await submit(page);
  await expect(
    page.getByRole("heading", { name: "Update response", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Submitted response", exact: true })
    .click();
  await expect(page.getByText("Keyboard draft", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(2);
});
test("wide and narrow reference access, reflow and accessible names", async ({
  page,
}) => {
  const run = completeRun();
  run.end = null;
  delete run.sessions.B2.submitted["B.U"];
  run.sessions.B2.draft = {
    phaseId: "B.U",
    answers: { "B.P3": "Narrow draft", "B.P4": "" },
    updatedAt: new Date().toISOString(),
  };
  run.submissionSequence.pop();
  await seed(page, run, "/learner/assessment/B2/stage/B.U");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await reflow(page);
    const reference =
      width < 1100
        ? page.getByRole("dialog")
        : page.getByRole("complementary", { name: "Case reference" });
    if (width < 1100)
      await page.getByRole("button", { name: "View case information" }).click();
    await reference
      .getByRole("button", { name: "Initial facts", exact: true })
      .click();
    await expect(
      reference.getByText(config.cases[3].phases[0].facts[0], { exact: true }),
    ).toBeVisible();
    if (width < 1100)
      await page
        .getByRole("button", { name: "Close case information" })
        .click();
    await expect(
      page.getByLabel("Interpret the results", { exact: true }),
    ).toHaveValue("Narrow draft");
    await checkAxe(page);
    const snapshot = await page.locator("main").ariaSnapshot();
    expect(snapshot).toContain('textbox "Interpret the results"');
  }
  await page.screenshot({
    path: "test-results/narrow-update.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/wide-update.png",
    fullPage: true,
  });
});
test("early end retains drafts and missing opportunities without invented ratings", async ({
  page,
}) => {
  await seed(
    page,
    beginCase(createRun(config), "A1"),
    "/learner/assessment/A1/stage/A.I",
  );
  await page
    .getByLabel("Choose and compare", { exact: true })
    .fill("Draft retained for recovery");
  await page
    .getByRole("link", { name: "Diagnostic home", exact: true })
    .click();
  await page.getByRole("button", { name: "End diagnostic early" }).click();
  await page
    .getByRole("button", { name: "End diagnostic and preserve record" })
    .click();
  await expect(page.getByText(/ENDED EARLY/)).toBeVisible();
  await expect(
    page.getByText(/Evidence availability: Not elicited/),
  ).toHaveCount(15);
  await expect(page.getByText("Developing", { exact: true })).toHaveCount(0);
  const run = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(run.sessions.A1.draft.answers["A.P1"]).toBe(
    "Draft retained for recovery",
  );
  expect(run.end.incomplete).toHaveLength(20);
  await checkAxe(page);
});
test("human-review form export/import, supplementary attribution and immutable revision", async ({
  page,
}) => {
  const run = completeRun("Submitted reasons for software verification");
  await seed(page, run);
  await page
    .getByRole("link", { name: "Reviewer workspace", exact: true })
    .click();
  await page.getByLabel("Import ended diagnostic session").setInputFiles({
    name: "session.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(run)),
  });
  await page
    .getByRole("button", { name: "Preserve workspace and import" })
    .click();
  const reference = page.locator("details").filter({
    has: page.getByText("Authored illustrations and calibration reference", {
      exact: true,
    }),
  });
  await reference.locator("summary").click();
  await expect(
    reference.getByText(/Developing illustration:/).first(),
  ).toBeVisible();
  await reference.locator("summary").click();
  await page
    .getByText(
      "A1 · Flood response and essential movement: responses and criteria",
      { exact: true },
    )
    .click();
  await page
    .getByRole("button", { name: "Review A1 / A-R1", exact: true })
    .click();
  const form = page.getByRole("form", { name: "Criterion review" });
  await form
    .getByLabel("Reviewer name or identifier")
    .fill("Test human reviewer");
  const primary = form.getByRole("group", {
    name: "Initial primary judgement",
    exact: true,
  });
  await primary
    .getByLabel("Descriptive judgement or evidence status")
    .selectOption("Emerging");
  await primary
    .getByLabel("Precise location in response or missing opportunity")
    .fill("Whole initial A.P1 response");
  await primary
    .getByLabel(
      "Exact response excerpt (optional if precise location is given)",
    )
    .fill("Submitted reasons");
  await primary
    .getByLabel("Descriptor-based rationale")
    .fill(
      "The reasoning states a comparison but leaves a material trade-off unresolved.",
    );
  await primary
    .getByLabel(
      "Supported strength, unresolved reasoning link or evidence limitation",
    )
    .fill("The longer-horizon consequence needs explanation.");
  await primary
    .getByLabel("Relevant next opportunity or further review (where available)")
    .fill(
      "A fresh elicitation about the consequence would provide more evidence.",
    );
  await form
    .getByLabel(
      "Record later supplementary evidence; keep initial judgement visible",
    )
    .check();
  const later = form.getByRole("group", {
    name: "Later supplementary evidence",
    exact: true,
  });
  await later
    .getByLabel("Descriptive judgement or evidence status")
    .selectOption("Proficient");
  await later
    .getByLabel("Precise location in response or missing opportunity")
    .fill("Update A.P5 response");
  await later
    .getByLabel("Descriptor-based rationale")
    .fill(
      "Later evidence explains the revised preference while preserving the initial judgement.",
    );
  await later
    .getByLabel(
      "Supported strength, unresolved reasoning link or evidence limitation",
    )
    .fill("The consequence is explained in later evidence.");
  await checkAxe(page);
  await form.getByRole("button", { name: "Save human review record" }).click();
  await page
    .getByRole("button", { name: "Save review record", exact: true })
    .click();
  await expect(page.locator("[data-review-id]")).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export saved human reviews" })
    .click();
  const download = await downloadPromise,
    path = await download.path();
  expect(path).toBeTruthy();
  const bundle = JSON.parse(await readFile(path!, "utf8"));
  expect(bundle.records[0].primary.judgement).toBe("Emerging");
  expect(bundle.records[0].supplementary[0].judgement).toBe("Proficient");
  await page.getByRole("link", { name: "Return to learner workspace" }).click();
  await page.goto(`${base}#/learner/review`);
  await page.getByLabel("Import human-review feedback").setInputFiles(path!);
  await expect(page.locator("[data-review-id]")).toHaveCount(1);
  await expect(
    page.getByText("Initial primary judgement", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Later supplementary evidence — initial judgement retained",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Emerging", { exact: true })).toBeVisible();
  await expect(page.getByText("Proficient", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-review-id]")).toHaveCount(1);
  await checkAxe(page);
  await page.screenshot({
    path: "test-results/human-feedback-wide.png",
    fullPage: true,
  });
});
test("save failure stays truthful and retry preserves work without reveal", async ({
  page,
}) => {
  await seed(
    page,
    beginCase(createRun(config), "A1"),
    "/learner/assessment/A1/stage/A.I",
  );
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, "restoreTestStorage", {
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function () {
      throw new Error("Simulated failure");
    };
  });
  await page
    .getByLabel("Choose and compare", { exact: true })
    .fill("Unsaved recovery draft");
  await expect(
    page.getByRole("status").filter({ hasText: "Not saved" }),
  ).toBeVisible();
  await expect(
    page.getByText(/could not be saved|Simulated failure/).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download current session and drafts" }),
  ).toBeVisible();
  await expect(
    page.getByText(config.cases[0].phases[1].facts[0], { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Choose and compare", { exact: true }),
  ).toHaveValue("Unsaved recovery draft");
  await page.screenshot({
    path: "test-results/save-failure.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    (
      window as unknown as { restoreTestStorage: () => void }
    ).restoreTestStorage();
  });
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Choose and compare", { exact: true }),
  ).toHaveValue("Unsaved recovery draft");
  await expect(
    page.getByText(config.cases[0].phases[1].facts[0], { exact: true }),
  ).toHaveCount(0);
});
test("cross-tab submission and new-session safeguards", async ({
  page,
  context,
}) => {
  await seed(
    page,
    beginCase(createRun(config), "A1"),
    "/learner/assessment/A1/stage/A.I",
  );
  const other = await context.newPage();
  await other.goto(`${base}#/learner/assessment/A1/stage/A.I`);
  await page
    .getByLabel("Choose and compare", { exact: true })
    .fill("Original from first tab");
  await page.getByLabel("Citizen impacts and duties", { exact: true }).focus();
  await expect(
    other.getByLabel("Choose and compare", { exact: true }),
  ).toHaveValue("Original from first tab");
  await submit(page);
  await expect(
    other.getByText("Original from first tab", { exact: true }),
  ).toBeVisible();
  await expect(other.getByRole("textbox")).toHaveCount(0);
  await page.goto(`${base}#/learner/files`);
  await page
    .getByRole("button", { name: "Start a new diagnostic", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preserve previous and start new" })
    .click();
  await expect(other.getByRole("heading", { level: 1 })).toContainText(
    "not available",
  );
});

test("long response acceptance and keyboard reference disclosure", async ({
  page,
}) => {
  await seed(
    page,
    beginCase(createRun(config), "A1"),
    "/learner/assessment/A1/stage/A.I",
  );
  const long = "Reasons and uncertainty. ".repeat(2000);
  await page.getByLabel("Choose and compare", { exact: true }).fill(long);
  await submit(page);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(stored.sessions.A1.submitted["A.I"].answers["A.P1"]).toBe(long);
  const reference = page.getByRole("button", {
    name: "Initial facts",
    exact: true,
  });
  await reference.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(config.cases[0].phases[0].facts[0], { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New information", exact: true })
    .click();
  await expect(
    page.getByText(config.cases[0].phases[0].facts[0], { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Review your decision", { exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page
      .getByLabel("Explain the consequences", { exact: true })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe("solid");
});

test("missing-evidence and uncertain human-review statuses with retained revision history", async ({
  page,
}) => {
  const run = completeRun("");
  await seed(page, run);
  await page
    .getByRole("link", { name: "Reviewer workspace", exact: true })
    .click();
  await page.getByLabel("Import ended diagnostic session").setInputFiles({
    name: "blank-session.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(run)),
  });
  await page
    .getByRole("button", { name: "Preserve workspace and import" })
    .click();
  await page
    .getByText(
      "A1 · Flood response and essential movement: responses and criteria",
      { exact: true },
    )
    .click();
  await page
    .getByRole("button", { name: "Review A1 / A-R1", exact: true })
    .click();
  const form = page.getByRole("form", { name: "Criterion review" });
  await form
    .getByLabel("Reviewer name or identifier")
    .fill("Human review software test");
  await form
    .getByLabel("Descriptive judgement or evidence status")
    .selectOption("Insufficient evidence");
  await form
    .getByLabel("Precise location in response or missing opportunity")
    .fill("All initial response fields are blank");
  await form
    .getByLabel("Descriptor-based rationale")
    .fill(
      "No comparative reasoning is available in any submitted initial field.",
    );
  await form
    .getByLabel(
      "Supported strength, unresolved reasoning link or evidence limitation",
    )
    .fill(
      "The evidence does not reveal the criterion; no deficit is inferred.",
    );
  await form
    .getByLabel("Relevant next opportunity or further review (where available)")
    .fill(
      "Arrange a fresh elicitation of a comparative choice under recorded support.",
    );
  await form.getByRole("button", { name: "Save human review record" }).click();
  await page
    .getByRole("button", { name: "Save review record", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Record a revision of A1 / A-R1",
      exact: true,
    })
    .click();
  await form
    .getByLabel("Descriptive judgement or evidence status")
    .selectOption("");
  await form.getByLabel("Review status").selectOption("Uncertain");
  await form
    .getByLabel("Competing interpretations requiring review")
    .fill(
      "Raters disagree whether a technical issue prevented elicitation or an available opportunity was left blank.",
    );
  await form
    .getByLabel("Relevant next opportunity or further review (where available)")
    .fill(
      "Seek independent review of the technical record before any interpretation.",
    );
  await form.getByRole("button", { name: "Save human review record" }).click();
  await page
    .getByRole("button", { name: "Save review record", exact: true })
    .click();
  await expect(page.locator("[data-review-id]")).toHaveCount(2);
  await expect(
    page.getByText("Insufficient evidence", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No defensible level selected", { exact: true }),
  ).toBeVisible();
  const workspace = await page.evaluate(
    (base) =>
      JSON.parse(localStorage.getItem(`bharat-kalp:${base}:v3:reviewer`)!),
    base,
  );
  expect(workspace.bundle.records[1].supersedes).toBe(
    workspace.bundle.records[0].id,
  );
  expect(workspace.bundle.records[1].primary.reviewStatus).toBe("Uncertain");
  await checkAxe(page);
  await page.setViewportSize({ width: 320, height: 1000 });
  await reflow(page);
  await checkAxe(page);
});

test("B2-first case choice, interleaved drafts, latest resume and different completion order", async ({
  page,
}) => {
  await page.goto(`${base}#/learner`);
  const card = (id: string) =>
    page.getByRole("article").filter({
      has: page.getByRole("heading", {
        name: config.cases.find((a) => a.id === id)!.title,
        exact: true,
      }),
    });
  await card("B2").getByRole("button", { name: "Start case →" }).click();
  await page
    .getByLabel("Explain the causes", { exact: true })
    .fill("B2 draft preserved across cases");
  await page
    .getByRole("link", { name: "Diagnostic home", exact: true })
    .click();
  await card("A2").getByRole("button", { name: "Start case →" }).click();
  await page
    .getByLabel("Choose and compare", { exact: true })
    .fill("A2 independent draft");
  await page.reload();
  await page
    .getByRole("link", { name: "Diagnostic home", exact: true })
    .click();
  await page.getByRole("link", { name: "Resume diagnostic →" }).click();
  await expect(page).toHaveURL(/A2\/stage\/A.I$/);
  await expect(
    page.getByLabel("Choose and compare", { exact: true }),
  ).toHaveValue("A2 independent draft");
  await page
    .getByRole("link", { name: "Diagnostic home", exact: true })
    .click();
  await card("B2").getByRole("button", { name: "Resume case →" }).click();
  await expect(
    page.getByLabel("Explain the causes", { exact: true }),
  ).toHaveValue("B2 draft preserved across cases");
  await expect(
    page.getByRole("table", { name: "Reported results" }),
  ).toHaveCount(0);
  await submit(page);
  await expect(
    page.getByRole("table", { name: "Reported results" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Diagnostic home", exact: true })
    .click();
  await card("A2").getByRole("button", { name: "Resume case →" }).click();
  await submit(page);
  await submit(page);
  await expect(
    page.getByRole("heading", { name: "Your cases", exact: true }),
  ).toBeVisible();
  for (const id of ["B1", "A1", "B2"]) {
    await card(id)
      .getByRole("button", {
        name: id === "B2" ? "Resume case →" : "Start case →",
      })
      .click();
    if (id !== "B2") await submit(page);
    await submit(page);
    if (id !== "B2")
      await expect(
        page.getByRole("heading", { name: "Your cases", exact: true }),
      ).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Submissions and feedback",
  );
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(saved.actualSequence).toEqual(["B2", "A2", "B1", "A1"]);
  expect(
    saved.submissionSequence
      .slice(0, 3)
      .map(
        (r: { caseId: string; phaseId: string }) => `${r.caseId}/${r.phaseId}`,
      ),
  ).toEqual(["B2/B.I", "A2/A.I", "A2/A.U"]);
  expect(saved.sessions.B2.submitted["B.I"].answers["B.P1"]).toBe(
    "B2 draft preserved across cases",
  );
  expect(saved.end.kind).toBe("complete");
});

test("mobile reference dialog returns focus and writing position with drafts intact", async ({
  page,
}) => {
  const run = completeRun();
  run.end = null;
  delete run.sessions.B2.submitted["B.U"];
  run.submissionSequence.pop();
  run.sessions.B2.draft = {
    phaseId: "B.U",
    answers: { "B.P3": "", "B.P4": "" },
    updatedAt: new Date().toISOString(),
  };
  await seed(page, run, "/learner/assessment/B2/stage/B.U");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const input = page.getByLabel("Interpret the results", { exact: true });
    await input.fill(`Draft at ${width}px`);
    const control = page.getByRole("button", { name: "View case information" });
    await control.focus();
    const position = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "Close case information" }),
    ).toBeFocused();
    await dialog
      .getByRole("button", { name: "Submitted response", exact: true })
      .click();
    await expect(
      dialog.getByText("A defensible response with reasons", { exact: true }),
    ).toHaveCount(2);
    await checkAxe(page);
    await reflow(page);
    await page.keyboard.press("Escape");
    await expect(control).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(position);
    await expect(input).toHaveValue(`Draft at ${width}px`);
  }
});

test("older captured sessions retain fixed progression and paragraph briefing", async ({
  page,
}) => {
  const captured = JSON.parse(
    await readFile("tests/fixtures/kalp-align-04.json", "utf8"),
  );
  const old = beginCase(createRun(captured), "A1");
  await seed(page, old, "/learner/assessment/A1/stage/A.I");
  await expect(
    page.getByText(captured.cases[0].phases[0].facts[1], { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Diagnostic home", exact: true })
    .click();
  await expect(
    page.getByText("Complete the preceding case to continue."),
  ).toHaveCount(3);
  const restored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(restored.config).toEqual(captured);
  await checkAxe(page);
});

test("learner backup, cancelled restore and corrupt-storage recovery preserve archives", async ({
  page,
}) => {
  await seed(
    page,
    beginCase(createRun(config), "B2"),
    "/learner/assessment/B2/stage/B.I",
  );
  await page
    .getByLabel("Explain the causes", { exact: true })
    .fill("Backup draft — exact line\nSecond line.");
  await page
    .getByRole("link", { name: "Recovery and files", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Back up", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Download current session and drafts",
      exact: true,
    })
    .click();
  const backupPath = await (await downloadPromise).path();
  const backup = JSON.parse(await readFile(backupPath!, "utf8"));
  expect(backup.sessions.B2.draft.answers["B.P1"]).toBe(
    "Backup draft — exact line\nSecond line.",
  );
  await page.screenshot({ path: "test-results/recovery.png", fullPage: true });
  await page
    .getByRole("button", { name: "Start a new diagnostic", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).runId,
      key,
    ),
  ).toBe(backup.runId);
  await page
    .getByRole("button", { name: "Start a new diagnostic", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Preserve previous and start new",
      exact: true,
    })
    .click();
  const newId = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).runId,
    key,
  );
  expect(newId).not.toBe(backup.runId);
  await page
    .getByRole("link", { name: "Recovery and files", exact: true })
    .click();
  await page
    .getByLabel("Import a captured diagnostic session", { exact: true })
    .setInputFiles(backupPath!);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).runId,
      key,
    ),
  ).toBe(newId);
  await page
    .getByLabel("Import a captured diagnostic session", { exact: true })
    .setInputFiles(backupPath!);
  await page
    .getByRole("button", { name: "Archive current and import", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Resume diagnostic →", exact: true })
    .click();
  await expect(
    page.getByLabel("Explain the causes", { exact: true }),
  ).toHaveValue("Backup draft — exact line\nSecond line.");
  await page.evaluate(
    (key) => localStorage.setItem(key, "malformed original data"),
    key,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Saved progress needs recovery",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    "malformed original data",
  );
  await page
    .getByRole("link", { name: "Open recovery and files", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Download all preserved browser data",
      exact: true,
    }),
  ).toBeVisible();
  const recoveryPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Download all preserved browser data",
      exact: true,
    })
    .click();
  const recoveryPath = await (await recoveryPromise).path();
  const recovery = JSON.parse(await readFile(recoveryPath!, "utf8"));
  expect(Object.values(recovery)).toContain("malformed original data");
  expect(
    Object.values(recovery).some(
      (raw) => typeof raw === "string" && raw.includes(backup.runId),
    ),
  ).toBe(true);
  await checkAxe(page);
  await page
    .getByRole("button", { name: "Start a new diagnostic", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Preserve previous and start new",
      exact: true,
    })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Reasoning through governance decisions",
  );
  const preserved = await page.evaluate(() => Object.values(localStorage));
  expect(preserved).toContain("malformed original data");
});
