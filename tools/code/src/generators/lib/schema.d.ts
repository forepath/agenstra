export interface LibGeneratorSchema {
  name: string;
  scope: 'frontend' | 'backend' | 'native' | 'keycloak' | 'shared';
  type: 'data-access' | 'feature' | 'ui' | 'util';
  domain: string;
  generator: 'js' | 'node' | 'angular';
}
