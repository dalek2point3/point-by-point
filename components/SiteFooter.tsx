export function SiteFooter({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  const className =
    variant === "inline"
      ? "text-sm text-ink/65"
      : "border-t border-ink/10 px-5 py-5 text-center text-sm text-ink/55";

  return (
    <footer className={className}>
      made with ❤️ by{" "}
      <a className="font-semibold text-moss underline-offset-4 hover:underline" href="https://abhishekn.com" target="_blank" rel="noreferrer">
        abhishek
      </a>{" "}
      in sunset, san francisco.
    </footer>
  );
}
