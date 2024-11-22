import type { Options as SWCOptions } from '@swc/core'
import type { CompilerOptions } from 'typescript'
import { resolve } from 'path'
import { warnOnce } from '../output/log'
import { parseJsonFile } from '../load-jsconfig'

export function resolveSWCOptionsForNextConfigLoader(cwd: string): SWCOptions {
  const tsConfig = lazilyGetTSConfig(cwd)

  return {
    jsc: {
      parser: {
        syntax: 'typescript',
      },
      paths: tsConfig?.compilerOptions?.paths,
      // SWC requires `baseUrl` to be passed when `paths` are used.
      // Also, `baseUrl` must be absolute.
      baseUrl: resolve(cwd, tsConfig?.compilerOptions?.baseUrl ?? ''),
      experimental: {
        keepImportAttributes: true,
        // Without this option, `assert` assertion also transpiles to `with` attribute,
        // which will throw if in Node.js version that does not support `with`.
        // Switch from Import Assertions to Import Attributes held at v21.0.0, v20.10.0, v18.20.0.
        emitAssertForImportAttributes: true,
      },
    },
    env: {
      targets: {
        // TODO: Bump to v20 when v18 EOL.
        // The value may be missing in other runtimes, so fallback to
        // the minimum Node.js version.
        node: process?.versions?.node ?? '18.18.0',
      },
    },
  } satisfies SWCOptions
}

// As we verify the TypeScript setup in the later process, it is too
// heavy to do a full tsconfig parsing with `typescript` module.
// Since we only need "paths" and "baseUrl" from tsconfig for now,
// we lazily look for tsconfig.json at cwd. Does not cover edge cases
// like "extends" or even the case where tsconfig.json does not exist.
export function lazilyGetTSConfig(cwd: string): {
  compilerOptions?: CompilerOptions
} {
  let tsConfig = {}
  try {
    tsConfig = parseJsonFile(resolve(cwd, 'tsconfig.json'))
  } catch (error) {
    // ignore if tsconfig.json does not exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  // TODO: correctly parse tsconfig.json using `typescript` module
  if ('extends' in tsConfig) {
    warnOnce(
      '`extends` field in tsconfig.json is not supported in next.config.ts.'
    )
  }

  return tsConfig
}

// There are three types of `import` Specifiers:
// - Relative specifiers like './foo.js'
// - Bare specifiers like 'next' or 'next/dist/compiled/react'
// - Absolute specifiers like 'file:///path/to/module'
// x-ref: https://nodejs.org/api/esm.html#import-specifiers
export function isBareSpecifier(specifier: string) {
  // Specifiers starting with "." are Relative specifiers.
  if (specifier.startsWith('.')) {
    return false
  }

  // URL-like specifiers are Absolute specifiers.
  try {
    new URL(specifier)
  } catch {
    // If the specifier is not a valid URL nor a relative path, it's a Bare specifier.
    // e.g. new URL('next') will throw something like:
    // "TypeError [ERR_INVALID_URL]: Invalid URL"
    return true
  }

  return false
}
