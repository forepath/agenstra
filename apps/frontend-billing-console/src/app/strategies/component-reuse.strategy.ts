import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class ComponentReuseStrategy implements RouteReuseStrategy {
  private storedRoutes = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return !!route.component;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    if (handle) {
      const key = this.getRouteKey(route);
      this.storedRoutes.set(key, handle);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    if (!route.component) {
      return false;
    }

    const key = this.getRouteKey(route);
    return this.storedRoutes.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getRouteKey(route);
    return this.storedRoutes.get(key) || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    const routeConfigsMatch = future.routeConfig === curr.routeConfig;

    if (!future.component || !curr.component) {
      return routeConfigsMatch;
    }

    const componentsMatch = future.component === curr.component;

    const futurePath = future.routeConfig?.path || '';
    const currPath = curr.routeConfig?.path || '';
    const pathsMatch = futurePath === currPath;

    if (componentsMatch && (routeConfigsMatch || pathsMatch)) {
      return true;
    }

    return false;
  }

  private getRouteKey(route: ActivatedRouteSnapshot): string {
    const routePath = route.routeConfig?.path || route.url.map((segment) => segment.path).join('/');

    if (route.component) {
      const componentName = route.component.name || route.component.toString();
      return `${componentName}:${routePath}`;
    }

    return routePath;
  }
}
