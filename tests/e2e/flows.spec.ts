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
  await page.getByRole("button", { name: "Submit phase →" }).click();
  await page
    .getByRole("button", { name: "Submit and preserve", exact: true })
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
      for (const f of p.facts)
        await expect(page.getByText(f, { exact: true })).toBeVisible();
      expect(await page.getByRole("textbox").count()).toBe(p.prompts.length);
      if (p.kind === "initial") {
        await expect(
          page.getByText(a.phases[1].facts[0], { exact: true }),
        ).toHaveCount(0);
      }
      for (const f of p.prompts)
        await page
          .getByLabel(`${f.id} · ${f.label}`, { exact: true })
          .fill(
            `${a.id} ${f.id}: • A defensible narrative\nReasons and remaining uncertainty.`,
          );
      if (p.kind === "update") {
        await expect(
          page.getByText(a.phases[0].facts[0], { exact: true }),
        ).toBeVisible();
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
        page.getByText(/Criterion judgements await human review/),
      ).toBeVisible();
      await expect(page.locator("[data-review-id]")).toHaveCount(0);
    }
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Submissions and human review",
  );
  await expect(page.getByText("Awaiting review", { exact: true })).toHaveCount(
    20,
  );
  await expect(page.locator("[data-review-id]")).toHaveCount(0);
  await checkAxe(page);
  const run = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(run.actualSequence).toEqual(["A1", "A2", "B1", "B2"]);
  expect(run.submissionSequence).toHaveLength(8);
  expect(run.end.kind).toBe("complete");
  expect(run.config.taskVersion).toBe("KALP-ALIGN-04:03");
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
  const first = page.getByLabel("A.P1 · choose and compare", { exact: true });
  await first.focus();
  await page.keyboard.type("Keyboard draft");
  await page.reload();
  await expect(first).toHaveValue("Keyboard draft");
  await first.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Submit phase →" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Submit phase →" }),
  ).toBeFocused();
  await expect(first).toHaveValue("Keyboard draft");
  await submit(page);
  await expect(
    page.getByRole("heading", { name: "Updated decision", exact: true }),
  ).toBeVisible();
  await page.reload();
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
    await expect(
      page.getByText(config.cases[3].phases[0].facts[0], { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("B.P3 · interpret the evidence", { exact: true }),
    ).toHaveValue("Narrow draft");
    await checkAxe(page);
    const snapshot = await page.locator("main").ariaSnapshot();
    expect(snapshot).toContain('textbox "B.P3 · interpret the evidence"');
    expect(snapshot).toContain('heading "Case information"');
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
    .getByLabel("A.P1 · choose and compare", { exact: true })
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
  await page.getByRole("link", { name: "Human review", exact: true }).click();
  await page.getByLabel("Import ended diagnostic session").setInputFiles({
    name: "session.json",
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
    Storage.prototype.setItem = function () {
      throw new Error("Simulated failure");
    };
  });
  await page
    .getByLabel("A.P1 · choose and compare", { exact: true })
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
    page.getByLabel("A.P1 · choose and compare", { exact: true }),
  ).toHaveValue("Unsaved recovery draft");
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
    .getByLabel("A.P1 · choose and compare", { exact: true })
    .fill("Original from first tab");
  await page
    .getByLabel("A.P2 · citizen impacts and duties", { exact: true })
    .focus();
  await expect(
    other.getByLabel("A.P1 · choose and compare", { exact: true }),
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
  await page
    .getByLabel("A.P1 · choose and compare", { exact: true })
    .fill(long);
  await submit(page);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(stored.sessions.A1.submitted["A.I"].answers["A.P1"]).toBe(long);
  const reference = page
    .locator("summary")
    .filter({ hasText: "Initial facts and exact submitted response" });
  await reference.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(config.cases[0].phases[0].facts[0], { exact: true }),
  ).not.toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(config.cases[0].phases[0].facts[0], { exact: true }),
  ).toBeVisible();
  await page.getByLabel("A.P5 · justified update", { exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page
      .getByLabel("A.P6 · consequences of the update", { exact: true })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe("solid");
});

test("missing-evidence and uncertain human-review statuses with retained revision history", async ({
  page,
}) => {
  const run = completeRun("");
  await seed(page, run);
  await page.getByRole("link", { name: "Human review", exact: true }).click();
  await page
    .getByLabel("Import ended diagnostic session")
    .setInputFiles({
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
