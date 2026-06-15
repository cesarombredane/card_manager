export type ApiRecord = Record<string, any>;
export type ApiParam = string | number | boolean | null | undefined | Array<string | number | boolean>;
export type ApiParams = Record<string, ApiParam>;

export async function apiGet<T = ApiRecord>(path: string, params: ApiParams = {}): Promise<T> {
  const url = new URL(path, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
      return;
    }

    url.searchParams.set(key, String(value));
  });

  const response = await fetch(`${url.pathname}${url.search}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
