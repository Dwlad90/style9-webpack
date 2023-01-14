import { SourceMapSource, RawSource } from 'webpack-sources';
import processCSS from './process-css';
import style9Loader from './loader';

import type webpack from 'webpack';

const NAME = 'style9';

export default class Style9Plugin {
  test: RegExp;
  static loader: typeof style9Loader;

  constructor({ test = /\.css$/ } = {}) {
    this.test = test;
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap(NAME, compilation => {
      if (compilation.hooks.processAssets) {
        compilation.hooks.processAssets.tap(
          {
            name: NAME,
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
          },
          assets => {
            const paths = Object.keys(assets);
            this._processFiles(compilation, paths);
          }
        );
      } else {
        compilation.hooks.optimizeChunkAssets.tapPromise(NAME, async chunks => {
          const paths = Array.from(chunks)
            .map(chunk => Array.from(chunk.files))
            .flat();

          this._processFiles(compilation, paths);
        });
      }
    });
  }

  _processFiles(compilation: webpack.Compilation, paths: string[]) {
    const filteredPaths = paths.filter(path => path.match(this.test));

    for (const path of filteredPaths) {
      const asset = compilation.assets[path];
      const { source, map } = asset.sourceAndMap();
      const postcssOpts = {
        to: path,
        from: path,
        map: { prev: map || false }
      };
      const result = processCSS(source, postcssOpts);

      if (result.map) {
        compilation.assets[path] = new SourceMapSource(
          result.css,
          path,
          JSON.parse(result.map as any),
          source as any,
          map as any,
          true
        ) as any;
      } else {
        compilation.assets[path] = new RawSource(result.css) as any;
      }
    }
  }
}

Style9Plugin.loader = style9Loader;
