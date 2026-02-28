import type { ProjectsMap } from "./types";

type CreateProjectInput = {
  name: string;
  path: string;
};

type CreateWorkspaceInput = {
  projectName: string;
  workspaceName: string;
  branchName?: string;
};

type WorkspaceActionInput = {
  projectName: string;
  workspaceName: string;
};

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  const message = await res.text();
  throw new Error(message || `request failed (${res.status})`);
}

export async function fetchProjects(): Promise<ProjectsMap> {
  const res = await fetch("/api/project");
  await ensureOk(res);
  return (await res.json()) as ProjectsMap;
}

export async function createProject(input: CreateProjectInput): Promise<void> {
  const res = await fetch("/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Name: input.name,
      Path: input.path,
    }),
  });
  await ensureOk(res);
}

export async function deleteProject(projectName: string): Promise<void> {
  const res = await fetch(`/api/project?pjname=${encodeURIComponent(projectName)}`, {
    method: "DELETE",
  });
  await ensureOk(res);
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<void> {
  const res = await fetch("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ProjectName: input.projectName,
      WorkspaceName: input.workspaceName,
      BranchName: input.branchName ?? "",
    }),
  });
  await ensureOk(res);
}

export async function deleteWorkspace(input: WorkspaceActionInput): Promise<void> {
  const url = `/api/workspace?pjname=${encodeURIComponent(input.projectName)}&wsname=${encodeURIComponent(input.workspaceName)}`;
  const res = await fetch(url, { method: "DELETE" });
  await ensureOk(res);
}

export async function launchWorkspaceContainer(input: WorkspaceActionInput): Promise<void> {
  const res = await fetch("/api/workspace/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ProjectName: input.projectName,
      WorkspaceName: input.workspaceName,
    }),
  });
  await ensureOk(res);
}

export async function downWorkspaceContainer(input: WorkspaceActionInput): Promise<void> {
  const res = await fetch("/api/workspace/down", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ProjectName: input.projectName,
      WorkspaceName: input.workspaceName,
    }),
  });
  await ensureOk(res);
}
