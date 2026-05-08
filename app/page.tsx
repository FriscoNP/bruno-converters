"use client";

import { useEffect, useState } from "react";
import { load as parseYaml } from "js-yaml";
import insomniaToBruno from "@usebruno/converters/src/insomnia/insomnia-to-bruno";
import openApiToBruno from "@usebruno/converters/src/openapi/openapi-to-bruno";
import wsdlToBruno from "@usebruno/converters/src/wsdl/wsdl-to-bruno";
import Header from "./components/Header";
import FileDropZone from "./components/FileDropZone";

import type { SourceType, Theme } from "./types";

const sourceOptions: Array<{ label: string; value: SourceType }> = [
  { label: "Postman collection", value: "postman" },
  { label: "Insomnia collection", value: "insomnia" },
  { label: "OpenAPI (JSON or YAML)", value: "openapi" },
  { label: "WSDL", value: "wsdl" },
];

function readSpecObject(rawInput: string, sourceType: SourceType) {
  if (sourceType === "wsdl") {
    return rawInput;
  }

  if (sourceType === "openapi" || sourceType === "insomnia") {
    try {
      const parsed = JSON.parse(rawInput);
      
      // Handle Postman-wrapped format: { "opts": {}, "spec": {...} }
      if (sourceType === "openapi" && parsed && typeof parsed === "object") {
        if ("spec" in parsed && typeof parsed.spec === "object") {
          return parsed.spec;
        }
        if ("api" in parsed && typeof parsed.api === "object") {
          return parsed.api;
        }
      }
      
      return parsed;
    } catch {
      const parsedYaml = parseYaml(rawInput);
      if (!parsedYaml || typeof parsedYaml !== "object") {
        throw new Error("OpenAPI input must be valid JSON or YAML.");
      }
      
      // Handle Postman-wrapped YAML format
      if (sourceType === "openapi" && parsedYaml && typeof parsedYaml === "object") {
        if ("spec" in parsedYaml && typeof parsedYaml.spec === "object") {
          return parsedYaml.spec;
        }
      }
      
      return parsedYaml;
    }
  }

  try {
    return JSON.parse(rawInput);
  } catch {
    throw new Error(`${sourceType} input must be valid JSON.`);
  }
}

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export default function Home() {
  const [sourceType, setSourceType] = useState<SourceType>("postman");
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const savedTheme = window.localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [fileName, setFileName] = useState<string>("");
  const [rawInput, setRawInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isConverting, setIsConverting] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const onFileChange = async (file: File | null, name: string) => {
    if (!file) {
      setFileName("");
      setRawInput("");
      setOutput("");
      setError("");
      return;
    }
    setFileName(name);
    setRawInput(await file.text());
    setOutput("");
    setError("");
  };

  const convertToBruno = async () => {
    setIsConverting(true);
    setError("");
    setOutput("");

    if (!rawInput || rawInput.trim().length === 0) {
      setError("No file content loaded. Please upload a file first.");
      setIsConverting(false);
      return;
    }

    try {
      const parsedInput = readSpecObject(rawInput, sourceType);

      if (!parsedInput || typeof parsedInput !== "object") {
        throw new Error("Invalid input: could not parse as JSON or YAML.");
      }

      let converted: unknown;

      if (sourceType === "postman") {
        const response = await fetch("/api/convert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceType,
            rawInput,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to convert Postman collection.");
        }

        converted = await response.json();
      } else if (sourceType === "insomnia") {
        try {
          converted = insomniaToBruno(parsedInput as object);
        } catch (e) {
          throw new Error(`Insomnia conversion failed: ${e instanceof Error ? e.message : "Invalid Insomnia collection"}`);
        }
      } else if (sourceType === "openapi") {
        try {
          converted = openApiToBruno(parsedInput as object);
        } catch (e) {
          throw new Error(`OpenAPI conversion failed: ${e instanceof Error ? e.message : "Invalid OpenAPI specification"}`);
        }
      } else {
        try {
          converted = await wsdlToBruno(parsedInput as string);
        } catch (e) {
          throw new Error(`WSDL conversion failed: ${e instanceof Error ? e.message : "Invalid WSDL"}`);
        }
      }

      setOutput(JSON.stringify(converted, null, 2));
    } catch (conversionError) {
      const message =
        conversionError instanceof Error
          ? conversionError.message
          : "Failed to convert the input.";
      setError(message);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadOutput = () => {
    if (!output) {
      return;
    }

    const baseName = fileName
      ? fileName.replace(/\.[^/.]+$/, "")
      : `${sourceType}-input`;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}.bruno_collection.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setRawInput("");
    setFileName("");
    setOutput("");
    setError("");
  };

  const outputFileName = fileName
    ? fileName.replace(/\.[^/.]+$/, "")
    : `${sourceType}-input`;

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
        <Header theme={theme} onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />

        <div className="panel">
          <div className="mb-5">
            <label className="label">
              Source type
            </label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as SourceType)}
              className="input-field w-full px-3 py-2.5"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="label">Upload source file</label>
            <FileDropZone fileName={fileName} onFileChange={onFileChange} />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={convertToBruno}
              disabled={fileName.length === 0 || isConverting}
              className="btn btn-primary"
            >
              {isConverting ? (
                <>
                  <span className="spinner" />
                  Converting...
                </>
              ) : (
                "Convert to Bruno"
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Reset
            </button>
          </div>

          {error ? (
            <div className="error-box mt-5 animate-fade-in">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: "2px" }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto opacity-70 hover:opacity-100"
                aria-label="Dismiss error"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
              </button>
            </div>
          ) : null}

          {output ? (
            <div className="success-card mt-5 animate-fade-in">
              <div className="success-card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="success-card-content">
                <p className="success-card-title">Conversion complete!</p>
                <p className="success-card-filename">{outputFileName}.bruno_collection.json</p>
              </div>
              <button
                type="button"
                onClick={downloadOutput}
                className="btn btn-success"
              >
                <DownloadIcon />
                Download
              </button>
            </div>
          ) : null}
        </div>

        <footer className="muted-text py-4 text-center text-xs">
          Built with Next.js and Bruno Converters
        </footer>
      </main>
    </div>
  );
}