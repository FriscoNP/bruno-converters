"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { load as parseYaml } from "js-yaml";
import insomniaToBruno from "@usebruno/converters/src/insomnia/insomnia-to-bruno";
import openApiToBruno from "@usebruno/converters/src/openapi/openapi-to-bruno";
import wsdlToBruno from "@usebruno/converters/src/wsdl/wsdl-to-bruno";

type SourceType = "postman" | "insomnia" | "openapi" | "wsdl";

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
  const [fileName, setFileName] = useState<string>("");
  const [rawInput, setRawInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isConverting, setIsConverting] = useState<boolean>(false);

  const canConvert = useMemo(() => rawInput.trim().length > 0, [rawInput]);

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
    <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="rounded-2xl border border-[#45475a] bg-[#181825]/80 p-6">
          <h1 className="text-2xl font-semibold">Bruno Converters Dashboard</h1>
          <p className="mt-2 text-sm text-[#bac2de]">
            Convert Postman, Insomnia, OpenAPI, or WSDL to Bruno collection JSON.
            Insomnia/OpenAPI/WSDL run client-side, while Postman uses a server
            fallback due to package runtime constraints.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#45475a] bg-[#181825]/80 p-5">
            <label className="mb-2 block text-sm font-medium">Source type</label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as SourceType)}
              className="w-full rounded-lg border border-[#585b70] bg-[#11111b] px-3 py-2 text-sm text-[#cdd6f4]"
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
              className="w-full rounded-lg border border-[#585b70] bg-[#11111b] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#cba6f7] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1e1e2e] hover:file:bg-[#b4befe]"
            />

            <label className="mt-4 mb-2 block text-sm font-medium">
              Or paste source content
            </label>
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              placeholder="Paste JSON, YAML, or WSDL content here..."
              className="h-72 w-full rounded-lg border border-[#585b70] bg-[#11111b] px-3 py-2 text-xs leading-5 text-[#cdd6f4]"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={convertToBruno}
                disabled={!canConvert || isConverting}
                className="rounded-lg bg-[#89b4fa] px-4 py-2 text-sm font-medium text-[#1e1e2e] disabled:cursor-not-allowed disabled:bg-[#6c7086] disabled:text-[#bac2de]"
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
                className="rounded-lg border border-[#585b70] bg-[#313244] px-4 py-2 text-sm font-medium text-[#cdd6f4] hover:bg-[#45475a]"
              >
                Reset
              </button>
            </div>

            {error ? (
              <p className="mt-4 rounded-md border border-[#f38ba8]/40 bg-[#f38ba8]/10 p-3 text-sm text-[#f38ba8]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#45475a] bg-[#181825]/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Bruno collection output</h2>
              <button
                type="button"
                onClick={downloadOutput}
                disabled={!output}
                className="rounded-lg bg-[#a6e3a1] px-3 py-1.5 text-xs font-medium text-[#1e1e2e] disabled:cursor-not-allowed disabled:bg-[#6c7086] disabled:text-[#bac2de]"
              >
                Download JSON
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Converted Bruno collection JSON will appear here..."
              className="h-[34rem] w-full rounded-lg border border-[#585b70] bg-[#11111b] px-3 py-2 text-xs leading-5 text-[#cdd6f4]"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
