export type Personal_Module_State<Data> = {
  data: Data;
  ready: boolean;
  error: string | null;
};

// Vuex mutations are synchronous; this result envelope preserves synchronous domain returns.
export type Mutation_Call<Args extends unknown[], Result> = {
  args: Args;
  result?: Result;
  failure?: { cause: unknown };
};
