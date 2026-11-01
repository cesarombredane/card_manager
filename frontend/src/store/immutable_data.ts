// import hooks
import { markRaw } from 'vue';

// Personal data is a JSON tree. Publish it once and reject nested writes, while
// avoiding reactive proxies and Vuex's synchronous traversal of every record.
export function immutable_data<Data extends object>(data: Data): Data {
  markRaw(data);
  freeze_tree(data);
  return data;
}

function freeze_tree(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freeze_tree(child);
  Object.freeze(value);
}
