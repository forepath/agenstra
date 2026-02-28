import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

/**
 * Custom RouteReuseStrategy that reuses component instances when navigating
 * between routes that use the same component.
 *
 * This prevents components from being destroyed and recreated when navigating
 * between routes that share the same component, preserving component state.
 */
export class ComponentReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  /**
   * Determines if a route should be stored for potential reuse.
   * Returns true if the route has a component (not a redirect or lazy-loaded route without component).
   */
  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.component;
  }

  /**
   * Stores the detached route handle for potential reuse.
   */
  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      const key = this.getRouteKey(route);
      this.storedRoutes.set(key, handle);
    }
  }

  /**
   * Determines if a route should be reused.
   * Returns true if the route being navigated to uses the same component
   * as a previously stored route.
   *
   * IMPORTANT: The key includes both component name and route path to ensure
   * routes with different paths don't reuse each other.
   */
  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (!route.component) {
      return false;
    }

    const key = this.getRouteKey(route);
    return this.storedRoutes.has(key);
  }

  /**
   * Retrieves the stored route handle for reuse.
   */
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    return this.storedRoutes.get(key) || null;
  }

  /**
   * Determines if a route should be reused when navigating.
   * Returns true if the current route and the future route use the same component.
   *
   * IMPORTANT: Only reuses routes when components are identical AND route paths match.
   * If components differ OR paths differ, always returns false to ensure proper
   * component replacement (e.g., login -> chat).
   */
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // First, check if route configs match (this handles routes without components)
    const routeConfigsMatch = future.routeConfig === curr.routeConfig;

    // If either route has no component, use route config comparison
    if (!future.component || !curr.component) {
      return routeConfigsMatch;
    }

    // Check if both routes have the exact same component reference
    const componentsMatch = future.component === curr.component;

    // Get route paths for comparison
    const futurePath = future.routeConfig?.path || '';
    const currPath = curr.routeConfig?.path || '';
    const pathsMatch = futurePath === currPath;

    // Only reuse if ALL of the following are true:
    // 1. Components match
    // 2. Route configs match (or paths match as fallback)
    // This ensures we don't accidentally reuse routes with different components
    if (componentsMatch && (routeConfigsMatch || pathsMatch)) {
      return true;
    }

    // If components differ OR paths differ, NEVER reuse
    // This is critical for navigation between different components (e.g., login -> chat)
    return false;
  }

  /**
   * Generates a unique key for a route based on its component and path.
   * This key is used to store and retrieve route handles.
   *
   * IMPORTANT: Includes both component name and route path to ensure uniqueness
   * and prevent incorrect reuse of components from different routes.
   */
  private getRouteKey(route: ActivatedRouteSnapshot): string {
    const routePath = route.routeConfig?.path || route.url.map((segment) => segment.path).join('/');

    // Use component name/constructor as the primary key
    if (route.component) {
      const componentName = route.component.name || route.component.toString();
      // Include route path in the key to ensure routes with same component but different paths
      // don't reuse each other (though this shouldn't happen with our current routes)
      return `${componentName}:${routePath}`;
    }

    // Fallback to route path if no component
    return routePath;
  }
}
