import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { config } from "./helpers";
import reference from "../public/content/reviewer-reference.json";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
// Digests of the exact implementation projection transcribed from the six live
// Drive originals on 2026-10-05. Update only after a fresh authoritative read.
describe("KALP-ALIGN-05 live-source transcription", () => {
  it("D02/D03 retains all exact case titles, controlling facts, task text and prompts", () => {
    const projection = config.cases.map((a) => ({
      id: a.id,
      title: a.title,
      phases: a.phases.map((p) => ({
        id: p.id,
        facts: p.facts,
        briefingBlocks: p.briefingBlocks,
        task: p.task,
        prompts: p.prompts,
      })),
    }));
    expect(hash(projection)).toBe(
      "73a69d517e77a395b5f03fdaf6fb384395ae94c161fdb751b5fc5151fb943d10",
    );
  });
  it("D01 retains exact objectives and the live framework crosswalk", () => {
    expect(hash(config.objectives)).toBe(
      "6412d7dfaf08e9a1204f1db7cba816aaee74b167286fd5428d0c38f368d46aa4",
    );
  });
  it("D14 retains the ten exact criterion descriptors, boundaries and phase mappings", () => {
    expect(hash(config.criteria)).toBe(
      "e02f3f8e61fd1cafba2f8d50d083490f7bca94ee517d35a4d1ab6c0820edc507",
    );
  });
  it("preserves source identities and discloses authored reference status without practice tasks", () => {
    expect(reference.packageVersion).toBe(config.packageVersion);
    expect(reference.sources).toEqual(config.sources);
    expect(config.sources.map((s) => s.id)).toEqual([
      "1uEQpCgCZnsaWN2A47WJOM85nqP-4q2cXTY6EYHGY9IU",
      "1rlHVPj1ebs6HjJAWm2iQm_gGjp1GV7UOrQ_0drIIe8Y",
      "15e-IvwpU2gaKgwOGFr743qcdXPQ7VDj9PjVjoGxCiTg",
      "1xTYx5R4LCdXsV4MT0KkSUkZ_TkwDfhIVEAdKjtT7sEs",
      "1kzGTXPMnMSTuWUmwGvuPM0KWlgnzdWFbhnyQXmR1IVg",
      "1TEPo-hVVs4wFPZCuKl6sUq-MsCn-ZOGILnfp7OjMdgA",
    ]);
    expect(
      reference.illustrations.filter((s) =>
        /^Developing illustration:|^Emerging illustration:|^Proficient illustration:/.test(
          s,
        ),
      ),
    ).toHaveLength(30);
    expect(reference.notice).toContain("not complete case answers");
    expect(JSON.stringify(config)).not.toMatch(
      /"(?:maxWords|countdown|correctOptionId|confidence|selectedResponses)"\s*:/,
    );
  });
});
