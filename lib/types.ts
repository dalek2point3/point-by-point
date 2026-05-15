export type DocumentRole = "original" | "revision" | "reports" | "notes" | "other";

export type ProjectMode = "revision_available" | "no_revision";

export type CommentSource = "editor" | "associate_editor" | "reviewer" | "unknown";

export type ResponseStatus = "not_started" | "drafting" | "needs_work" | "ready";

export type AiProvider = "openai" | "anthropic" | "openai_compatible";

export type UploadedDocument = {
  id: string;
  projectId: string;
  role: DocumentRole;
  fileName: string;
  mimeType: string;
  text: string;
  createdAt: string;
};

export type ReviewComment = {
  id: string;
  projectId: string;
  source: CommentSource;
  sourceLabel: string;
  ordinal: number;
  originalLocator?: string;
  title: string;
  body: string;
  difficulty: number;
  concernType: string;
  status: ResponseStatus;
  suggestedPoints: string[];
  response: string;
  notes: string;
  score: number | null;
  feedback: string[];
  updatedAt: string;
};

export type Project = {
  id: string;
  token: string;
  ownerName: string;
  ownerEmail: string;
  encryptedApiKey: string;
  aiProvider?: AiProvider;
  aiModel?: string;
  aiBaseUrl?: string;
  mode: ProjectMode;
  title: string;
  createdAt: string;
  updatedAt: string;
  documents: UploadedDocument[];
  comments: ReviewComment[];
  publishedTex?: string;
  publishedPdfUrl?: string;
};

export type ProjectSummary = {
  id: string;
  token: string;
  ownerName: string;
  ownerEmail: string;
  mode: ProjectMode;
  title: string;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  readyCount: number;
  averageScore: number | null;
};

export type AiSuggestionContext = {
  project: Project;
  comment: ReviewComment;
};
