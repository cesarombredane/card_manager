// import utils
import { store } from './core';

// import types
import type { Mutation_Call } from '../models/personal_state';

export function commit_result<Args extends unknown[], Result>(name: string, args: Args): Result {
  const call: Mutation_Call<Args, Result> = { args };
  store.commit(name, call);
  if (call.failure) throw call.failure.cause;
  return call.result as Result;
}

// Let Vuex finish its mutation bookkeeping before rethrowing a domain error to
// the caller. The edit's draft is discarded by the module on failure.
export function mutation_result<Args extends unknown[], Result>(
  call: Mutation_Call<Args, Result>,
  edit: () => Result,
): void {
  try {
    call.result = edit();
  } catch (err) {
    call.failure = { cause: err };
  }
}
