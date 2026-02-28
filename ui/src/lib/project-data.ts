import type { ProjectsMap, Project, Workspace } from "./types";

export type ProjectListItem = {
  name: string;
  path: string;
  workspaceCount: number;
};

export type WorkspaceListItem = {
  projectName: string;
  workspaceName: string;
  state: string;
  branchName: string;
};

export function toProjectList(projects: ProjectsMap): ProjectListItem[] {
  return Object.entries(projects)
    .map(([name, project]) => ({
      name,
      path: project.Path,
      workspaceCount: Object.keys(project.Workspaces).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toWorkspaceList(projects: ProjectsMap): WorkspaceListItem[] {
  const workspaces: WorkspaceListItem[] = [];

  for (const [projectName, project] of Object.entries(projects)) {
    for (const [workspaceName, workspace] of Object.entries(project.Workspaces)) {
      workspaces.push({
        projectName,
        workspaceName,
        state: workspace.State,
        branchName: workspace.BranchName,
      });
    }
  }

  return workspaces.sort((a, b) => {
    const projectCmp = a.projectName.localeCompare(b.projectName);
    if (projectCmp !== 0) {
      return projectCmp;
    }
    return a.workspaceName.localeCompare(b.workspaceName);
  });
}

export function findProject(projects: ProjectsMap, projectName: string | undefined): Project | null {
  if (!projectName) {
    return null;
  }
  return projects[projectName] ?? null;
}

export function findWorkspace(
  projects: ProjectsMap,
  projectName: string | undefined,
  workspaceName: string | undefined,
): Workspace | null {
  const project = findProject(projects, projectName);
  if (!project || !workspaceName) {
    return null;
  }
  return project.Workspaces[workspaceName] ?? null;
}
