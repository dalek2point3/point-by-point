"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { CommentEditor } from "@/components/CommentEditor";

const DynamicCommentEditor = dynamic(
  () => Promise.resolve(CommentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-ink/10 bg-white p-5 text-sm text-ink/65 shadow-sm">
        Loading response workspace...
      </div>
    )
  }
);

export function ClientCommentEditor(props: ComponentProps<typeof CommentEditor>) {
  return <DynamicCommentEditor {...props} />;
}
