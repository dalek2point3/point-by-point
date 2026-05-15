import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { parseComments } from "@/lib/comment-parser";

describe("parseComments", () => {
  it("splits bundled editor, AE, and reviewer reports", () => {
    const sample = fs.readFileSync("tests/fixtures/all_reports_excerpt.txt", "utf8");
    const comments = parseComments("project-1", sample);

    expect(comments.some((comment) => comment.sourceLabel === "Associate Editor")).toBe(true);
    expect(comments.some((comment) => comment.sourceLabel === "Reviewer 1")).toBe(true);
    expect(comments.some((comment) => comment.sourceLabel === "Reviewer 3")).toBe(true);
    expect(comments.length).toBeGreaterThanOrEqual(7);
  });

  it("assigns higher difficulty to mechanism and identification concerns", () => {
    const sample = `Reviewer: 1
1. Diff-in-diff versus cross-sectional regressions. The identification strategy needs more transparent exposition and robustness.

2. What does quarter mean?`;
    const comments = parseComments("project-1", sample);

    expect(comments[0].difficulty).toBeGreaterThan(comments[1].difficulty);
    expect(comments[0].concernType).toBe("Methods and identification");
  });

  it("splits one original reviewer number into multiple substantive concerns", () => {
    const sample = `Reviewer: 1
1. Diff-in-diff versus cross-sectional regressions. When reading the paper I kept wondering whether the diff-in-diff strategy provides much additional information beyond a simple cross-sectional regression due to the fact that the pre-period is short and contributions levels are very low pre-seeding relative to the later years. The paper eventually addresses this issue in Section 3.3.3 amidst other robustness checks and reassuringly, cross-sectional estimates do not differ much from the diff-in-diff. I do feel that this point should at least be flagged much earlier. I did find that the diff-in-diff is slightly oversold early in the paper because the type of control for different pre-levels that we usually get out of such a framework really does not apply here. At the very least the nature of the short pre-period and how it relates to the diff-in-diff should be made clear earlier. It is also the case that the paper contains language that suggests that a cross-sectional approach would indeed be valid. More careful wording would be helpful.

2. What does quarter mean?`;
    const comments = parseComments("project-1", sample);

    const originalOne = comments.filter((comment) => comment.originalLocator?.startsWith("Reviewer 1 original comment 1"));
    expect(originalOne.length).toBeGreaterThan(1);
    expect(originalOne.every((comment) => comment.ordinal > 0)).toBe(true);
    expect(comments.some((comment) => comment.originalLocator === "Reviewer 1 original comment 2")).toBe(true);
  });
});
