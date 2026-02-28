import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  createProject,
  createWorkspace,
  deleteProject,
  deleteWorkspace,
  downWorkspaceContainer,
  fetchProjects,
  launchWorkspaceContainer,
} from "./lib/api";
import { findProject, findWorkspace, toProjectList, toWorkspaceList } from "./lib/project-data";
import type { ProjectsMap, Workspace } from "./lib/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

function useProjectsData() {
  const [projects, setProjects] = useState<ProjectsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
      setError(null);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { projects, loading, error, setError, reload };
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        aria-label={title}
        aria-modal="true"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AppLayout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-slate-900">devco UI</h1>
          <nav className="flex gap-2">
            <NavLink to="/projects" className={navClass}>
              Projects
            </NavLink>
            <NavLink to="/workspaces" className={navClass}>
              Workspaces
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function ProjectListPage() {
  const { projects, loading, error, setError, reload } = useProjectsData();
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isCreateProjectOpen, setCreateProjectOpen] = useState(false);
  const navigate = useNavigate();

  const projectList = useMemo(() => toProjectList(projects), [projects]);

  async function onCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName || !projectPath) {
      setError("project name/path are required");
      return;
    }
    setSubmitting(true);
    try {
      await createProject({ name: projectName, path: projectPath });
      setProjectName("");
      setProjectPath("");
      setCreateProjectOpen(false);
      await reload();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteProject(name: string) {
    setSubmitting(true);
    try {
      await deleteProject(name);
      await reload();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Projects</h2>
      <ErrorBanner message={error} />
      <Modal onClose={() => setCreateProjectOpen(false)} open={isCreateProjectOpen} title="Create project">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr]" onSubmit={onCreateProject}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="project-name">
              Project name
            </label>
            <input
              id="project-name"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="example-repo"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="project-path">
              Project path
            </label>
            <input
              id="project-path"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={projectPath}
              onChange={(event) => setProjectPath(event.target.value)}
              placeholder="/home/user/repo"
            />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setCreateProjectOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={submitting}
              type="submit"
            >
              Create project
            </button>
          </div>
        </form>
      </Modal>

      <SectionCard
        action={
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={submitting}
            onClick={() => setCreateProjectOpen(true)}
            type="button"
          >
            Create project
          </button>
        }
        title={loading ? "Project list (loading...)" : "Project list"}
      >
        {projectList.length === 0 ? (
          <p className="text-sm text-slate-600">No projects.</p>
        ) : (
          <ul className="space-y-3">
            {projectList.map((project) => (
              <li
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                key={project.name}
                onClick={() => navigate(`/projects/${project.name}`)}
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{project.name}</p>
                  <p className="text-sm text-slate-600">{project.path}</p>
                  <p className="text-xs text-slate-500">workspaces: {project.workspaceCount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={(event) => event.stopPropagation()}
                    to={`/projects/${project.name}`}
                  >
                    Details
                  </Link>
                  <button
                    aria-label={`Delete ${project.name}`}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                    disabled={submitting}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDeleteProject(project.name);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

function ProjectDetailPage() {
  const { projectName } = useParams();
  const { projects, loading, error, setError, reload } = useProjectsData();
  const [workspaceName, setWorkspaceName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isCreateWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const navigate = useNavigate();

  const project = findProject(projects, projectName);
  const workspaceList = useMemo(
    () =>
      project
        ? Object.entries(project.Workspaces)
            .map(([name, workspace]) => ({ name, workspace }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [project],
  );

  async function onCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectName || !workspaceName) {
      setError("workspace name is required");
      return;
    }

    setSubmitting(true);
    try {
      await createWorkspace({
        projectName,
        workspaceName,
        branchName,
      });
      setWorkspaceName("");
      setBranchName("");
      setCreateWorkspaceOpen(false);
      await reload();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteWorkspace(targetName: string) {
    if (!projectName) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteWorkspace({ projectName, workspaceName: targetName });
      await reload();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !project) {
    return <p className="text-sm text-slate-600">Loading project...</p>;
  }

  if (!project || !projectName) {
    return (
      <>
        <h2 className="text-2xl font-bold text-slate-900">Project not found</h2>
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/projects")}
          type="button"
        >
          Back to project list
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Project: {projectName}</h2>
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/projects")}
          type="button"
        >
          Back to projects
        </button>
      </div>
      <ErrorBanner message={error} />
      <SectionCard title="Project details">
        <dl className="grid gap-2 text-sm text-slate-700">
          <div>
            <dt className="font-medium text-slate-900">Path</dt>
            <dd>{project.Path}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Workspace count</dt>
            <dd>{workspaceList.length}</dd>
          </div>
        </dl>
      </SectionCard>
      <Modal onClose={() => setCreateWorkspaceOpen(false)} open={isCreateWorkspaceOpen} title="Create workspace">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr]" onSubmit={onCreateWorkspace}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="workspace-name">
              Workspace name
            </label>
            <input
              id="workspace-name"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="feature-login"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="workspace-branch">
              Branch name (optional)
            </label>
            <input
              id="workspace-branch"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="devco/feature-login"
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setCreateWorkspaceOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={submitting}
              type="submit"
            >
              Create workspace
            </button>
          </div>
        </form>
      </Modal>
      <SectionCard
        action={
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={submitting}
            onClick={() => setCreateWorkspaceOpen(true)}
            type="button"
          >
            Create workspace
          </button>
        }
        title={loading ? "Workspace list (loading...)" : "Workspace list"}
      >
        {workspaceList.length === 0 ? (
          <p className="text-sm text-slate-600">No workspaces.</p>
        ) : (
          <ul className="space-y-3">
            {workspaceList.map(({ name, workspace }) => (
              <WorkspaceRow
                key={name}
                projectName={projectName}
                workspace={workspace}
                workspaceName={name}
                onDelete={() => void onDeleteWorkspace(name)}
                deleting={submitting}
              />
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

function WorkspaceRow({
  projectName,
  workspaceName,
  workspace,
  onDelete,
  deleting,
}: {
  projectName: string;
  workspaceName: string;
  workspace: Workspace;
  onDelete: () => void;
  deleting: boolean;
}) {
  const navigate = useNavigate();

  return (
    <li
      className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
      onClick={() => navigate(`/projects/${projectName}/workspaces/${workspaceName}`)}
    >
      <div className="space-y-1">
        <p className="font-medium text-slate-900">{workspaceName}</p>
        <p className="text-xs text-slate-600">state: {workspace.State}</p>
        <p className="text-xs text-slate-500">branch: {workspace.BranchName}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          onClick={(event) => event.stopPropagation()}
          to={`/projects/${projectName}/workspaces/${workspaceName}`}
        >
          Details
        </Link>
        <button
          aria-label={`Delete ${workspaceName}`}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
          disabled={deleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          type="button"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function WorkspaceListPage() {
  const { projects, loading, error, setError, reload } = useProjectsData();
  const workspaceList = useMemo(() => toWorkspaceList(projects), [projects]);
  const projectList = useMemo(() => toProjectList(projects), [projects]);
  const [targetProjectName, setTargetProjectName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isCreateWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (projectList.length === 0) {
      if (targetProjectName) {
        setTargetProjectName("");
      }
      return;
    }
    if (!projectList.some((project) => project.name === targetProjectName)) {
      setTargetProjectName(projectList[0].name);
    }
  }, [projectList, targetProjectName]);

  async function onCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetProjectName || !workspaceName) {
      setError("project name/workspace name are required");
      return;
    }
    setSubmitting(true);
    try {
      await createWorkspace({
        projectName: targetProjectName,
        workspaceName,
        branchName,
      });
      setWorkspaceName("");
      setBranchName("");
      setCreateWorkspaceOpen(false);
      await reload();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Workspaces</h2>
      <ErrorBanner message={error} />
      <Modal onClose={() => setCreateWorkspaceOpen(false)} open={isCreateWorkspaceOpen} title="Create workspace">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr]" onSubmit={onCreateWorkspace}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="workspace-project-name">
              Project
            </label>
            <select
              id="workspace-project-name"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={projectList.length === 0}
              value={targetProjectName}
              onChange={(event) => setTargetProjectName(event.target.value)}
            >
              {projectList.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projectList.map((project) => (
                  <option key={project.name} value={project.name}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="workspace-name">
              Workspace name
            </label>
            <input
              id="workspace-name"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="feature-login"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="workspace-branch">
              Branch name (optional)
            </label>
            <input
              id="workspace-branch"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="devco/feature-login"
              value={branchName}
              onChange={(event) => setBranchName(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setCreateWorkspaceOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={submitting || projectList.length === 0}
              type="submit"
            >
              Create workspace
            </button>
          </div>
        </form>
      </Modal>
      <SectionCard
        action={
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={submitting || projectList.length === 0}
            onClick={() => setCreateWorkspaceOpen(true)}
            type="button"
          >
            Create workspace
          </button>
        }
        title={loading ? "Workspace list (loading...)" : "Workspace list"}
      >
        {workspaceList.length === 0 ? (
          <p className="text-sm text-slate-600">No workspaces.</p>
        ) : (
          <ul className="space-y-3">
            {workspaceList.map((workspace) => (
              <li
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                key={`${workspace.projectName}/${workspace.workspaceName}`}
                onClick={() => navigate(`/projects/${workspace.projectName}/workspaces/${workspace.workspaceName}`)}
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">
                    {workspace.projectName} / {workspace.workspaceName}
                  </p>
                  <p className="text-xs text-slate-600">state: {workspace.state}</p>
                  <p className="text-xs text-slate-500">branch: {workspace.branchName}</p>
                </div>
                <Link
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={(event) => event.stopPropagation()}
                  to={`/projects/${workspace.projectName}/workspaces/${workspace.workspaceName}`}
                >
                  Details
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

function WorkspaceDetailPage() {
  const { projectName, workspaceName } = useParams();
  const { projects, loading, error, setError, reload } = useProjectsData();
  const [submitting, setSubmitting] = useState(false);
  const [isRemoveDialogOpen, setRemoveDialogOpen] = useState(false);
  const navigate = useNavigate();
  const workspace = findWorkspace(projects, projectName, workspaceName);

  async function withAction(action: () => Promise<void>) {
    setSubmitting(true);
    try {
      await action();
      await reload();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !workspace) {
    return <p className="text-sm text-slate-600">Loading workspace...</p>;
  }

  if (!projectName || !workspaceName || !workspace) {
    return (
      <>
        <h2 className="text-2xl font-bold text-slate-900">Workspace not found</h2>
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/workspaces")}
          type="button"
        >
          Back to workspaces
        </button>
      </>
    );
  }

  const currentProjectName = projectName;
  const currentWorkspaceName = workspaceName;
  const isRunning = workspace.State === "running";
  const containerActionLabel = isRunning ? "Container Down" : "Container Launch";
  const containerActionClass = isRunning
    ? "bg-amber-600 disabled:bg-amber-300"
    : "bg-emerald-600 disabled:bg-emerald-300";

  async function onContainerAction() {
    await withAction(async () => {
      if (isRunning) {
        await downWorkspaceContainer({ projectName: currentProjectName, workspaceName: currentWorkspaceName });
        return;
      }
      await launchWorkspaceContainer({ projectName: currentProjectName, workspaceName: currentWorkspaceName });
    });
  }

  async function onRemoveWorkspace() {
    setRemoveDialogOpen(false);
    await withAction(async () => {
      await deleteWorkspace({ projectName: currentProjectName, workspaceName: currentWorkspaceName });
      navigate(`/projects/${currentProjectName}`);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900">Workspace: {currentWorkspaceName}</h2>
        <button
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          onClick={() => navigate(`/projects/${currentProjectName}`)}
          type="button"
        >
          Back to project
        </button>
      </div>
      <ErrorBanner message={error} />
      <Modal onClose={() => setRemoveDialogOpen(false)} open={isRemoveDialogOpen} title="Remove workspace">
        <p className="text-sm text-slate-700">Are you sure you want to remove workspace "{currentWorkspaceName}"?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => setRemoveDialogOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={() => void onRemoveWorkspace()}
            type="button"
          >
            Workspace Remove
          </button>
        </div>
      </Modal>
      <SectionCard title="Workspace">
        <dl className="flex flex-wrap gap-6 text-slate-700">
          <div className="min-w-40">
            <dt className="text-sm font-medium text-slate-600">Name</dt>
            <dd className="text-lg font-semibold text-slate-900">{currentProjectName}</dd>
          </div>
          <div className="min-w-40">
            <dt className="text-sm font-medium text-slate-600">State</dt>
            <dd className="text-lg font-semibold text-slate-900">{workspace.State}</dd>
          </div>
          <div className="min-w-40">
            <dt className="text-sm font-medium text-slate-600">Branch</dt>
            <dd className="text-lg font-semibold text-slate-900">{workspace.BranchName}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed ${containerActionClass}`}
            disabled={submitting}
            onClick={() => void onContainerAction()}
            type="button"
          >
            {containerActionLabel}
          </button>
          <button
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            onClick={() => setRemoveDialogOpen(true)}
            type="button"
          >
            Workspace Remove
          </button>
        </div>
      </SectionCard>
    </>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold text-slate-900">Page not found</h2>
      <button
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        onClick={() => navigate("/projects")}
        type="button"
      >
        Go to projects
      </button>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />} path="/">
        <Route element={<Navigate replace to="/projects" />} index />
        <Route element={<ProjectListPage />} path="projects" />
        <Route element={<ProjectDetailPage />} path="projects/:projectName" />
        <Route element={<WorkspaceListPage />} path="workspaces" />
        <Route element={<WorkspaceDetailPage />} path="projects/:projectName/workspaces/:workspaceName" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
