"use client";

import { FileImage, FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED_TYPES, MAX_FILE_BYTES, validateFiles } from "@/lib/client/documents";

type Props = {
  id: string;
  title: string;
  accent: string;
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string | null) => void;
};

export function FileDropzone({ id, title, accent, files, onChange, onError }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const select = (incoming: File[]) => {
    const error = validateFiles(incoming);
    onError(error);
    if (!error) onChange(incoming);
  };

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""} ${files.length ? "has-file" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        select(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={input}
        id={id}
        type="file"
        hidden
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(event) => select(Array.from(event.target.files || []))}
      />
      {!files.length ? (
        <button className="dropzone-empty" type="button" onClick={() => input.current?.click()} aria-label={`Upload ${title}`}>
          <span className="upload-icon"><Upload /></span>
          <strong>Upload <em style={{ color: accent }}>{title}</em></strong>
          <small>PDF, PNG, JPG or WebP · Max {MAX_FILE_BYTES / 1024 / 1024}MB each</small>
          <span className="drop-hint">or drop files here</span>
        </button>
      ) : (
        <div className="selected-files">
          <div className="selected-list">
            {files.slice(0, 3).map((file) => (
              <div className="file-row" key={`${file.name}-${file.size}`}>
                {file.type === "application/pdf" ? <FileText /> : <FileImage />}
                <span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></span>
              </div>
            ))}
            {files.length > 3 && <small>+{files.length - 3} more files</small>}
          </div>
          <div className="file-actions">
            <button type="button" onClick={() => input.current?.click()}>Replace</button>
            <button type="button" aria-label={`Remove ${title}`} onClick={() => { onChange([]); onError(null); }}><X /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
