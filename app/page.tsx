"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { load as parseYaml } from "js-yaml";
import insomniaToBruno from "@usebruno/converters/src/insomnia/insomnia-to-bruno";
import openApiToBruno from "@usebruno/converters/src/openapi/openapi-to-bruno";
import wsdlToBruno from "@usebruno/converters/src/wsdl/wsdl-to-bruno";

type SourceType = "postman" | "insomnia" | "openapi" | "wsdl";
type Theme = "light" | "dark";

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

  if (sourceType === "openapi") {
    try {
      return JSON.parse(rawInput);
    } catch {
      const parsedYaml = parseYaml(rawInput);
      if (!parsedYaml || typeof parsedYaml !== "object") {
        throw new Error("OpenAPI input must be valid JSON or YAML.");
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

  const canConvert = useMemo(() => rawInput.trim().length > 0, [rawInput]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setFileName(file.name);
    setRawInput(await file.text());
    setOutput("");
    setError("");
  };

  const convertToBruno = async () => {
    setIsConverting(true);
    setError("");
    setOutput("");

    try {
      const parsedInput = readSpecObject(rawInput, sourceType);
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
        converted = insomniaToBruno(parsedInput as object);
      } else if (sourceType === "openapi") {
        converted = openApiToBruno(parsedInput as object);
      } else {
        converted = await wsdlToBruno(parsedInput as string);
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

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
        <header className="panel flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Bruno Converters</h1>
            <p className="muted-text mt-1 text-sm">
              Convert Postman, Insomnia, OpenAPI, and WSDL to Bruno collections.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="panel">
            <label className="mb-2 block text-sm font-medium">Source type</label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as SourceType)}
              className="input-field w-full px-3 py-2 text-sm"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="mt-4 mb-2 block text-sm font-medium">
              Upload source file
            </label>
            <input
              type="file"
              onChange={onFileChange}
              className="input-field w-full px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--base)] hover:file:opacity-90"
            />

            <label className="mt-4 mb-2 block text-sm font-medium">
              Or paste source content
            </label>
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              placeholder="Paste JSON, YAML, or WSDL content here..."
              className="input-field h-64 w-full px-3 py-2 text-xs leading-5"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={convertToBruno}
                disabled={!canConvert || isConverting}
                className="btn btn-primary"
              >
                {isConverting ? "Converting..." : "Convert to Bruno"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRawInput("");
                  setFileName("");
                  setOutput("");
                  setError("");
                }}
                className="btn btn-secondary"
              >
                Reset
              </button>
            </div>

            {error ? (
              <p className="error-box mt-4 p-3 text-sm">
                {error}
              </p>
            ) : null}
          </div>

          <div className="panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Bruno collection output</h2>
              <button
                type="button"
                onClick={downloadOutput}
                disabled={!output}
                className="btn btn-success px-3 py-1.5 text-xs"
              >
                Download JSON
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Converted Bruno collection JSON will appear here..."
              className="input-field h-[28rem] w-full px-3 py-2 text-xs leading-5"
            />
          </div>
        </section>

        <footer className="muted-text py-2 text-center text-xs">
          Built by FriscoNP using Next.js and Bruno Converters.
        </footer>
      </main>
    </div>
  );
}
