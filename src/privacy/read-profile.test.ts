import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileAccessError, readInfrastructureProfile } from "@/privacy/read-profile";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readInfrastructureProfile", () => {
  it("reads a selected JSON file locally through the File System Access API", async () => {
    const getFile = vi.fn().mockResolvedValue(
      new File(['{"technologies":[{"name":"AWS"}]}'], "infra-profile.json", {
        type: "application/json",
      }),
    );
    const showOpenFilePicker = vi.fn().mockResolvedValue([{ getFile }]);
    vi.stubGlobal("window", { showOpenFilePicker });

    const profile = await readInfrastructureProfile();

    expect(showOpenFilePicker).toHaveBeenCalledWith({
      multiple: false,
      types: [
        {
          description: "JSON infrastructure profile",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    expect(getFile).toHaveBeenCalledOnce();
    expect(profile.technologies).toEqual([{ name: "AWS" }]);
  });

  it("reports unsupported browsers explicitly", async () => {
    vi.stubGlobal("window", {});

    await expect(readInfrastructureProfile()).rejects.toThrow(ProfileAccessError);
  });
});
