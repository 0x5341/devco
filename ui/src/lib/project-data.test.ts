import { describe, expect, it } from "vitest";
import { findProject, findWorkspace, toProjectList, toWorkspaceList } from "./project-data";
import type { ProjectsMap } from "./types";

const projects: ProjectsMap = {
  zebra: {
    Path: "/repos/zebra",
    Workspaces: {
      "ws-b": {
        State: "beforeStart",
        BranchName: "devco/ws-b",
        Path: "/worktree/zebra/ws-b",
        ContainerId: "",
        ComposeProjectName: "",
        RemoteUser: "",
        RemoteWorkspaceFolder: "",
        IPAddress: "",
      },
    },
  },
  alpha: {
    Path: "/repos/alpha",
    Workspaces: {
      "ws-a2": {
        State: "running",
        BranchName: "devco/ws-a2",
        Path: "/worktree/alpha/ws-a2",
        ContainerId: "container-a2",
        ComposeProjectName: "cp-a2",
        RemoteUser: "vscode",
        RemoteWorkspaceFolder: "/workspace",
        IPAddress: "172.0.0.2",
      },
      "ws-a1": {
        State: "stopped",
        BranchName: "devco/ws-a1",
        Path: "/worktree/alpha/ws-a1",
        ContainerId: "",
        ComposeProjectName: "",
        RemoteUser: "",
        RemoteWorkspaceFolder: "",
        IPAddress: "",
      },
    },
  },
};

describe("project-data", () => {
  it("sorts project list by project name", () => {
    expect(toProjectList(projects)).toEqual([
      { name: "alpha", path: "/repos/alpha", workspaceCount: 2 },
      { name: "zebra", path: "/repos/zebra", workspaceCount: 1 },
    ]);
  });

  it("flattens and sorts workspace list by project/workspace name", () => {
    expect(toWorkspaceList(projects)).toEqual([
      { projectName: "alpha", workspaceName: "ws-a1", state: "stopped", branchName: "devco/ws-a1" },
      { projectName: "alpha", workspaceName: "ws-a2", state: "running", branchName: "devco/ws-a2" },
      { projectName: "zebra", workspaceName: "ws-b", state: "beforeStart", branchName: "devco/ws-b" },
    ]);
  });

  it("finds project/workspace safely from route params", () => {
    expect(findProject(projects, "alpha")?.Path).toBe("/repos/alpha");
    expect(findProject(projects, undefined)).toBeNull();
    expect(findWorkspace(projects, "alpha", "ws-a2")?.State).toBe("running");
    expect(findWorkspace(projects, "alpha", "missing")).toBeNull();
  });
});
