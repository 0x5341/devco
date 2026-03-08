import { describe, expect, it } from "vitest";
import type { WorkspaceOpenLinks } from "./types";
import {
  buildWorkspaceOpenLinkUrl,
  getRenderableOpenLinks,
  parseWorkspacePluginSelectionCookie,
  serializeWorkspacePluginSelectionCookie,
} from "./workspace-launch";

describe("workspace-launch", () => {
  it("builds a proxied workspace open link URL from the current host", () => {
    expect(
      buildWorkspaceOpenLinkUrl("http://localhost:8000", "alpha", "ws-a1", {
        Port: 3000,
        Path: "/docs/index.html",
      }),
    ).toBe("http://localhost:8000/port/alpha/ws-a1/3000/docs/index.html");
  });

  it("filters out non-openable links and sorts the remaining buttons by name", () => {
    const links: WorkspaceOpenLinks = {
      Hidden: { Port: 0, Path: "internal" },
      Docs: { Port: 3000, Path: "/docs" },
      Admin: { Port: 8080, Path: "admin" },
    };

    expect(getRenderableOpenLinks("http://localhost", "alpha", "ws-a1", links)).toEqual([
      { name: "Admin", url: "http://localhost/port/alpha/ws-a1/8080/admin" },
      { name: "Docs", url: "http://localhost/port/alpha/ws-a1/3000/docs" },
    ]);
  });

  it("serializes and restores cookie-backed plugin selections per workspace", () => {
    const cookie = serializeWorkspacePluginSelectionCookie("alpha", "ws-a1", ["docs", "admin", "docs"]);
    const cookieHeader = `theme=dark; ${cookie}; other=value`;

    expect(cookie).toContain("Path=/");
    expect(parseWorkspacePluginSelectionCookie(cookieHeader, "alpha", "ws-a1")).toEqual(["admin", "docs"]);
    expect(parseWorkspacePluginSelectionCookie("broken=value", "alpha", "ws-a1")).toEqual([]);
  });
});
