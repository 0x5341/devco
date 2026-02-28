import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { ProjectsMap } from "./lib/types";

const seedProjects: ProjectsMap = {
  alpha: {
    Path: "/repos/alpha",
    Workspaces: {
      "ws-a1": {
        State: "beforeStart",
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

type Call = {
  method: string;
  url: string;
};

function cloneProjects(projects: ProjectsMap): ProjectsMap {
  return JSON.parse(JSON.stringify(projects)) as ProjectsMap;
}

function parseBody(init: RequestInit | undefined): Record<string, string> {
  if (!init?.body || typeof init.body !== "string") {
    return {};
  }
  return JSON.parse(init.body) as Record<string, string>;
}

function setupFetchMock(initial: ProjectsMap): Call[] {
  const calls: Call[] = [];
  const store = cloneProjects(initial);

  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    calls.push({ method, url });

    if (url === "/api/project" && method === "GET") {
      return new Response(JSON.stringify(store), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url === "/api/project" && method === "POST") {
      const body = parseBody(init);
      store[body.Name] = {
        Path: body.Path,
        Workspaces: {},
      };
      return new Response(null, { status: 200 });
    }

    if (url.startsWith("/api/project?pjname=") && method === "DELETE") {
      const pjname = new URL(url, "http://localhost").searchParams.get("pjname");
      if (pjname) {
        delete store[pjname];
      }
      return new Response(null, { status: 200 });
    }

    if (url === "/api/workspace" && method === "POST") {
      const body = parseBody(init);
      const project = store[body.ProjectName];
      if (project) {
        project.Workspaces[body.WorkspaceName] = {
          State: "beforeStart",
          BranchName: body.BranchName || `devco/${body.WorkspaceName}`,
          Path: `/worktree/${body.ProjectName}/${body.WorkspaceName}`,
          ContainerId: "",
          ComposeProjectName: "",
          RemoteUser: "",
          RemoteWorkspaceFolder: "",
          IPAddress: "",
        };
      }
      return new Response(null, { status: 200 });
    }

    if (url.startsWith("/api/workspace?pjname=") && method === "DELETE") {
      const parsed = new URL(url, "http://localhost");
      const pjname = parsed.searchParams.get("pjname");
      const wsname = parsed.searchParams.get("wsname");
      if (pjname && wsname && store[pjname]) {
        delete store[pjname].Workspaces[wsname];
      }
      return new Response(null, { status: 200 });
    }

    if (url === "/api/workspace/launch" && method === "POST") {
      const body = parseBody(init);
      const workspace = store[body.ProjectName]?.Workspaces[body.WorkspaceName];
      if (workspace) {
        workspace.State = "running";
      }
      return new Response(null, { status: 200 });
    }

    if (url === "/api/workspace/down" && method === "POST") {
      const body = parseBody(init);
      const workspace = store[body.ProjectName]?.Workspaces[body.WorkspaceName];
      if (workspace) {
        workspace.State = "stopped";
      }
      return new Response(null, { status: 200 });
    }

    return new Response(`unexpected request: ${method} ${url}`, { status: 500 });
  });

  vi.stubGlobal("fetch", mock as typeof fetch);
  return calls;
}

beforeEach(() => {
  window.history.pushState({}, "", "/projects");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App browser flows", () => {
  it("opens create project with modal popup", async () => {
    setupFetchMock(seedProjects);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("alpha");
    expect(screen.queryByRole("dialog", { name: /create project/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Create project" }));

    const dialog = await screen.findByRole("dialog", { name: /create project/i });
    expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDefined();
  });

  it("places create project button beside project list (without separate create section)", async () => {
    setupFetchMock(seedProjects);

    render(<App />);

    await screen.findByText("alpha");
    expect(screen.queryByRole("heading", { name: "Create project" })).toBeNull();
    expect(screen.getByRole("button", { name: "Create project" })).toBeDefined();
  });

  it("opens create workspace with modal popup", async () => {
    setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha");

    render(<App />);

    await screen.findByText("Project: alpha");
    expect(screen.queryByRole("dialog", { name: /create workspace/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    const dialog = await screen.findByRole("dialog", { name: /create workspace/i });
    expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDefined();
  });

  it("places create workspace button beside workspace list (without separate create section)", async () => {
    setupFetchMock(seedProjects);
    window.history.pushState({}, "", "/projects/alpha");

    render(<App />);

    await screen.findByText("Project: alpha");
    expect(screen.queryByRole("heading", { name: "Create workspace" })).toBeNull();
    expect(screen.getByRole("button", { name: "Create workspace" })).toBeDefined();
  });

  it("uses constrained centered width for cards across pages", async () => {
    setupFetchMock(seedProjects);
    window.history.pushState({}, "", "/projects");

    render(<App />);

    await screen.findByText("alpha");
    const projectListCard = screen.getByRole("heading", { name: "Project list" }).closest("section");
    expect(projectListCard?.className.includes("max-w-4xl")).toBe(true);
    expect(projectListCard?.className.includes("mx-auto")).toBe(true);
  });

  it("moves to project details when project list item is clicked", async () => {
    setupFetchMock(seedProjects);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("alpha");
    const projectListItem = screen.getByText("/repos/alpha").closest("li");
    expect(projectListItem).not.toBeNull();

    await user.click(projectListItem as HTMLElement);

    await screen.findByText("Project: alpha");
  });

  it("moves to workspace details when workspace list item is clicked", async () => {
    setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha");

    render(<App />);

    await screen.findByText("Project: alpha");
    const workspaceListItem = screen.getByText(/^ws-a1$/).closest("li");
    expect(workspaceListItem).not.toBeNull();

    await user.click(workspaceListItem as HTMLElement);

    await screen.findByText("Workspace: ws-a1");
  });

  it("moves to workspace details when workspace list page item is clicked", async () => {
    setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/workspaces");

    render(<App />);

    await screen.findByText("alpha / ws-a1");
    const workspaceListItem = screen.getByText("alpha / ws-a1").closest("li");
    expect(workspaceListItem).not.toBeNull();

    await user.click(workspaceListItem as HTMLElement);

    await screen.findByText("Workspace: ws-a1");
  });

  it("shows Back to projects as button on project detail", async () => {
    setupFetchMock(seedProjects);
    window.history.pushState({}, "", "/projects/alpha");

    render(<App />);

    await screen.findByText("Project: alpha");
    expect(screen.getByRole("button", { name: "Back to projects" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Back to projects" })).toBeNull();
  });

  it("shows Back to project as button on workspace detail", async () => {
    setupFetchMock(seedProjects);
    window.history.pushState({}, "", "/projects/alpha/workspaces/ws-a1");

    render(<App />);

    await screen.findByText("Workspace: ws-a1");
    expect(screen.getByRole("button", { name: "Back to project" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Back to project" })).toBeNull();
  });

  it("places create workspace button beside workspace list heading on /workspaces and opens modal", async () => {
    setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/workspaces");

    render(<App />);

    await screen.findByText("alpha / ws-a1");
    const heading = screen.getByRole("heading", { name: "Workspace list" });
    const button = screen.getByRole("button", { name: "Create workspace" });

    expect(heading.parentElement).not.toBeNull();
    expect(button.parentElement).toBe(heading.parentElement);
    expect(screen.queryByRole("dialog", { name: /create workspace/i })).toBeNull();

    await user.click(button);

    await screen.findByRole("dialog", { name: /create workspace/i });
  });

  it("creates and deletes a project from project list", async () => {
    const calls = setupFetchMock(seedProjects);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText("alpha");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    const dialog = await screen.findByRole("dialog", { name: /create project/i });
    await user.type(within(dialog).getByLabelText("Project name"), "beta");
    await user.type(within(dialog).getByLabelText("Project path"), "/repos/beta");
    await user.click(within(dialog).getByRole("button", { name: "Create project" }));

    await screen.findByText("beta");
    await user.click(screen.getByRole("button", { name: "Delete beta" }));
    await waitFor(() => expect(screen.queryByText("beta")).toBeNull());

    expect(calls.some((call) => call.method === "POST" && call.url === "/api/project")).toBe(true);
    expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/api/project?pjname=beta"))).toBe(true);
  });

  it("creates and deletes a workspace in project detail", async () => {
    const calls = setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha");

    render(<App />);

    await screen.findByText("Project: alpha");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    const dialog = await screen.findByRole("dialog", { name: /create workspace/i });
    await user.type(within(dialog).getByLabelText("Workspace name"), "ws-new");
    await user.click(within(dialog).getByRole("button", { name: "Create workspace" }));
    await screen.findByText("ws-new");

    await user.click(screen.getByRole("button", { name: "Delete ws-new" }));
    await waitFor(() => expect(screen.queryByText("ws-new")).toBeNull());

    expect(calls.some((call) => call.method === "POST" && call.url === "/api/workspace")).toBe(true);
    expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/api/workspace?pjname=alpha&wsname=ws-new"))).toBe(true);
  });

  it("uses single container action button and switches label after launch", async () => {
    const calls = setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha/workspaces/ws-a1");

    render(<App />);

    await screen.findByText("Workspace: ws-a1");
    expect(screen.queryByRole("button", { name: "Container Down" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Container Launch" }));
    await screen.findByRole("button", { name: "Container Down" });
    expect(screen.queryByRole("button", { name: "Container Launch" })).toBeNull();

    expect(calls.some((call) => call.method === "POST" && call.url === "/api/workspace/launch")).toBe(true);
  });

  it("uses single container action button with down label when workspace state is running", async () => {
    const runningProjects = cloneProjects(seedProjects);
    runningProjects.alpha.Workspaces["ws-a1"].State = "running";
    const calls = setupFetchMock(runningProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha/workspaces/ws-a1");

    render(<App />);

    await screen.findByText("Workspace: ws-a1");
    expect(screen.queryByRole("button", { name: "Container Launch" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Container Down" }));

    expect(calls.some((call) => call.method === "POST" && call.url === "/api/workspace/down")).toBe(true);
  });

  it("shows Name/State/Branch in same card with horizontal summary row and hides extra fields", async () => {
    setupFetchMock(seedProjects);
    window.history.pushState({}, "", "/projects/alpha/workspaces/ws-a1");

    render(<App />);

    await screen.findByText("Workspace: ws-a1");
    expect(screen.queryByRole("heading", { name: /workspace details/i })).toBeNull();

    const workspaceDetailCard = screen.getByRole("button", { name: "Container Launch" }).closest("section");
    expect(workspaceDetailCard).not.toBeNull();
    expect((workspaceDetailCard as HTMLElement).className.includes("max-w-4xl")).toBe(true);
    expect((workspaceDetailCard as HTMLElement).className.includes("mx-auto")).toBe(true);

    const scoped = within(workspaceDetailCard as HTMLElement);
    expect(scoped.getByText("Name")).toBeDefined();
    expect(scoped.queryByText("Project Name")).toBeNull();
    expect(scoped.getByText("State")).toBeDefined();
    expect(scoped.getByText("Branch")).toBeDefined();
    const summaryRow = Array.from((workspaceDetailCard as HTMLElement).querySelectorAll("div,dl")).find((element) => {
      const text = element.textContent ?? "";
      return element.className.includes("flex") && text.includes("Name") && text.includes("State") && text.includes("Branch");
    });
    expect(summaryRow).not.toBeNull();
    expect(scoped.getByRole("button", { name: "Workspace Remove" })).toBeDefined();
    expect(scoped.queryByText("Path")).toBeNull();
    expect(scoped.queryByText("Container ID")).toBeNull();
    expect(scoped.queryByText("IP Address")).toBeNull();
  });

  it("shows confirmation dialog before workspace removal in detail", async () => {
    const calls = setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha/workspaces/ws-a1");

    render(<App />);

    await screen.findByText("Workspace: ws-a1");
    await user.click(screen.getByRole("button", { name: "Workspace Remove" }));
    const dialog = await screen.findByRole("dialog", { name: /remove workspace/i });
    expect(within(dialog).queryByRole("button", { name: "Close" })).toBeNull();
    expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/api/workspace?pjname=alpha&wsname=ws-a1"))).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /remove workspace/i })).toBeNull());

    expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/api/workspace?pjname=alpha&wsname=ws-a1"))).toBe(false);
  });

  it("removes workspace after confirming in removal dialog", async () => {
    const calls = setupFetchMock(seedProjects);
    const user = userEvent.setup();
    window.history.pushState({}, "", "/projects/alpha/workspaces/ws-a1");

    render(<App />);

    await screen.findByText("Workspace: ws-a1");
    await user.click(screen.getByRole("button", { name: "Workspace Remove" }));
    const dialog = await screen.findByRole("dialog", { name: /remove workspace/i });
    await user.click(within(dialog).getByRole("button", { name: "Workspace Remove" }));

    await waitFor(() =>
      expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/api/workspace?pjname=alpha&wsname=ws-a1"))).toBe(true),
    );
  });
});
