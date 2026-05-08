"use client";

import { ChangeEvent, DragEvent, useState, useRef } from "react";

type FileDropZoneProps = {
  fileName: string;
  onFileChange: (file: File | null, fileName: string) => void;
};

const FileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.6 }}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "var(--success)" }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default function FileDropZone({ fileName, onFileChange }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileChange(file, file.name);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file, file.name);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null, "");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const hasFile = fileName.length > 0;
  const zoneClasses = [
    "file-drop-zone",
    isDragOver && "drag-over",
    hasFile && "has-file",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div
        className={zoneClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          className="hidden"
          accept=".json,.yaml,.yml,.xml"
        />
        <div className="flex flex-col items-center gap-2">
          {hasFile ? <CheckIcon /> : <FileIcon />}
          {hasFile ? (
            <span className="file-name">
              {fileName}
              <button
                type="button"
                onClick={handleClear}
                className="ml-1 hover:opacity-70"
                aria-label="Clear file"
              >
                <XIcon />
              </button>
            </span>
          ) : (
            <p className="file-drop-zone-text">
              <strong>Drop a file here</strong> or click to browse
            </p>
          )}
        </div>
      </div>
    </div>
  );
}