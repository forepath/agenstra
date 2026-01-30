export interface FrontendGeneratorSchema {
  name: string;
  prefix?: string;
  ssr: boolean;
  ui: 'clarity' | 'bootstrap' | 'none';
  protected: boolean;
  localization: boolean;
}
