import type { CollectionData } from '../models/collection';
import type { BindersData } from '../models/binders';
// Local transport only. Domain stores own validation, reconciliation and save queues.
export const read_collection = (): Promise<Response> => fetch('/api/collection');
export const apply_collection_operation = (operation: {
  before: CollectionData;
  after: CollectionData;
}): Promise<Response> =>
  fetch('/api/collection/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operation),
  });
export const read_binders = (): Promise<Response> => fetch('/api/binders');
export const save_binders = (data: BindersData): Promise<Response> =>
  fetch('/api/binders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const read_manual_images = (): Promise<Response> => fetch('/api/manual-images');
export const save_manual_image = (data: {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
  data_url: string;
}): Promise<Response> =>
  fetch('/api/manual-images', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const remove_manual_image = (data: {
  set_id: string;
  card_id: string;
  variant_id: string;
  language_id: string;
}): Promise<Response> =>
  fetch('/api/manual-images', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const export_personal_data = (): Promise<Response> => fetch('/api/personal-data/export');
export const import_personal_data = (archive: File): Promise<Response> =>
  fetch('/api/personal-data/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/zip' },
    body: archive,
  });
