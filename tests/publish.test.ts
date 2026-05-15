import { describe, expect, it } from "vitest";
import { buildLatex } from "@/lib/publish";
import type { Project } from "@/lib/types";

describe("buildLatex", () => {
  it("uses boxed question/response template formatting", () => {
    const project: Project = {
      id: "p1",
      token: "token",
      ownerName: "Author Name",
      ownerEmail: "author@example.com",
      encryptedApiKey: "encrypted",
      mode: "revision_available",
      title: "A Test Manuscript",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      documents: [],
      comments: [
        {
          id: "c1",
          projectId: "p1",
          source: "reviewer",
          sourceLabel: "Reviewer 1",
          ordinal: 1,
          originalLocator: "Reviewer 1 original comment 2a",
          title: "Clarify identification",
          body: "Please clarify the identification strategy.",
          difficulty: 4,
          concernType: "Methods and identification",
          status: "drafting",
          suggestedPoints: [],
          response: "We clarified the identification strategy in Section 3.",
          notes: "",
          score: null,
          feedback: [],
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    };

    const tex = buildLatex(project);

    expect(tex).toContain("\\usepackage{pbyp}");
    expect(tex).toContain("\\Large\\bfseries Point by Point: Response to Reviewers");
    expect(tex).toContain("\\section*{Reviewer 1 Comments}");
    expect(tex).toContain("\\begin{question}{\\QuestionRevA{Q1}}\\label{R1:Q1}");
    expect(tex).toContain("Original location: Reviewer 1 original comment 2a");
    expect(tex).toContain("\\begin{response}");
  });

  it("does not emit macros missing from the real pbyp style file", () => {
    const project: Project = {
      id: "p1",
      token: "token",
      ownerName: "Author Name",
      ownerEmail: "author@example.com",
      encryptedApiKey: "encrypted",
      mode: "revision_available",
      title: "A Test Manuscript",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      documents: [],
      comments: [
        {
          id: "c1",
          projectId: "p1",
          source: "editor",
          sourceLabel: "Department Editor",
          ordinal: 1,
          originalLocator: "Department Editor",
          title: "Clarify identification",
          body: "Please clarify the identification strategy.",
          difficulty: 4,
          concernType: "Methods and identification",
          status: "drafting",
          suggestedPoints: [],
          response: "We clarified the identification strategy in Section 3.",
          notes: "",
          score: null,
          feedback: [],
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    };

    const tex = buildLatex(project);

    expect(tex).not.toContain("\\QuestionRevEditor");
    expect(tex).toContain("\\QuestionRevAE{Editor Q1}");
  });
});
