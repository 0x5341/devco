export type WorkspaceState = "beforeStart" | "running" | "stopped";

export type Workspace = {
  State: WorkspaceState;
  BranchName: string;
  Path: string;
  ContainerId: string;
  ComposeProjectName: string;
  RemoteUser: string;
  RemoteWorkspaceFolder: string;
  IPAddress: string;
};

export type Project = {
  Path: string;
  Workspaces: Record<string, Workspace>;
};

export type ProjectsMap = Record<string, Project>;
