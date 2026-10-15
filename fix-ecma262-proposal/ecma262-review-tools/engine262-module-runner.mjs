// MODULE-SPECIFIC: runs an ECMAScript *module graph* on an engine262 checkout.
// For proposals that do not involve modules, write a script runner (see README,
// "Future work") or use plain-JS variants (polyfill / isolated algorithm).
//
//   import { makeRunner, clean } from './engine262-module-runner.mjs';
//   const { runCase } = await makeRunner('/path/to/engine262-worktree', {
//     features: ['import-defer'],
//     setup: (E) => E.setSomeScratchMode?.('...'),   // optional, called before every run
//   });
//   const out = runCase('/path/to/case/main.mjs', { env: { MY_SWITCH: '1' } });
//
// Output is one line per event, stable across runs, with paths made relative to the case:
//   [load] <specifier> phase=<phase> from=<referrer>   every HostLoadImportedModule call
//   <print(...) output>                                 `print` is a global in the realm
//   [throw] <err>        the entry threw synchronously (e.g. a link SyntaxError)
//   [reject] <err>       the entry's promise was already rejected after the first job
//   [pending]            the entry's promise was still pending after the first job
//   [uncaught] <err>     an unhandled rejection reported by the host
//   [NONTERMINATION]     the event-loop guard tripped
//   [final] <state>      the entry promise's state after the event loop drained
//                        (TLA entries can reject *late*: always look at this line)
//   [HOST-CRASH] ...     a JS exception escaped engine262, e.g. a failed spec Assert
//     | <stack>          up to 5 stack lines (dropped by clean())
//
// The engine checkout must be built (`npm run build:engine`) and expose lib/engine262.mjs
// and lib-src/node/module.mts (see new-engine262-worktree.sh).

import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export async function makeRunner(root, {
  features = [],
  supportedImportAttributes = ['type'],
  setup,
  maxJobs = 2000,
} = {}) {
  const E = await import(`${root}/lib/engine262.mjs`);
  const { createFileSystemModuleLoader } = await import(`${root}/lib-src/node/module.mts`);
  const {
    Agent, ManagedRealm, ModuleCache, setSurroundingAgent, composeModuleLoaders, inspect,
    Value, Descriptor, CreateBuiltinFunction, ThrowCompletion, NormalCompletion,
  } = E;

  function runCase(entry, { env = {}, setup: setupOverride } = {}) {
    const saved = {};
    for (const [k, v] of Object.entries(env)) {
      saved[k] = process.env[k];
      if (v === undefined || v === null) delete process.env[k]; else process.env[k] = String(v);
    }
    try {
      (setupOverride ?? setup)?.(E);
      return runOnce(resolve(entry)); // engine262's file loader needs absolute paths
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  }

  function runOnce(entry) {
    const caseRoot = dirname(entry);
    const out = [];
    const w = (s) => out.push(s);
    const rel = (s) => (typeof s === 'string' && s.startsWith(caseRoot) ? s.slice(caseRoot.length + 1) : String(s));
    const fsLoader = createFileSystemModuleLoader({ sync: true, allowAbsoluteSpecifier: true });
    const loggingLoader = (referrer, moduleRequest, hostDefined, finish, suggestError) => {
      w(`[load] ${rel(moduleRequest.Specifier)} phase=${moduleRequest.Phase} from=${rel(referrer?.HostDefined?.specifier ?? '<root>')}`);
      return fsLoader(referrer, moduleRequest, hostDefined, finish, suggestError);
    };
    let realm;
    const agent = new Agent({
      features,
      supportedImportAttributes,
      hostHooks: { HostLoadImportedModule: composeModuleLoaders([loggingLoader]) },
      uncaughtExceptionTrackers: new Set([(error) => {
        const pop = realm.pushTopContext();
        w(`[uncaught] ${inspect(error)}`);
        pop?.();
      }]),
    });
    setSurroundingAgent(agent);
    realm = new ManagedRealm({ resolverCache: new ModuleCache(), name: 'ecma262-review-tools', specifier: caseRoot });
    {
      const pop = realm.pushTopContext();
      realm.GlobalObject.properties.set(Value('print'), Descriptor({
        Configurable: true, Enumerable: false, Writable: true,
        Value: CreateBuiltinFunction.from(function* print(...args) {
          w(args.map((a) => inspect(a)).join(' '));
          return Value.undefined;
        }),
      }));
      pop?.();
    }
    let finalP = null;
    try {
      realm.evaluateModule(readFileSync(entry, 'utf8'), entry, (completion) => {
        const pop = realm.pushTopContext();
        if (completion instanceof ThrowCompletion) {
          w(`[throw] ${inspect(completion.Value)}`);
        } else {
          const v = completion instanceof NormalCompletion ? completion.Value : completion;
          finalP = v;
          if (v && v.PromiseState === 'rejected') w(`[reject] ${inspect(v.PromiseResult)}`);
          else if (v && v.PromiseState === 'pending') w('[pending]');
        }
        pop?.();
      });
      let jobs = 0;
      while (agent.eventLoop.hasPendingJobs && jobs++ < maxJobs) agent.eventLoop.runOnce();
      if (jobs >= maxJobs) w('[NONTERMINATION] event loop guard tripped');
      if (finalP && finalP.PromiseState) {
        const pop = realm.pushTopContext();
        w(`[final] ${finalP.PromiseState}${finalP.PromiseState === 'rejected' ? ` ${inspect(finalP.PromiseResult)}` : ''}`);
        pop?.();
      }
    } catch (e) {
      w(`[HOST-CRASH] ${e?.constructor?.name ?? ''}: ${e?.message}`);
      if (e?.stack) w(String(e.stack).split('\n').slice(0, 5).map((l) => `  | ${l.trim()}`).join('\n'));
    }
    return out.join('\n').replaceAll(`${caseRoot}/`, '').replaceAll(caseRoot, '.');
  }

  return { runCase, E };
}

// Drops the HOST-CRASH stack excerpt ("  | " lines) and, unless `loads`, the [load] lines,
// so outputs of different engines/variants can be compared.
export function clean(output, { loads = false } = {}) {
  return output.split('\n')
    .filter((l) => !l.startsWith('  | ') && (loads || !l.startsWith('[load]')))
    .join('\n');
}
