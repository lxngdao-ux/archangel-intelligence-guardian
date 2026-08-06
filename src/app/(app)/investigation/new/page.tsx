"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InvestigationType } from "@prisma/client";
import { InputMethodSelector } from "@/components/investigation/InputMethodSelector";
import { URLInput } from "@/components/investigation/URLInput";
import { TextPasteInput } from "@/components/investigation/TextPasteInput";
import { FileUpload } from "@/components/investigation/FileUpload";

const FILE_ACCEPT: Partial<Record<InvestigationType, string>> = {
  SCREENSHOT: "image/png,image/jpeg,image/webp",
  IMAGE: "image/png,image/jpeg,image/webp",
  PDF: "application/pdf",
};

const TEXT_PLACEHOLDER: Partial<Record<InvestigationType, string>> = {
  TEXT: "Paste the exact text you want checked…",
  WHATSAPP: "Paste the WhatsApp message, including any links it contains…",
};

export default function NewInvestigationPage() {
  const router = useRouter();
  const [type, setType] = useState<InvestigationType>("URL");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFileBased = type === "SCREENSHOT" || type === "PDF" || type === "IMAGE";
  const isTextBased = type === "TEXT" || type === "WHATSAPP";
  const canSubmit = type === "URL" ? url.trim().length > 0 : isTextBased ? text.trim().length > 0 : !!file;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      let fileIds: string[] | undefined;

      if (isFileBased && file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => null);
          throw new Error(data?.error?.message ?? "File upload failed.");
        }
        const uploaded = await uploadRes.json();
        fileIds = [uploaded.id];
      }

      const res = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          inputText: type === "URL" ? url.trim() : isTextBased ? text.trim() : undefined,
          fileIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Could not start the investigation.");
      }

      const investigation = await res.json();
      router.push(`/investigation/${investigation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">New investigation</h1>
      <p className="mt-1 text-sm text-ink-secondary">Choose what you want Guardian to look into.</p>

      <div className="mt-6">
        <InputMethodSelector value={type} onChange={setType} />
      </div>

      <div className="mt-6">
        {type === "URL" && <URLInput value={url} onChange={setUrl} />}
        {isTextBased && (
          <TextPasteInput value={text} onChange={setText} placeholder={TEXT_PLACEHOLDER[type] ?? ""} />
        )}
        {isFileBased && <FileUpload accept={FILE_ACCEPT[type] ?? ""} file={file} onChange={setFile} />}
      </div>

      {error && <p className="mt-4 text-sm text-risk">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="mt-6 w-full rounded-card bg-trust px-4 py-2.5 text-sm font-medium text-canvas transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Starting investigation…" : "Analyze"}
      </button>
    </div>
  );
}
