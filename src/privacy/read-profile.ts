import { parseInfrastructureProfile } from "@/privacy/profile";
import type { InfrastructureProfile } from "@/privacy/profile";

interface JsonFilePickerOptions {
  multiple?: boolean;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface LocalFileHandle {
  getFile(): Promise<File>;
}

declare global {
  interface Window {
    showOpenFilePicker?: (
      options?: JsonFilePickerOptions,
    ) => Promise<LocalFileHandle[]>;
  }
}

export class ProfileAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileAccessError";
  }
}

export async function readInfrastructureProfile(): Promise<InfrastructureProfile> {
  if (typeof window === "undefined") {
    throw new ProfileAccessError(
      "The infrastructure profile can only be opened in a browser.",
    );
  }

  const picker = window.showOpenFilePicker;
  if (typeof picker !== "function") {
    throw new ProfileAccessError(
      "This browser does not support local profile selection.",
    );
  }

  const [handle] = await picker.call(window, {
    multiple: false,
    types: [
      {
        description: "JSON infrastructure profile",
        accept: { "application/json": [".json"] },
      },
    ],
  });

  if (!handle) {
    throw new ProfileAccessError("No profile file was selected.");
  }

  const file = await handle.getFile();
  if (!file.name.toLowerCase().endsWith(".json")) {
    throw new ProfileAccessError("Select a .json infrastructure profile.");
  }

  return parseInfrastructureProfile(await file.text());
}
