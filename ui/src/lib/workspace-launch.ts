import type { WorkspaceOpenLink, WorkspaceOpenLinks } from "./types";

const pluginSelectionCookiePrefix = "devco-workspace-plugins";
const pluginSelectionCookieMaxAge = 60 * 60 * 24 * 365;

export type RenderableOpenLink = {
  name: string;
  url: string;
};

function toSortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function getWorkspacePluginSelectionCookieName(projectName: string, workspaceName: string): string {
  return `${pluginSelectionCookiePrefix}-${encodeURIComponent(projectName)}-${encodeURIComponent(workspaceName)}`;
}

function encodeLinkPath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function serializeWorkspacePluginSelectionCookie(
  projectName: string,
  workspaceName: string,
  plugins: string[],
): string {
  const cookieName = getWorkspacePluginSelectionCookieName(projectName, workspaceName);
  const cookieValue = encodeURIComponent(JSON.stringify(toSortedUnique(plugins)));
  return `${cookieName}=${cookieValue}; Max-Age=${pluginSelectionCookieMaxAge}; Path=/; SameSite=Lax`;
}

export function parseWorkspacePluginSelectionCookie(
  cookieHeader: string,
  projectName: string,
  workspaceName: string,
): string[] {
  const cookieName = getWorkspacePluginSelectionCookieName(projectName, workspaceName);
  const cookieEntry = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`));

  if (!cookieEntry) {
    return [];
  }

  try {
    const rawValue = cookieEntry.slice(cookieName.length + 1);
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    if (!Array.isArray(parsed)) {
      return [];
    }
    return toSortedUnique(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return [];
  }
}

export function buildWorkspaceOpenLinkUrl(
  origin: string,
  projectName: string,
  workspaceName: string,
  link: WorkspaceOpenLink,
): string {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const normalizedPath = link.Path.replace(/^\/+/, "");
  const pathSuffix = normalizedPath === "" ? "" : `/${encodeLinkPath(normalizedPath)}`;

  return `${normalizedOrigin}/port/${encodeURIComponent(projectName)}/${encodeURIComponent(workspaceName)}/${link.Port}${pathSuffix}`;
}

export function getRenderableOpenLinks(
  origin: string,
  projectName: string,
  workspaceName: string,
  links: WorkspaceOpenLinks,
): RenderableOpenLink[] {
  return Object.entries(links)
    .filter(([, link]) => link.Port > 0)
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, link]) => ({
      name,
      url: buildWorkspaceOpenLinkUrl(origin, projectName, workspaceName, link),
    }));
}
