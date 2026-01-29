import {
  formatFiles,
  generateFiles,
  OverwriteStrategy,
  Tree,
} from '@nx/devkit';
import { configurationGenerator as generatorFn } from '@nxext/ionic-angular';
import { applicationGenerator as baseGeneratorFn } from '@nx/angular/generators';
import * as path from 'path';
import { NativeGeneratorSchema } from './schema';

export async function nativeGenerator(
  tree: Tree,
  options: NativeGeneratorSchema
) {
  const appName = `native-${options.name}`;
  const appRoot = `apps/${appName}`;
  const appPrefix = options.prefix || options.name;

  await baseGeneratorFn(tree, {
    name: appName,
    directory: appRoot,
    tags: 'type:app,scope:native',
    routing: true,
    standalone: true,
    prefix: appPrefix,
    style: 'scss',
    skipPackageJson: true,
  });

  await generatorFn(tree, {
    project: appName,
    capacitor: options.capacitor,
    skipFormat: false,
  });

  const appSrcPath = `${appRoot}/src`;

  generateFiles(tree, path.join(__dirname, 'files'), appSrcPath, options, {
    overwriteStrategy: OverwriteStrategy.Overwrite,
  });

  await formatFiles(tree);
}

export default nativeGenerator;
