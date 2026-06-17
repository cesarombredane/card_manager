import { localGet } from '../data/localData';

export type ApiRecord = Record<string, any>;
export type ApiParam = string | number | boolean | null | undefined | Array<string | number | boolean>;
export type ApiParams = Record<string, ApiParam>;

export async function apiGet<T = ApiRecord>(path: string, params: ApiParams = {}): Promise<T> {
  return localGet<T>(path, params);
}
