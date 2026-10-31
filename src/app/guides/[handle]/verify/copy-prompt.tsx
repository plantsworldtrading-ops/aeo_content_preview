"use client";

import { useState } from "react";

export default function CopyPrompt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <>
      <div className="actions">
        <button className="primary" onClick={copy}>{copied ? "Copied" : "Copy for Perplexity"}</button>
        <a href="https://www.perplexity.ai/" target="_blank" rel="noreferrer">Open Perplexity</a>
      </div>
      <details className="claim">
        <summary>Show what gets copied ({text.split(/\s+/).length.toLocaleString()} words)</summary>
        <pre className="preview prompt">{text}</pre>
      </details>
    </>
  );
}
