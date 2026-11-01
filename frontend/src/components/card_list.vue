<template>
  <section class="row q-col-gutter-md">
    <div
      v-for="(card, index) in cards"
      :key="collection_entries[index]?.id ?? card.id"
      class="col-6 col-sm-4 col-md-3 col-lg-2"
    >
      <card-list-item
        :card="card"
        :collection_entry="collection_entries[index]"
        :selectable="selectable"
        :selected="
          collection_entries[index]
            ? selected_entry_ids.includes(collection_entries[index].id)
            : false
        "
        :protected_entry="
          collection_entries[index]
            ? protected_entry_ids.includes(collection_entries[index].id)
            : false
        "
        :status_overlay="
          collection_entries[index] ? status_overlays[collection_entries[index].id] : undefined
        "
        @click="$emit('card-click', $event)"
        @add-to-collection="open_collection_dialog"
        @add-to-want-list="open_want_list_dialog"
        @edit-entry="$emit('edit-entry', $event)"
        @delete-entry="$emit('delete-entry', $event)"
        @toggle-selection="$emit('toggle-selection', $event)"
      />
    </div>
  </section>

  <add-to-collection-dialog
    v-if="selected_card"
    v-model="show_collection_dialog"
    :set_id="selected_card.set_id"
    :card_id="selected_card.card_id"
    :variant_id="selected_card.variant_id"
    :language_id="selected_card.language_id"
    :card_name="selected_card.display_name"
  />
  <add-to-want-list-dialog
    v-if="selected_wanted_card"
    v-model="show_want_list_dialog"
    :set_id="selected_wanted_card.set_id"
    :card_id="selected_wanted_card.card_id"
    :variant_id="selected_wanted_card.variant_id"
    :language_id="selected_wanted_card.language_id"
    :card_name="selected_wanted_card.display_name"
  />
</template>

<script setup lang="ts">
  // import hooks
  import { ref } from 'vue';

  // import components
  import AddToCollectionDialog from './add_to_collection_dialog.vue';
  import AddToWantListDialog from './add_to_want_list_dialog.vue';
  import CardListItem from './card_list_item.vue';

  // import types
  import type { Collection_Entry } from '../store/modules/collection';
  import type { Display_Card } from '../utils/card_display';

  /* reactive vars */
  const selected_card = ref<Display_Card | null>(null);

  const show_collection_dialog = ref<boolean>(false);

  const selected_wanted_card = ref<Display_Card | null>(null);

  const show_want_list_dialog = ref<boolean>(false);

  /* functions */
  const open_collection_dialog = (card: Display_Card): void => {
    selected_card.value = card;
    show_collection_dialog.value = true;
  };

  const open_want_list_dialog = (card: Display_Card): void => {
    selected_wanted_card.value = card;
    show_want_list_dialog.value = true;
  };

  /* initialization */
  withDefaults(
    defineProps<{
      cards: Display_Card[];
      collection_entries?: Collection_Entry[];
      selectable?: boolean;
      selected_entry_ids?: string[];
      protected_entry_ids?: string[];
      status_overlays?: Record<string, string>;
    }>(),
    {
      collection_entries: () => [],
      selectable: false,
      selected_entry_ids: () => [],
      protected_entry_ids: () => [],
      status_overlays: () => ({}),
    },
  );

  defineEmits<{
    'card-click': [card: Display_Card];
    'edit-entry': [entry: Collection_Entry];
    'delete-entry': [entry: Collection_Entry];
    'toggle-selection': [entry: Collection_Entry];
  }>();
</script>
