export type WorkspaceState = "beforeStart" | "running" | "stopped";

export type WorkspaceOpenLink = {
  Port: number;
  Path: string;
};

export type WorkspaceOpenLinks = Record<string, WorkspaceOpenLink>;

export type PluginConfig = {
  Features: Record<string, Record<string, unknown>>;
  Links: WorkspaceOpenLinks;
};

export type AppConfig = {
  Plugins: Record<string, PluginConfig>;
};

export type Workspace = {
  State: WorkspaceState;
  BranchName: string;
  Path: string;
  ContainerId: string;
  ComposeProjectName: string;
  RemoteUser: string;
  RemoteWorkspaceFolder: string;
  IPAddress: string;
  OpenLinks?: WorkspaceOpenLinks;
};

export type Project = {
  Path: string;
  Workspaces: Record<string, Workspace>;
};

export type ProjectsMap = Record<string, Project>;
