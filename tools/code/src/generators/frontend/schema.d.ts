export interface FrontendGeneratorSchema {
  name: string;
  prefix?: string;
  ssr: boolean;
  ui: 'bootstrap' | 'none';
  protected: boolean;
  localization: boolean;
}
