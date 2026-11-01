// import utils
import { store } from './core';

// import types
import type { Mutation_Call } from '../models/personal_state';

export function commit_result<Args extends unknown[], Result>(name: string, args: Args): Result {
  const call: Mutation_Call<Args, Result> = { args };
  store.commit(name, call);
  return call.result as Result;
}
