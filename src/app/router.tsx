import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { appRoutes } from "./routes";
import type { AppRouteMatch, NavigateOptions } from "./types";

const DEFAULT_HOME_PATH = "/projects/project_neon_horizon/home";

interface AppRouterValue {
  currentPath: string;
  contentMatch: AppRouteMatch;
  modalMatch?: AppRouteMatch;
  navigate: (to: string, options?: NavigateOptions) => void;
  closeModal: () => void;
}

const AppRouterContext = createContext<AppRouterValue | null>(null);

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return DEFAULT_HOME_PATH;
  }
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

function getBrowserPath(): string {
  if (typeof window === "undefined") {
    return DEFAULT_HOME_PATH;
  }
  return normalizePath(window.location.pathname);
}

function getHistoryState(): Record<string, unknown> | null {
  if (typeof window === "undefined") {
    return null;
  }
  const state = window.history.state;
  return state && typeof state === "object" ? (state as Record<string, unknown>) : null;
}

function matchRoutePath(routePath: string, pathname: string): AppRouteMatch | undefined {
  const routeSegments = routePath.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (routeSegments.length !== pathSegments.length) {
    return undefined;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const pathSegment = pathSegments[index];

    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (routeSegment !== pathSegment) {
      return undefined;
    }
  }

  const matchedRoute = appRoutes.find((route) => route.path === routePath);
  if (!matchedRoute) {
    return undefined;
  }

  return {
    route: matchedRoute,
    pathname,
    params
  };
}

function resolveRoute(pathname: string): AppRouteMatch | undefined {
  const normalized = normalizePath(pathname);
  for (const route of appRoutes) {
    const match = matchRoutePath(route.path, normalized);
    if (match) {
      return match;
    }
  }
  return undefined;
}

function deriveModalBackgroundPath(pathname: string): string {
  const segments = normalizePath(pathname).split("/").filter(Boolean);
  if (segments[0] === "projects" && segments[1]) {
    return `/projects/${segments[1]}/home`;
  }
  return "/projects";
}

function getContentAndModalMatches(pathname: string): {
  contentMatch: AppRouteMatch;
  modalMatch?: AppRouteMatch;
} {
  const currentMatch = resolveRoute(pathname) ?? resolveRoute("/projects");
  if (!currentMatch) {
    throw new Error("No fallback route is available.");
  }

  if (!currentMatch.route.modal) {
    return { contentMatch: currentMatch };
  }

  const historyState = getHistoryState();
  const backgroundPath =
    typeof historyState?.backgroundPath === "string"
      ? normalizePath(historyState.backgroundPath)
      : deriveModalBackgroundPath(pathname);
  const backgroundMatch = resolveRoute(backgroundPath) ?? resolveRoute("/projects");

  if (!backgroundMatch) {
    throw new Error("No background route is available for modal rendering.");
  }

  return {
    contentMatch: backgroundMatch,
    modalMatch: currentMatch
  };
}

export function AppRouterProvider({ children }: PropsWithChildren) {
  const [currentPath, setCurrentPath] = useState<string>(() => getBrowserPath());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const normalized = getBrowserPath();
    if (normalized !== window.location.pathname) {
      window.history.replaceState(window.history.state, "", normalized);
    }
    setCurrentPath(normalized);

    const handlePopState = () => {
      setCurrentPath(getBrowserPath());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    if (typeof window === "undefined") {
      return;
    }

    const pathname = normalizePath(to);
    const currentHistoryState = getHistoryState() ?? {};
    const nextState =
      options?.modal === true
        ? { ...currentHistoryState, backgroundPath: currentPath }
        : {};

    if (options?.replace) {
      window.history.replaceState(nextState, "", pathname);
    } else {
      window.history.pushState(nextState, "", pathname);
    }
    setCurrentPath(pathname);
  }, [currentPath]);

  const closeModal = useCallback(() => {
    const historyState = getHistoryState();
    const backgroundPath =
      typeof historyState?.backgroundPath === "string"
        ? historyState.backgroundPath
        : deriveModalBackgroundPath(currentPath);
    navigate(backgroundPath, { replace: true });
  }, [currentPath, navigate]);

  const value = useMemo<AppRouterValue>(() => {
    const { contentMatch, modalMatch } = getContentAndModalMatches(currentPath);
    return {
      currentPath,
      contentMatch,
      modalMatch,
      navigate,
      closeModal
    };
  }, [closeModal, currentPath, navigate]);

  return <AppRouterContext.Provider value={value}>{children}</AppRouterContext.Provider>;
}

export function useAppRouter(): AppRouterValue {
  const context = useContext(AppRouterContext);
  if (!context) {
    throw new Error("useAppRouter must be used inside AppRouterProvider.");
  }
  return context;
}
