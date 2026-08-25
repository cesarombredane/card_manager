<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section v-if="!binder" class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col">
        <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to collection" no-caps :to="`/collection/folder/${folderId}`" />
        <div class="text-overline text-primary q-mt-sm">Binder organizer</div>
        <div class="text-h4 text-weight-bold">{{ folder?.name ?? 'Unknown collection' }}</div>
      </div>
    </section>

    <q-banner v-if="binderStore.saveError.value" class="bg-red-10 text-negative q-mb-md rounded-borders">
      {{ binderStore.saveError.value }}
    </q-banner>
    <q-banner v-if="!folder" class="bg-grey-10 text-grey-4">This collection does not exist.</q-banner>
    <q-banner v-else-if="folder.type !== 'binder'" class="bg-grey-10 text-grey-4">
      Binder options are only available for collections configured as binders.
    </q-banner>

    <div v-else-if="binder" class="row q-col-gutter-lg items-start">
      <aside class="col-12 col-lg-3">
        <div class="q-mb-md">
          <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to collection" no-caps :to="`/collection/folder/${folderId}`" />
          <div class="text-overline text-primary q-mt-sm">Binder organizer</div>
          <div class="text-h5 text-weight-bold">{{ folder.name }}</div>
          <div class="row q-gutter-sm q-mt-md">
            <q-btn outline color="primary" icon="auto_awesome" label="Auto Michi" no-caps @click="openMichiDialog" />
            <q-btn outline color="primary" icon="settings" label="Binder settings" no-caps :disable="binder.locked_pages.length > 0" @click="openSettings">
              <q-tooltip v-if="binder.locked_pages.length">Unlock all pages before changing binder dimensions</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-card flat bordered class="bg-grey-10 text-white">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between">
              <div class="text-h6">Binder items</div>
              <div v-if="selectorTab === 'proxies' || selectorTab === 'images'" class="row no-wrap">
                <q-btn v-if="selectorTab === 'images'" flat round dense color="primary" icon="picture_as_pdf" :disable="selectedImageIds.length === 0"
                  :loading="imagesPdfSaving" @click="printSelectedImages">
                  <q-tooltip>Download selected images at Vault X pocket size</q-tooltip>
                </q-btn>
                <q-btn v-if="selectorTab === 'images'" flat round dense color="primary" icon="add_photo_alternate" @click="openBulkImageDialog">
                  <q-tooltip>Add multiple images automatically</q-tooltip>
                </q-btn>
                <q-btn flat round dense color="primary" icon="add" @click="openAssetDialog(selectorTab)">
                  <q-tooltip>Add {{ selectorTab === 'proxies' ? 'proxy' : 'image' }}</q-tooltip>
                </q-btn>
              </div>
            </div>
            <div v-if="imagesPdfError" class="text-negative text-caption q-mt-sm">{{ imagesPdfError }}</div>
            <q-tabs v-model="selectorTab" dense active-color="primary" indicator-color="primary" class="q-mt-sm">
              <q-tab name="collection" label="Cards" />
              <q-tab name="wanted" label="Wanted" />
              <q-tab name="proxies" label="Proxies" />
              <q-tab name="images" label="Images" />
            </q-tabs>
            <div class="text-caption text-grey-4 q-mt-sm">{{ selectorHelp }}</div>
            <q-input v-model="search" dark dense outlined clearable class="q-mt-sm" label="Search">
              <template #prepend><q-icon name="search" /></template>
            </q-input>
            <card-sort-selector v-if="selectorTab === 'collection' || selectorTab === 'wanted'" v-model="selectedCardSort" class="q-mt-sm" />
          </q-card-section>
          <q-separator dark />
          <q-scroll-area style="height: 50vh">
            <q-list v-if="selectorTab === 'collection' || selectorTab === 'wanted'" separator>
              <q-item v-for="row in availableRows" :key="row.entry.id" dense :draggable="row.available > 0"
                :class="{ 'text-grey-6': row.available === 0, 'cursor-grab': row.available > 0 }" @dragstart="startEntryDrag(row.entry.id, $event)">
                <q-item-section avatar>
                  <div v-if="row.card.preview_image_urls?.length" class="binder-preview-collage" :class="{ 'wanted-image': row.entry.wanted }">
                    <div v-for="url in row.card.preview_image_urls" :key="url"><img :src="url" alt="" /></div>
                  </div>
                  <q-img v-else-if="row.card.image_url" :src="row.card.image_url" fit="contain" width="44px" height="60px" :class="{ 'wanted-image': row.entry.wanted }" />
                  <q-icon v-else name="style" size="32px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ row.card.display_name }}</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    {{ row.card.set_name }} · {{ row.entry.language_id.toUpperCase() }} · {{ row.entry.condition }}
                  </q-item-label>
                  <q-item-label v-if="collectionStore.pokedexEntryStatus(row.entry.id)" caption class="text-negative text-weight-bold">
                    {{ collectionStore.pokedexEntryStatus(row.entry.id) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="row.available > 0 ? 'primary' : 'grey-8'" :text-color="row.available > 0 ? 'black' : 'white'">
                    {{ row.available }} / {{ row.entry.quantity }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
            <q-list v-else-if="selectorTab === 'proxies'" separator>
              <q-item v-for="proxy in filteredProxies" :key="proxy.id" dense :draggable="proxyAvailable(proxy) > 0"
                :class="{ 'text-grey-6': proxyAvailable(proxy) === 0, 'cursor-grab': proxyAvailable(proxy) > 0 }" @dragstart="startProxyDrag(proxy.id, $event)">
                <q-item-section avatar>
                  <q-img :src="binderAssetUrl(proxy.id, 'proxy')" fit="contain" width="44px" height="60px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ proxy.name }}</q-item-label>
                  <q-item-label caption>
                    <span v-if="proxy.date">{{ proxy.date }} · </span>
                    {{ proxyAvailable(proxy) }} / {{ proxy.quantity }} available
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div v-if="!isAssetLocked('proxy', proxy.id)" class="row no-wrap">
                    <q-btn flat round dense color="grey-4" icon="edit" @click="openEditAsset('proxy', proxy.id)">
                      <q-tooltip>Edit proxy</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense color="negative" icon="delete" @click="requestDeleteAsset('proxy', proxy.id)" />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="filteredProxies.length === 0"><q-item-section class="text-grey-5">No proxies. Use + to upload one.</q-item-section></q-item>
            </q-list>
            <q-list v-else separator>
              <q-item v-for="image in filteredImages" :key="image.id" dense :draggable="!isAssetLocked('image', image.id)"
                :class="{ 'cursor-grab': !isAssetLocked('image', image.id) }" @dragstart="startImageDrag(image.id, $event)">
                <q-item-section side>
                  <q-checkbox v-model="selectedImageIds" :val="image.id" color="primary" @click.stop />
                </q-item-section>
                <q-item-section avatar>
                  <q-img :src="binderAssetUrl(image.id, 'image')" fit="contain" width="48px" height="48px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ image.name }}</q-item-label>
                  <q-item-label caption>{{ image.width }} × {{ image.height }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div v-if="!isAssetLocked('image', image.id)" class="row no-wrap">
                    <q-btn flat round dense color="grey-4" icon="edit" @click="openEditAsset('image', image.id)">
                      <q-tooltip>Edit image</q-tooltip>
                    </q-btn>
                    <q-btn v-if="placedImageIds.has(image.id)" flat round dense color="grey-4" icon="remove_circle"
                      @click="binderStore.removeImagePlacement(folderId, image.id)">
                      <q-tooltip>Remove from binder page</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense color="negative" icon="delete" @click="requestDeleteAsset('image', image.id)" />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="filteredImages.length === 0"><q-item-section class="text-grey-5">No images. Use + to upload one.</q-item-section></q-item>
            </q-list>
          </q-scroll-area>
        </q-card>
      </aside>

      <section class="col-12 col-lg-9">
        <div class="row items-center justify-between q-mb-md">
          <q-btn flat round icon="chevron_left" :disable="currentSpread === 0" @click="currentSpread--" />
          <div class="text-subtitle1 text-weight-bold">{{ spreadLabel }}</div>
          <q-btn flat round icon="chevron_right" :disable="currentSpread >= binder.page_count" @click="currentSpread++" />
        </div>

        <div class="binder-spread">
          <div v-for="side in visibleSides" :key="side.position" class="binder-leaf">
            <div class="row items-center justify-center q-gutter-xs q-mb-xs">
              <span class="text-caption text-grey-4">{{ side.label }}</span>
              <q-btn v-if="side.sideIndex !== null" flat round dense size="sm" color="primary"
                :icon="isPageLocked(side.sideIndex) ? 'lock' : 'lock_open'"
                @click="togglePageLock(side.sideIndex)">
                <q-tooltip>{{ isPageLocked(side.sideIndex) ? 'Unlock this page face' : 'Lock this page face' }}</q-tooltip>
              </q-btn>
            </div>
            <div v-if="side.sideIndex !== null" class="binder-page q-pa-sm rounded-borders"
              :class="{ 'binder-page--locked': isPageLocked(side.sideIndex) }"
              :style="{ gridTemplateColumns: `repeat(${binderColumns}, minmax(0, 1fr))` }">
              <div v-for="decoration in side.decorations" :key="decoration.image.id" class="binder-decoration" :style="{
                gridColumn: `${decoration.placement.column + 1} / span ${decoration.image.width}`,
                gridRow: `${decoration.placement.row + 1} / span ${decoration.image.height}`
              }">
                <img :src="binderAssetUrl(decoration.image.id, 'image')" :alt="decoration.image.name" />
              </div>
              <div v-for="slot in side.slots" :key="slot.index" class="binder-slot relative-position" :class="{
                'binder-slot--filled': slot.content,
                'binder-slot--decorated': slot.hasDecoration && !slot.content,
                'binder-slot--image-reserved': slot.hasDecoration && !slot.acceptsCard
              }" :style="{ gridColumn: slot.column + 1, gridRow: slot.rowIndex + 1 }" @dragover.prevent @drop.prevent="dropOnSlot(slot.index, $event)">
                <template v-if="slot.content">
                  <img v-if="slot.content.imageUrl" :src="slot.content.imageUrl" :alt="slot.content.name" :draggable="!isSlotLocked(slot.index)"
                    :class="{ 'wanted-image': slot.content.wanted }" @dragstart="startSlotDrag(slot.index, $event)" />
                  <div v-else class="full-height column items-center justify-center text-center q-pa-sm"
                    :draggable="!isSlotLocked(slot.index)" @dragstart="startSlotDrag(slot.index, $event)">
                    <q-icon name="style" size="30px" color="grey-5" />
                    <div class="text-caption q-mt-sm">{{ slot.content.name }}</div>
                  </div>
                  <div v-if="slot.content.status" class="slot-status-overlay">{{ slot.content.status }}</div>
                  <q-btn v-if="!isSlotLocked(slot.index)" class="slot-remove absolute-top-right q-ma-xs" round dense size="xs" color="grey-10" icon="close"
                    @click="binderStore.setSlot(folderId, slot.index, null)">
                    <q-tooltip>Remove from binder</q-tooltip>
                  </q-btn>
                  <q-btn v-if="!isSlotLocked(slot.index) && slot.content.wanted && slot.content.entryId && !slot.content.pokedexRequirement" class="slot-got-it absolute-bottom q-ma-sm" color="primary" text-color="black"
                    icon="check_circle" label="Got it" no-caps dense @click.stop="openGotIt(slot.index, slot.content.entryId)" />
                </template>
                <div v-else-if="!slot.hasDecoration" class="full-height column items-center justify-center text-grey-6">
                  <q-icon name="add" size="24px" />
                  <span class="text-caption">Drop here</span>
                </div>
              </div>
            </div>
            <div v-else class="binder-page binder-page--empty rounded-borders column items-center justify-center text-grey-7">
              <q-icon name="menu_book" size="42px" />
              <span class="text-caption q-mt-sm">No page</span>
            </div>
          </div>
        </div>
      </section>

    </div>

    <q-dialog :model-value="showCreateDialog" persistent>
      <q-card class="bg-grey-10 text-white" style="width: 440px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Create binder</div>
          <div class="text-body2 text-grey-4">One binder can be created for this collection.</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model.number="newPageCount" type="number" min="1" max="200" dark outlined label="Number of pages" />
          <q-select v-model="newLayout" :options="layoutOptions" emit-value map-options dark outlined label="Cards per page" />
          <q-banner class="bg-grey-9 text-grey-4 rounded-borders">
            Capacity: {{ newPageCount * 2 * binderSlotsPerPage(newLayout) }} cards
            (recto and verso)
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" :to="`/collection/folder/${folderId}`" />
          <q-btn color="primary" text-color="black" label="Create binder" :disable="newPageCount < 1" @click="createBinder" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showSettings">
      <q-card class="bg-grey-10 text-white" style="width: 460px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Binder settings</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model.number="settingsPageCount" type="number" min="1" max="200" dark outlined label="Number of pages" />
          <q-select v-model="settingsLayout" :options="layoutOptions" emit-value map-options dark outlined label="Cards per page" />
          <q-banner class="bg-grey-9 text-grey-4 rounded-borders">
            New capacity: {{ settingsPageCount * 2 * binderSlotsPerPage(settingsLayout) }} cards
            (recto and verso)
          </q-banner>
          <q-banner v-if="settingsChanged" class="bg-red-10 text-white rounded-borders">
            <template #avatar><q-icon name="warning" color="white" /></template>
            Changing these settings will reset the binder and permanently remove every card from its current slot.
            Cards will remain safely in the collection.
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="negative" :label="settingsChanged ? 'Reset and save' : 'Save'" :disable="settingsPageCount < 1 || !settingsChanged" @click="saveSettings" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showMichiDialog">
      <q-card class="bg-grey-10 text-white" style="width: 920px; max-width: 96vw; max-height: 92vh">
        <q-card-section>
          <div class="text-h6">Auto Michi layout</div>
          <div class="text-body2 text-grey-4">
            Build a complete proposal from every owned card, wanted card, proxy, and illustration.
          </div>
        </q-card-section>
        <q-separator dark />
        <q-card-section class="michi-dialog-body">
          <div class="michi-options">
            <q-select v-model="michiMode" :options="michiModeOptions" emit-value map-options dark outlined label="Organization" />
            <div v-if="michiMode === 'pokedex'">
              <div class="text-caption text-grey-4 q-mb-xs">Regional forms</div>
              <q-option-group v-model="michiPokedexForms" :options="michiPokedexFormOptions"
                type="radio" color="primary" dense />
            </div>
            <q-input v-model.number="michiSeed" type="number" dark outlined label="Variation seed" />
            <q-btn color="primary" text-color="black" icon="auto_awesome" label="Generate preview"
              :loading="michiGenerating" @click="generateMichiProposal()" />
            <q-btn v-if="michiProposal" outline color="primary" icon="shuffle" label="Try another variation"
              :disable="michiGenerating" @click="generateMichiProposal(true)" />
          </div>
          <div class="michi-preview">
            <q-banner v-if="michiError" class="bg-red-10 text-white rounded-borders q-mb-md">
              {{ michiError }}
            </q-banner>
            <template v-if="michiProposal">
              <q-banner v-for="warning in michiProposal.warnings" :key="warning" class="bg-orange-10 text-white rounded-borders q-mb-sm">
                {{ warning }}
              </q-banner>
              <div class="text-subtitle2 q-mb-sm">Proposed binder</div>
              <div class="michi-page-list">
                <div v-for="spread in michiPreviewSpreads" :key="spread.key" class="row q-col-gutter-md">
                  <div v-for="side in spread.sides" :key="side.sideIndex" class="col-6"
                    :class="{ 'offset-6': spread.align === 'right' }">
                    <div class="text-caption text-center text-grey-4 q-mb-xs">Page {{ side.sideIndex + 1 }}</div>
                    <div class="michi-page" :style="{ gridTemplateColumns: `repeat(${binderColumns}, 1fr)` }">
                      <div v-for="decoration in side.decorations" :key="decoration.image.id" class="michi-decoration" :style="{
                        gridColumn: `${decoration.placement.column + 1} / span ${decoration.image.width}`,
                        gridRow: `${decoration.placement.row + 1} / span ${decoration.image.height}`
                      }">
                        <img :src="binderAssetUrl(decoration.image.id, 'image')" :alt="decoration.image.name" />
                      </div>
                      <div v-for="cell in side.cells" :key="cell.index" class="michi-cell"
                        :style="{ gridColumn: cell.column + 1, gridRow: cell.row + 1 }">
                        <img v-if="cell.imageUrl" :src="cell.imageUrl" :alt="cell.name" />
                        <q-icon v-else-if="cell.name" name="style" color="grey-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <div v-else-if="!michiError" class="full-height column items-center justify-center text-grey-5 text-center q-pa-xl">
              <q-icon name="auto_awesome" size="48px" />
              <div class="q-mt-md">Choose the layout rules, then generate a non-destructive preview.</div>
            </div>
          </div>
        </q-card-section>
        <q-separator dark />
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" icon="check" label="Apply layout"
            :disable="!michiProposal || michiGenerating" @click="applyMichiProposal" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showAssetDialog">
      <q-card class="bg-grey-10 text-white" style="width: 500px; max-width: 92vw">
        <q-card-section>
          <div class="text-h6">Add {{ assetKind === 'proxy' ? 'proxy card' : 'binder image' }}</div>
          <div class="text-body2 text-grey-4">
            {{
              assetKind === 'proxy'
                ? 'A proxy occupies one card slot and does not enter your collection.'
                : 'The image sits behind slots, so cards can be placed on top.'
            }}
          </div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model="assetName" dark outlined :label="assetKind === 'proxy' ? 'Proxy name' : 'Image name'" />
          <template v-if="assetKind === 'proxy'">
            <q-input v-model="assetDate" dark outlined label="Date (optional)" mask="##/##/####" placeholder="DD/MM/YYYY" :error="!isValidProxyDate(assetDate)"
              error-message="Use a valid DD/MM/YYYY date" />
            <q-input v-model.number="assetQuantity" type="number" min="1" step="1" dark outlined label="Quantity" />
          </template>
          <div v-if="assetKind === 'image'">
            <div class="row q-gutter-md no-wrap items-start">
              <div class="col">
                <q-select class="full-width" v-model="assetWidth" :options="assetDimensions" dark outlined label="Width in slots" />
              </div>
              <div class="col">
                <q-select class="full-width" v-model="assetHeight" :options="assetDimensions" dark outlined label="Height in slots" />
              </div>
            </div>
          </div>
          <q-file v-model="assetFile" dark outlined accept="image/jpeg,image/png,image/webp" label="Choose image" @update:model-value="prepareAssetImage">
            <template #prepend><q-icon name="image" /></template>
          </q-file>
          <div v-if="assetPreview" class="crop-editor">
            <div class="text-subtitle2">Crop and position</div>
            <div class="text-caption text-grey-4 q-mb-sm">
              The highlighted frame is the exact proportion used in the binder.
            </div>
            <div class="crop-frame" :style="cropFrameStyle">
              <canvas ref="cropCanvas" class="crop-canvas" />
            </div>
            <q-slider v-model="cropZoom" :min="1" :max="3" :step="0.01" label label-always :label-value="`Zoom ${cropZoom.toFixed(2)}×`" />
            <div class="crop-position-control">
              <div class="row items-center no-wrap">
                <q-icon name="swap_horiz" class="q-mr-sm" />
                <span class="text-caption">Horizontal position</span>
                <span v-if="!canCropX" class="text-caption text-grey-5 q-ml-auto">Zoom in to move</span>
              </div>
              <q-slider v-model="cropX" :min="-100" :max="100" :disable="!canCropX" />
            </div>
            <div class="crop-position-control">
              <div class="row items-center no-wrap">
                <q-icon name="swap_vert" class="q-mr-sm" />
                <span class="text-caption">Vertical position</span>
                <span v-if="!canCropY" class="text-caption text-grey-5 q-ml-auto">Zoom in to move</span>
              </div>
              <q-slider v-model="cropY" :min="-100" :max="100" :disable="!canCropY" />
            </div>
          </div>
          <div v-if="assetError" class="text-negative">{{ assetError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" label="Add"
            :disable="!assetName.trim() || !assetDataUrl || (assetKind === 'proxy' && (assetQuantity < 1 || !isValidProxyDate(assetDate)))" :loading="assetSaving"
            @click="saveAsset" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showBulkImageDialog">
      <q-card class="bg-grey-10 text-white" style="width: 560px; max-width: 92vw">
        <q-card-section>
          <div class="text-h6">Add multiple binder images</div>
          <div class="text-body2 text-grey-4">Each image gets a generic name and the closest slot size for its proportions.</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-file v-model="bulkImageFiles" multiple dark outlined use-chips counter accept="image/jpeg,image/png,image/webp" label="Choose images"
            :disable="bulkImageSaving" @update:model-value="prepareBulkImages">
            <template #prepend><q-icon name="collections" /></template>
          </q-file>
          <q-list v-if="bulkImageRows.length" bordered separator class="rounded-borders">
            <q-item v-for="row in bulkImageRows" :key="`${row.file.name}-${row.file.lastModified}`">
              <q-item-section avatar>
                <q-icon :name="row.status === 'done' ? 'check_circle' : row.status === 'error' ? 'error' : 'image'"
                  :color="row.status === 'done' ? 'positive' : row.status === 'error' ? 'negative' : 'grey-4'" />
              </q-item-section>
              <q-item-section>
                <q-item-label lines="1">{{ row.file.name }}</q-item-label>
                <q-item-label caption>
                  {{ row.width }} × {{ row.height }} slots
                  <span v-if="row.status === 'uploading'"> · Uploading…</span>
                  <span v-else-if="row.error" class="text-negative"> · {{ row.error }}</span>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-if="bulkImageError" class="text-negative">{{ bulkImageError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" :disable="bulkImageSaving" v-close-popup />
          <q-btn color="primary" text-color="black" label="Add all" :disable="!bulkImageRows.some(row => row.status === 'ready') || bulkImagePreparing"
            :loading="bulkImageSaving || bulkImagePreparing" @click="saveBulkImages" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEditAssetDialog">
      <q-card class="bg-grey-10 text-white" style="width: 600px; max-width: 92vw; max-height: 90vh; overflow-y: auto">
        <q-card-section>
          <div class="text-h6">Edit {{ editAssetKind === 'proxy' ? 'proxy' : 'image' }}</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model="editName" dark outlined label="Name" autofocus />
          <template v-if="editAssetKind === 'proxy'">
            <q-input v-model="editDate" dark outlined label="Date (optional)" mask="##/##/####" placeholder="DD/MM/YYYY" :error="!isValidProxyDate(editDate)"
              error-message="Use a valid DD/MM/YYYY date" />
            <q-input v-model.number="editQuantity" type="number" min="1" step="1" dark outlined label="Quantity" />
          </template>
          <div v-else>
            <div class="row q-gutter-md no-wrap items-start">
              <div class="col">
                <q-select class="full-width" v-model="editWidth" :options="assetDimensions" dark outlined label="Width in slots"
                  @update:model-value="resetEditCardSlots" />
              </div>
              <div class="col">
                <q-select class="full-width" v-model="editHeight" :options="assetDimensions" dark outlined label="Height in slots"
                  @update:model-value="resetEditCardSlots" />
              </div>
            </div>
            <div>
              <div class="text-subtitle2">Crop, position, and card areas</div>
              <div class="text-caption text-grey-4 q-mb-sm">
                Select the image areas where a card may be placed. Unselected areas remain reserved for the illustration.
              </div>
              <div class="crop-frame" :style="editCropFrameStyle">
                <canvas ref="editCropCanvas" class="crop-canvas" />
                <div class="crop-slot-grid" :style="{
                  gridTemplateColumns: `repeat(${editWidth}, 1fr)`,
                  gridTemplateRows: `repeat(${editHeight}, 1fr)`
                }">
                  <button v-for="index in editWidth * editHeight" :key="index" type="button" class="crop-slot-toggle"
                    :class="{ 'crop-slot-toggle--selected': editCardSlots.includes(index - 1) }"
                    :aria-label="`${editCardSlots.includes(index - 1) ? 'Disallow' : 'Allow'} card in image area ${index}`" @click="toggleEditCardSlot(index - 1)">
                    <q-icon :name="editCardSlots.includes(index - 1) ? 'style' : 'block'" />
                  </button>
                </div>
              </div>
              <q-slider v-model="editCropZoom" :min="1" :max="3" :step="0.01" label label-always :label-value="`Zoom ${editCropZoom.toFixed(2)}×`" />
              <div class="crop-position-control">
                <div class="row items-center no-wrap">
                  <q-icon name="swap_horiz" class="q-mr-sm" />
                  <span class="text-caption">Horizontal position</span>
                  <span v-if="!canEditCropX" class="text-caption text-grey-5 q-ml-auto">Zoom in to move</span>
                </div>
                <q-slider v-model="editCropX" :min="-100" :max="100" :disable="!canEditCropX" />
              </div>
              <div class="crop-position-control">
                <div class="row items-center no-wrap">
                  <q-icon name="swap_vert" class="q-mr-sm" />
                  <span class="text-caption">Vertical position</span>
                  <span v-if="!canEditCropY" class="text-caption text-grey-5 q-ml-auto">Zoom in to move</span>
                </div>
                <q-slider v-model="editCropY" :min="-100" :max="100" :disable="!canEditCropY" />
              </div>
            </div>
            <div v-if="editAssetError" class="text-negative">{{ editAssetError }}</div>
            <q-banner v-if="editReservedSlotConflicts" class="bg-red-10 text-white rounded-borders">
              {{ editReservedSlotConflicts }} occupied card
              {{ editReservedSlotConflicts === 1 ? 'slot is' : 'slots are' }} marked as illustration-only.
              Remove those cards or allow cards in those areas before saving.
            </q-banner>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" label="Save" :disable="!editName.trim() || editQuantity < 1 || editReservedSlotConflicts > 0
            || (editAssetKind === 'proxy' && !isValidProxyDate(editDate))" :loading="editAssetSaving" @click="saveAssetEdits" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="deleteTarget !== null" @update:model-value="value => { if (!value) deleteTarget = null; }">
      <q-card class="bg-grey-10 text-white" style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Delete {{ deleteTarget?.kind === 'proxy' ? 'proxy' : 'image' }}?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            “{{ deleteTarget?.name }}” will be permanently deleted
            {{ deleteTarget?.kind === 'proxy' ? 'and removed from every binder slot.' : 'and removed from its binder page.' }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" @click="deleteTarget = null" />
          <q-btn color="negative" label="Delete" :loading="deleteSaving" @click="confirmDeleteAsset" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="gotItTarget !== null" @update:model-value="value => { if (!value) gotItTarget = null; }">
      <q-card class="bg-grey-10 text-white" style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Mark card as owned</div>
          <div class="text-body2 text-grey-4">{{ gotItCardName }}</div>
        </q-card-section>
        <q-card-section>
          <q-select v-model="gotItCondition" :options="conditionOptions" emit-value map-options dark outlined label="Condition" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" @click="gotItTarget = null" />
          <q-btn color="primary" text-color="black" label="OK" @click="confirmGotIt" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch, watchEffect } from 'vue';
  import { useRoute } from 'vue-router';
  import { binderSlotsPerPage, binderStore } from '../utils/binders';
  import type { BinderImage, BinderLayout, BinderProxy } from '../utils/binders';
  import { cardConditions, collectionStore } from '../utils/collection';
  import type { CardCondition, CollectionEntry } from '../utils/collection';
  import { buildDisplayCard, compareCardReleaseAndNumber } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { getCardById, getPokemon, getSetById } from '../utils/dataManagement';
  import { localizedValue } from '../utils/localization';
  import { resolveCardImage } from '../utils/cardImages';
  import { manualImageStore } from '../utils/manualImages';
  import CardSortSelector from '../components/CardSortSelector.vue';
  import type { CardSort } from '../utils/cardSorting';
  import { cardmarketDisplayPrice } from '../utils/cardDisplay';
  import { downloadBinderImagesPdf } from '../utils/binderImagesPdf';
  import { generateMichiLayout } from '../utils/michiOrganizer';
  import type { MichiLayoutProposal, MichiMode } from '../utils/michiOrganizer';
  import { pokedexPlaceholderCard } from '../utils/pokedexBinder';

  type BinderRow = {
    entry: CollectionEntry;
    card: DisplayCard;
    available: number;
    releaseDate: string | null;
    pokedexNumber: number | null;
    price: number | null;
  };
  type SelectorTab = 'collection' | 'wanted' | 'proxies' | 'images';
  type BulkImageRow = {
    file: File;
    width: number;
    height: number;
    status: 'ready' | 'uploading' | 'done' | 'error';
    error: string | null;
  };

  const route = useRoute();
  const folderId = computed(() => String(route.params.folderId ?? ''));
  const folder = computed(() => collectionStore.folders.value.find((candidate) => candidate.id === folderId.value) ?? null);
  const binder = computed(() => binderStore.get(folderId.value));
  const showCreateDialog = computed(() => Boolean(
    folder.value?.type === 'binder' && binderStore.isReady.value && !binder.value
  ));
  const showSettings = ref(false);
  const showMichiDialog = ref(false);
  const michiMode = ref<MichiMode>('date');
  const michiPokedexForms = ref<'number' | 'regional'>('number');
  const michiSeed = ref(1);
  const michiGenerating = ref(false);
  const michiProposal = ref<MichiLayoutProposal | null>(null);
  const michiError = ref<string | null>(null);
  const newPageCount = ref(20);
  const newLayout = ref<BinderLayout>('3x3');
  const settingsPageCount = ref(1);
  const settingsLayout = ref<BinderLayout>('3x3');
  const currentSpread = ref(0);
  const search = ref('');
  const selectedCardSort = ref<CardSort>('release-desc');
  const selectorTab = ref<SelectorTab>('collection');
  const showAssetDialog = ref(false);
  const assetKind = ref<'proxy' | 'image'>('proxy');
  const assetName = ref('');
  const assetQuantity = ref(1);
  const assetDate = ref('');
  const assetWidth = ref(1);
  const assetHeight = ref(1);
  const assetFile = ref<File | null>(null);
  const assetDataUrl = ref<string | null>(null);
  const assetPreview = ref<string | null>(null);
  const assetError = ref<string | null>(null);
  const assetSaving = ref(false);
  const showBulkImageDialog = ref(false);
  const bulkImageFiles = ref<File[] | null>(null);
  const bulkImageRows = ref<BulkImageRow[]>([]);
  const bulkImagePreparing = ref(false);
  const bulkImageSaving = ref(false);
  const bulkImageError = ref<string | null>(null);
  const cropCanvas = ref<HTMLCanvasElement | null>(null);
  const cropImage = ref<HTMLImageElement | null>(null);
  const cropZoom = ref(1);
  const cropX = ref(0);
  const cropY = ref(0);
  const showEditAssetDialog = ref(false);
  const editAssetKind = ref<'proxy' | 'image'>('proxy');
  const editAssetId = ref('');
  const editName = ref('');
  const editQuantity = ref(1);
  const editDate = ref('');
  const editWidth = ref(1);
  const editHeight = ref(1);
  const editOriginalWidth = ref(1);
  const editOriginalHeight = ref(1);
  const editCardSlots = ref<number[]>([]);
  const editCropCanvas = ref<HTMLCanvasElement | null>(null);
  const editCropImage = ref<HTMLImageElement | null>(null);
  const editCropZoom = ref(1);
  const editCropX = ref(0);
  const editCropY = ref(0);
  const editOriginalCropZoom = ref(1);
  const editOriginalCropX = ref(0);
  const editOriginalCropY = ref(0);
  const editAssetSaving = ref(false);
  const editAssetError = ref<string | null>(null);
  const deleteTarget = ref<{ kind: 'proxy' | 'image'; id: string; name: string; } | null>(null);
  const deleteSaving = ref(false);
  const selectedImageIds = ref<string[]>([]);
  const imagesPdfSaving = ref(false);
  const imagesPdfError = ref<string | null>(null);
  const gotItTarget = ref<{ slotIndex: number; entryId: string; } | null>(null);
  const gotItCondition = ref<CardCondition>('NM');
  const layoutOptions = [
    { label: '2 × 2 — 4 cards per page', value: '2x2' },
    { label: '3 × 3 — 9 cards per page', value: '3x3' }
  ];
  const michiModeOptions = [
    { label: 'Date first', value: 'date' },
    { label: 'Pokédex order', value: 'pokedex' },
    { label: 'Color first', value: 'color' }
  ];
  const michiPokedexFormOptions = [
    { label: 'One slot per Pokédex number', value: 'number' },
    { label: 'Separate regional forms', value: 'regional' }
  ];
  const conditionOptions = cardConditions.map((condition) => ({ ...condition }));
  const isValidProxyDate = (value: string): boolean => {
    if (!value) return true;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return false;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  const pokemon = getPokemon();
  const pokemonById = new Map(pokemon.map((entry) => [entry.id, entry]));
  const pokedexByPokemonId = new Map(pokemon.map((entry) => [entry.id, entry.pokedex_id]));
  const pokedexByPokemonName = new Map(pokemon.flatMap((entry) =>
    [entry.name, ...Object.values(entry.names).filter((name): name is string => Boolean(name))]
      .map((name) => [name.toLocaleLowerCase(), entry.pokedex_id] as const)
  ));

  const cardForEntry = (entry: CollectionEntry): DisplayCard | null => {
    if (entry.set_id === 'pokedex-requirement' && entry.pokedex_requirement_id) {
      return pokedexPlaceholderCard(
        entry.pokedex_requirement_id,
        entry.pokedex_candidate_count ?? 0,
        folder.value?.pokedex_config?.international_language_id ?? 'en',
        folder.value?.pokedex_config
      );
    }
    if (entry.set_id === 'manual-collection') {
      const manual = collectionStore.manualCards.value.find((card) => card.id === entry.card_id);
      if (!manual) return null;
      const image = resolveCardImage({}, entry.language_id, entry.language_id, {
        setId: 'manual-collection', cardId: manual.id, variantId: entry.variant_id
      });
      return {
        id: manual.id, card_id: manual.id, set_id: entry.set_id, set_name: manual.set_name || null,
        language_id: entry.language_id, variant_id: entry.variant_id, number: manual.number || '?',
        display_name: manual.name, category: manual.category, rarity: manual.rarity, hp: manual.hp,
        illustrator: manual.illustrator || null, types: manual.types,
        pokemon_names: manual.pokemon_name ? [manual.pokemon_name] : [], energy_costs: [],
        image_url: image.url, image_language_id: image.languageId, image_is_fallback: false,
        image_source: image.source, cardmarket: null, is_manual: true, estimated_value: manual.estimated_value
      };
    }
    const card = getCardById(entry.set_id, entry.card_id);
    const set = getSetById(entry.set_id);
    const variant = card?.variants.find((candidate) => candidate.id === entry.variant_id);
    if (!card || !variant) return null;
    return buildDisplayCard(card, variant, entry.language_id, set ? localizedValue(set.name, entry.language_id) ?? set.id : null);
  };

  const baseRows = computed(() => collectionStore.entries.value
    .filter((entry) => entry.folder_id === folderId.value)
    .flatMap((entry): Array<Omit<BinderRow, 'available'>> => {
      const card = cardForEntry(entry);
      if (!card) return [];
      const manual = entry.set_id === 'manual-collection'
        ? collectionStore.manualCards.value.find((candidate) => candidate.id === entry.card_id)
        : null;
      const set = entry.set_id === 'manual-collection' ? null : getSetById(entry.set_id);
      const pokedexNumbers = card.pokemon_names
        .map((pokemonId) => pokedexByPokemonId.get(pokemonId))
        .filter((number): number is number => number !== undefined);
      return [{
        entry,
        card,
        releaseDate: manual?.release_date ?? set?.release_date ?? null,
        pokedexNumber: pokedexNumbers.length
          ? Math.min(...pokedexNumbers)
          : manual?.pokemon_name
            ? pokedexByPokemonName.get(manual.pokemon_name.toLocaleLowerCase()) ?? null
            : null,
        price: manual?.estimated_value ?? cardmarketDisplayPrice(card.cardmarket)
      }];
    }));
  const usedCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const entryId of binder.value?.slots ?? []) {
      if (entryId) counts.set(entryId, (counts.get(entryId) ?? 0) + 1);
    }
    return counts;
  });
  const rows = computed<BinderRow[]>(() => baseRows.value.map((row) => ({
    ...row,
    available: Math.max(0, row.entry.quantity - (usedCounts.value.get(row.entry.id) ?? 0))
  })));
  const availableRows = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return rows.value
      .filter((row) => row.entry.wanted === (selectorTab.value === 'wanted'))
      .filter((row) =>
        !query || row.card.display_name.toLocaleLowerCase().includes(query) || row.card.set_name?.toLocaleLowerCase().includes(query)
      )
      .sort((left, right) => {
        if (selectedCardSort.value === 'pokedex-asc' || selectedCardSort.value === 'pokedex-desc') {
          if (left.pokedexNumber === null && right.pokedexNumber !== null) return 1;
          if (left.pokedexNumber !== null && right.pokedexNumber === null) return -1;
          if (left.pokedexNumber !== null && right.pokedexNumber !== null && left.pokedexNumber !== right.pokedexNumber) {
            return selectedCardSort.value === 'pokedex-asc'
              ? left.pokedexNumber - right.pokedexNumber
              : right.pokedexNumber - left.pokedexNumber;
          }
        }
        if (selectedCardSort.value === 'price-asc' || selectedCardSort.value === 'price-desc') {
          if (left.price === null && right.price !== null) return 1;
          if (left.price !== null && right.price === null) return -1;
          if (left.price !== null && right.price !== null && left.price !== right.price) {
            return selectedCardSort.value === 'price-asc' ? left.price - right.price : right.price - left.price;
          }
        }
        if (selectedCardSort.value === 'release-asc' || selectedCardSort.value === 'release-desc') {
          const comparison = compareCardReleaseAndNumber(
            left.releaseDate,
            right.releaseDate,
            left.card.number,
            right.card.number,
            selectedCardSort.value === 'release-asc' ? 'asc' : 'desc'
          );
          if (comparison !== 0) return comparison;
        }
        return left.card.display_name.localeCompare(right.card.display_name);
      });
  });
  const binderColumns = computed(() => binder.value?.layout === '2x2' ? 2 : 3);
  const assetDimensions = computed(() => Array.from({ length: binderColumns.value }, (_, index) => index + 1));
  const selectorHelp = computed(() => ({
    collection: 'Drag owned cards into slots. Each copy can be placed once.',
    wanted: 'Drag wanted cards into slots. They remain visually distinct in black and white.',
    proxies: 'Upload custom proxy cards and place each one in a card slot.',
    images: 'Upload background images that can span several slots.'
  }[selectorTab.value]));
  const usedProxyCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const slot of binder.value?.slots ?? []) {
      if (!slot?.startsWith('proxy:')) continue;
      const proxyId = slot.slice(6);
      counts.set(proxyId, (counts.get(proxyId) ?? 0) + 1);
    }
    return counts;
  });
  const proxyAvailable = (proxy: BinderProxy): number =>
    Math.max(0, proxy.quantity - (usedProxyCounts.value.get(proxy.id) ?? 0));
  const placedImageIds = computed(() => new Set((binder.value?.image_placements ?? []).map((placement) => placement.image_id)));
  const isPageLocked = (sideIndex: number): boolean => binder.value?.locked_pages.includes(sideIndex) ?? false;
  const isSlotLocked = (slotIndex: number): boolean => Boolean(
    binder.value && isPageLocked(Math.floor(slotIndex / binderSlotsPerPage(binder.value.layout)))
  );
  const isAssetLocked = (kind: 'proxy' | 'image', assetId: string): boolean => {
    if (!binder.value) return false;
    if (kind === 'image') {
      return binder.value.image_placements.some((placement) =>
        placement.image_id === assetId && isPageLocked(placement.side_index)
      );
    }
    return binder.value.slots.some((slot, index) => slot === `proxy:${assetId}` && isSlotLocked(index));
  };
  const editReservedSlotConflicts = computed(() => {
    if (editAssetKind.value !== 'image' || !binder.value) return 0;
    const placement = binder.value.image_placements.find((candidate) => candidate.image_id === editAssetId.value);
    if (!placement) return 0;
    const dimension = binderColumns.value;
    const placedRow = Math.min(placement.row, dimension - editHeight.value);
    const placedColumn = Math.min(placement.column, dimension - editWidth.value);
    let conflicts = 0;
    for (let row = 0; row < editHeight.value; row += 1) {
      for (let column = 0; column < editWidth.value; column += 1) {
        if (editCardSlots.value.includes(row * editWidth.value + column)) continue;
        const slotIndex = placement.side_index * binderSlotsPerPage(binder.value.layout)
          + (placedRow + row) * dimension
          + placedColumn + column;
        if (binder.value.slots[slotIndex]) conflicts += 1;
      }
    }
    return conflicts;
  });
  const filteredProxies = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return (binder.value?.proxies ?? []).filter((proxy) => !query || proxy.name.toLocaleLowerCase().includes(query));
  });
  const filteredImages = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return (binder.value?.images ?? []).filter((image) => !query || image.name.toLocaleLowerCase().includes(query));
  });
  const settingsChanged = computed(() =>
    Boolean(binder.value && (
      settingsPageCount.value !== binder.value.page_count
      || settingsLayout.value !== binder.value.layout
    ))
  );
  const binderAssetUrl = (assetId: string, kind: 'proxy' | 'image'): string => {
    const asset = manualImageStore.find('binder-assets', folderId.value, assetId, kind);
    return asset ? `${asset.url}?v=${encodeURIComponent(asset.updated_at)}` : '';
  };
  const openMichiDialog = (): void => {
    michiProposal.value = null;
    michiError.value = null;
    showMichiDialog.value = true;
  };
  const regionalForms = new Set(['alolan', 'galarian', 'hisuian', 'paldean']);
  const pokedexGroupKeyForRow = (row: Omit<BinderRow, 'available'>): string | null => {
    if (row.pokedexNumber === null) return null;
    if (michiPokedexForms.value === 'number') return `pokemon:${row.pokedexNumber}`;
    const matchingPokemon = row.card.pokemon_names
      .map((pokemonId) => pokemonById.get(pokemonId))
      .filter((entry) => entry?.pokedex_id === row.pokedexNumber)
      .sort((left, right) => Number(Boolean(left?.form)) - Number(Boolean(right?.form)))[0];
    const form = matchingPokemon?.form && regionalForms.has(matchingPokemon.form)
      ? matchingPokemon.form
      : 'base';
    return `pokemon:${row.pokedexNumber}:${form}`;
  };
  const michiPokedexSlots = (): Array<{ key: string; order: number; name: string }> => {
    const slots = new Map<string, { key: string; order: number; name: string }>();
    for (const entry of pokemon) {
      const form = michiPokedexForms.value === 'regional' && entry.form && regionalForms.has(entry.form)
        ? entry.form
        : 'base';
      const key = michiPokedexForms.value === 'number'
        ? `pokemon:${entry.pokedex_id}`
        : `pokemon:${entry.pokedex_id}:${form}`;
      if (!slots.has(key)) {
        slots.set(key, {
          key,
          order: entry.pokedex_id,
          name: form === 'base' ? entry.name : `${entry.name} (${form})`
        });
      }
    }
    return [...slots.values()].sort((left, right) => {
      const pokedexDifference = left.order - right.order;
      if (pokedexDifference) return pokedexDifference;
      const leftIsBase = left.key.endsWith(':base');
      const rightIsBase = right.key.endsWith(':base');
      if (leftIsBase !== rightIsBase) return leftIsBase ? -1 : 1;
      return left.key.localeCompare(right.key);
    });
  };
  const generateMichiProposal = async (nextVariation = false): Promise<void> => {
    if (!binder.value || michiGenerating.value) return;
    if (nextVariation) michiSeed.value += 1;
    michiGenerating.value = true;
    michiError.value = null;
    try {
      michiProposal.value = await generateMichiLayout({
        pageCount: binder.value.page_count,
        layout: binder.value.layout,
        currentSlots: binder.value.slots,
        currentImagePlacements: binder.value.image_placements,
        cards: [
          ...baseRows.value.map((row) => ({
            slotValue: row.entry.id,
            name: row.card.display_name,
            imageUrl: row.card.image_url,
            date: row.releaseDate,
            groupKey: `${row.entry.set_id}:${row.releaseDate ?? 'unknown'}`,
            setOrder: row.card.number,
            undatedFlexible: false,
            pokedexOrder: row.pokedexNumber,
            pokedexGroupKey: pokedexGroupKeyForRow(row),
            isProxy: false,
            quantity: row.entry.quantity
          })),
          ...binder.value.proxies.map((proxy) => ({
            slotValue: `proxy:${proxy.id}`,
            name: proxy.name,
            imageUrl: binderAssetUrl(proxy.id, 'proxy') || null,
            date: proxy.date ?? null,
            groupKey: `proxy:${proxy.id}:${proxy.date ?? 'unknown'}`,
            setOrder: proxy.name,
            undatedFlexible: !proxy.date,
            pokedexOrder: null,
            pokedexGroupKey: null,
            isProxy: true,
            quantity: proxy.quantity
          }))
        ],
        images: binder.value.images.map((image) => ({
          ...image,
          imageUrl: binderAssetUrl(image.id, 'image')
        })),
        pokedexSlots: michiMode.value === 'pokedex' ? michiPokedexSlots() : [],
        options: {
          mode: michiMode.value,
          lockedPages: binder.value.locked_pages,
          seed: Math.floor(michiSeed.value) || 1
        }
      });
    } catch (error) {
      michiProposal.value = null;
      michiError.value = error instanceof Error ? error.message : String(error);
    } finally {
      michiGenerating.value = false;
    }
  };
  const michiPreviewContent = (slotValue: string | null): { name: string; imageUrl: string | null } => {
    if (!slotValue) return { name: '', imageUrl: null };
    if (slotValue.startsWith('proxy:')) {
      const proxyId = slotValue.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
      return { name: proxy?.name ?? 'Proxy', imageUrl: binderAssetUrl(proxyId, 'proxy') || null };
    }
    const row = baseRows.value.find((candidate) => candidate.entry.id === slotValue);
    return { name: row?.card.display_name ?? 'Card', imageUrl: row?.card.image_url ?? null };
  };
  const michiPreviewSides = computed(() => {
    if (!binder.value || !michiProposal.value) return [];
    const sideSize = binderSlotsPerPage(binder.value.layout);
    const previewSlots = michiProposal.value.slots;
    const previewPlacements = michiProposal.value.imagePlacements;
    return Array.from({ length: binder.value.page_count * 2 }, (_, sideIndex) => ({
      sideIndex,
      cells: previewSlots
        .slice(sideIndex * sideSize, (sideIndex + 1) * sideSize)
        .map((slotValue, index) => ({
          index,
          row: Math.floor(index / binderColumns.value),
          column: index % binderColumns.value,
          ...michiPreviewContent(slotValue)
        })),
      decorations: previewPlacements
        .filter((placement) => placement.side_index === sideIndex)
        .flatMap((placement) => {
          const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
          return image ? [{ image, placement }] : [];
        })
    }));
  });
  const michiPreviewSpreads = computed(() => {
    const sides = michiPreviewSides.value;
    if (!sides.length) return [];
    const spreads: Array<{
      key: string;
      sides: typeof sides;
      align: 'left' | 'right' | 'pair';
    }> = [{ key: 'opening', sides: [sides[0]], align: 'right' }];
    for (let index = 1; index < sides.length; index += 2) {
      const spreadSides = sides.slice(index, index + 2);
      spreads.push({
        key: `spread-${index}`,
        sides: spreadSides,
        align: spreadSides.length === 1 ? 'left' : 'pair'
      });
    }
    return spreads;
  });
  const applyMichiProposal = (): void => {
    if (!binder.value || !michiProposal.value) return;
    binderStore.applyLayout(folderId.value, michiProposal.value.slots, michiProposal.value.imagePlacements);
    currentSpread.value = 0;
    showMichiDialog.value = false;
  };

  const printSelectedImages = async (): Promise<void> => {
    if (!binder.value || !folder.value) return;
    imagesPdfSaving.value = true;
    imagesPdfError.value = null;
    try {
      await downloadBinderImagesPdf(
        folder.value.name,
        binder.value.images
          .filter((image) => selectedImageIds.value.includes(image.id))
          .map((image) => ({ ...image, url: binderAssetUrl(image.id, 'image') }))
      );
    } catch (error) {
      imagesPdfError.value = error instanceof Error ? error.message : String(error);
    } finally {
      imagesPdfSaving.value = false;
    }
  };
  const slotContent = (slotValue: string | null): {
    name: string;
    imageUrl: string | null;
    wanted: boolean;
    entryId: string | null;
    status: string | null;
    pokedexRequirement: boolean;
  } | null => {
    if (!slotValue) return null;
    if (slotValue.startsWith('proxy:')) {
      const proxyId = slotValue.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
      return proxy
        ? { name: proxy.name, imageUrl: binderAssetUrl(proxy.id, 'proxy'), wanted: false, entryId: null, status: null, pokedexRequirement: false }
        : null;
    }
    const row = rows.value.find((candidate) => candidate.entry.id === slotValue);
    return row
      ? { name: row.card.display_name, imageUrl: row.card.image_url, wanted: row.entry.wanted, entryId: row.entry.id,
        status: collectionStore.pokedexEntryStatus(row.entry.id), pokedexRequirement: Boolean(row.entry.pokedex_requirement_id) }
      : null;
  };
  const slotsForSide = (sideIndex: number) => {
    if (!binder.value) return [];
    const count = binderSlotsPerPage(binder.value.layout);
    const start = sideIndex * count;
    return binder.value.slots.slice(start, start + count).map((entryId, offset) => {
      const rowIndex = Math.floor(offset / binderColumns.value);
      const column = offset % binderColumns.value;
      const coveringDecorations = binder.value?.image_placements.flatMap((placement) => {
        if (placement.side_index !== sideIndex) return [];
        const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
        const coversSlot = Boolean(
          image
          && rowIndex >= placement.row
          && rowIndex < placement.row + image.height
          && column >= placement.column
          && column < placement.column + image.width
        );
        return coversSlot && image ? [{ image, placement }] : [];
      }) ?? [];
      const hasDecoration = coveringDecorations.length > 0;
      const acceptsCard = coveringDecorations.every(({ image, placement }) => {
        const relativeRow = rowIndex - placement.row;
        const relativeColumn = column - placement.column;
        return image.card_slots.includes(relativeRow * image.width + relativeColumn);
      });
      return {
        index: start + offset,
        rowIndex,
        column,
        hasDecoration,
        acceptsCard,
        content: slotContent(entryId)
      };
    });
  };
  const decorationsForSide = (sideIndex: number) => {
    if (!binder.value) return [];
    return binder.value.image_placements
      .filter((placement) => placement.side_index === sideIndex)
      .flatMap((placement) => {
        const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
        return image ? [{ placement, image }] : [];
      });
  };
  const visibleSides = computed(() => {
    const pageCount = binder.value?.page_count ?? 0;
    const leftSideIndex = currentSpread.value === 0 ? null : currentSpread.value * 2 - 1;
    const rightSideIndex = currentSpread.value >= pageCount ? null : currentSpread.value * 2;
    return [
      {
        position: 'left',
        sideIndex: leftSideIndex,
        label: leftSideIndex === null ? '' : `Page ${currentSpread.value}`,
        slots: leftSideIndex === null ? [] : slotsForSide(leftSideIndex),
        decorations: leftSideIndex === null ? [] : decorationsForSide(leftSideIndex)
      },
      {
        position: 'right',
        sideIndex: rightSideIndex,
        label: rightSideIndex === null ? '' : `Page ${currentSpread.value + 1}`,
        slots: rightSideIndex === null ? [] : slotsForSide(rightSideIndex),
        decorations: rightSideIndex === null ? [] : decorationsForSide(rightSideIndex)
      }
    ];
  });
  const spreadLabel = computed(() => {
    const pageCount = binder.value?.page_count ?? 0;
    if (currentSpread.value === 0) return 'Page 1';
    if (currentSpread.value === pageCount) return `Page ${pageCount}`;
    return `Pages ${currentSpread.value}–${currentSpread.value + 1}`;
  });

  watchEffect(() => {
    if (!binderStore.isReady.value || !collectionStore.isFileConnected.value || !binder.value) return;
    const quantities = new Map(baseRows.value.map((row) => [row.entry.id, row.entry.quantity]));
    binderStore.clean(folderId.value, quantities);
    if (binder.value && currentSpread.value > binder.value.page_count) {
      currentSpread.value = binder.value.page_count;
    }
  });

  const createBinder = (): void => {
    binderStore.create(folderId.value, newPageCount.value, newLayout.value);
  };
  const togglePageLock = (sideIndex: number): void => {
    binderStore.setPageLocked(folderId.value, sideIndex, !isPageLocked(sideIndex));
  };
  const openSettings = (): void => {
    if (!binder.value || binder.value.locked_pages.length) return;
    settingsPageCount.value = binder.value.page_count;
    settingsLayout.value = binder.value.layout;
    showSettings.value = true;
  };
  const saveSettings = (): void => {
    if (binder.value?.locked_pages.length || !settingsChanged.value || settingsPageCount.value < 1) return;
    binderStore.resetSettings(folderId.value, settingsPageCount.value, settingsLayout.value);
    currentSpread.value = 0;
    showSettings.value = false;
  };
  const openAssetDialog = (tab: SelectorTab): void => {
    assetKind.value = tab === 'images' ? 'image' : 'proxy';
    assetName.value = '';
    assetQuantity.value = 1;
    assetDate.value = '';
    assetWidth.value = 1;
    assetHeight.value = 1;
    assetFile.value = null;
    assetDataUrl.value = null;
    assetPreview.value = null;
    assetError.value = null;
    cropImage.value = null;
    cropZoom.value = 1;
    cropX.value = 0;
    cropY.value = 0;
    showAssetDialog.value = true;
  };
  const loadImageFile = (file: File): Promise<HTMLImageElement> => new Promise((resolveImage, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolveImage(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode image'));
    };
    image.src = url;
  });
  const bestImageDimensions = (imageAspect: number): { width: number; height: number; } => {
    let best = { width: 1, height: 1 };
    let bestDifference = Number.POSITIVE_INFINITY;
    for (const width of assetDimensions.value) {
      for (const height of assetDimensions.value) {
        const slotAspect = (width * 8) / (height * 11);
        const difference = Math.abs(Math.log(imageAspect / slotAspect));
        const sameDifference = Math.abs(difference - bestDifference) < 1e-9;
        if (
          (difference < bestDifference && !sameDifference)
          || (sameDifference && width * height > best.width * best.height)
        ) {
          best = { width, height };
          bestDifference = difference;
        }
      }
    }
    return best;
  };
  const openBulkImageDialog = (): void => {
    bulkImageFiles.value = null;
    bulkImageRows.value = [];
    bulkImageError.value = null;
    showBulkImageDialog.value = true;
  };
  const prepareBulkImages = async (files: File[] | null): Promise<void> => {
    bulkImageRows.value = [];
    bulkImageError.value = null;
    if (!files?.length) return;
    bulkImagePreparing.value = true;
    const rows: BulkImageRow[] = [];
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
        rows.push({ file, width: 1, height: 1, status: 'error', error: 'Unsupported format or larger than 15 MB' });
        continue;
      }
      try {
        const image = await loadImageFile(file);
        rows.push({
          file,
          ...bestImageDimensions(image.naturalWidth / image.naturalHeight),
          status: 'ready',
          error: null
        });
      } catch (error) {
        rows.push({
          file,
          width: 1,
          height: 1,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    bulkImageRows.value = rows;
    bulkImagePreparing.value = false;
  };
  const centerCropImage = async (file: File, width: number, height: number): Promise<string> => {
    const image = await loadImageFile(file);
    const targetAspect = (width * 8) / (height * 11);
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    if (imageAspect > targetAspect) sourceWidth = image.naturalHeight * targetAspect;
    else sourceHeight = image.naturalWidth / targetAspect;
    const outputWidth = targetAspect >= 1 ? 900 : Math.round(900 * targetAspect);
    const outputHeight = targetAspect >= 1 ? Math.round(900 / targetAspect) : 900;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    canvas.getContext('2d')?.drawImage(
      image,
      (image.naturalWidth - sourceWidth) / 2,
      (image.naturalHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );
    return canvas.toDataURL('image/jpeg', 0.92);
  };
  const optimizedImageSource = (image: HTMLImageElement): string => {
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  };
  const nextGenericImageNumber = (): number => {
    const used = new Set((binder.value?.images ?? []).flatMap((image) => {
      const match = /^Image (\d+)$/.exec(image.name);
      return match ? [Number(match[1])] : [];
    }));
    let number = 1;
    while (used.has(number)) number += 1;
    return number;
  };
  const saveBulkImages = async (): Promise<void> => {
    if (!binder.value || bulkImageSaving.value) return;
    bulkImageSaving.value = true;
    bulkImageError.value = null;
    let genericNumber = nextGenericImageNumber();
    let failed = bulkImageRows.value.filter((row) => row.status === 'error').length;
    for (const row of bulkImageRows.value) {
      if (row.status === 'error' || row.status === 'done') continue;
      row.status = 'uploading';
      const asset = binderStore.createImage(folderId.value, `Image ${genericNumber}`, row.width, row.height);
      try {
        const sourceImage = await loadImageFile(row.file);
        const dataUrl = await centerCropImage(row.file, row.width, row.height);
        await manualImageStore.upload({
          set_id: 'binder-assets',
          card_id: folderId.value,
          variant_id: asset.id,
          language_id: 'image-source',
          data_url: optimizedImageSource(sourceImage)
        });
        await manualImageStore.upload({
          set_id: 'binder-assets',
          card_id: folderId.value,
          variant_id: asset.id,
          language_id: 'image',
          data_url: dataUrl
        });
        row.status = 'done';
        genericNumber += 1;
      } catch (error) {
        binderStore.removeAsset(folderId.value, 'image', asset.id);
        await manualImageStore.remove('binder-assets', folderId.value, asset.id, 'image-source').catch(() => undefined);
        row.status = 'error';
        row.error = error instanceof Error ? error.message : String(error);
        failed += 1;
      }
    }
    bulkImageSaving.value = false;
    if (failed) {
      bulkImageError.value = `${failed} image${failed === 1 ? '' : 's'} could not be added.`;
    } else {
      showBulkImageDialog.value = false;
    }
  };
  const cropAspect = computed(() => assetKind.value === 'proxy'
    ? 8 / 11
    : (assetWidth.value * 8) / (assetHeight.value * 11)
  );
  const cropFrameStyle = computed(() => ({
    aspectRatio: String(cropAspect.value),
    width: `min(100%, ${cropAspect.value * 360}px)`
  }));
  const cropSourceSize = computed(() => {
    const image = cropImage.value;
    if (!image) return { width: 0, height: 0 };
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (imageAspect > cropAspect.value) width = image.naturalHeight * cropAspect.value;
    else height = image.naturalWidth / cropAspect.value;
    return {
      width: width / cropZoom.value,
      height: height / cropZoom.value
    };
  });
  const canCropX = computed(() => Boolean(
    cropImage.value && cropImage.value.naturalWidth - cropSourceSize.value.width > 0.5
  ));
  const canCropY = computed(() => Boolean(
    cropImage.value && cropImage.value.naturalHeight - cropSourceSize.value.height > 0.5
  ));
  const renderCrop = (): void => {
    const canvas = cropCanvas.value;
    const image = cropImage.value;
    if (!canvas || !image) return;
    const outputWidth = cropAspect.value >= 1 ? 900 : Math.round(900 * cropAspect.value);
    const outputHeight = cropAspect.value >= 1 ? Math.round(900 / cropAspect.value) : 900;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const sourceWidth = cropSourceSize.value.width;
    const sourceHeight = cropSourceSize.value.height;
    const availableX = image.naturalWidth - sourceWidth;
    const availableY = image.naturalHeight - sourceHeight;
    const sourceX = availableX * ((cropX.value + 100) / 200);
    const sourceY = availableY * ((cropY.value + 100) / 200);
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, outputWidth, outputHeight);
    context?.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
  };
  watch([cropZoom, cropX, cropY, cropAspect], () => renderCrop());
  const editCropAspect = computed(() => (editWidth.value * 8) / (editHeight.value * 11));
  const editCropFrameStyle = computed(() => ({
    aspectRatio: String(editCropAspect.value),
    width: `min(100%, ${editCropAspect.value * 360}px)`
  }));
  const editCropSourceSize = computed(() => {
    const image = editCropImage.value;
    if (!image) return { width: 0, height: 0 };
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (imageAspect > editCropAspect.value) width = image.naturalHeight * editCropAspect.value;
    else height = image.naturalWidth / editCropAspect.value;
    return { width: width / editCropZoom.value, height: height / editCropZoom.value };
  });
  const canEditCropX = computed(() => Boolean(
    editCropImage.value && editCropImage.value.naturalWidth - editCropSourceSize.value.width > 0.5
  ));
  const canEditCropY = computed(() => Boolean(
    editCropImage.value && editCropImage.value.naturalHeight - editCropSourceSize.value.height > 0.5
  ));
  const renderEditCrop = (): void => {
    const canvas = editCropCanvas.value;
    const image = editCropImage.value;
    if (!canvas || !image) return;
    const outputWidth = editCropAspect.value >= 1 ? 900 : Math.round(900 * editCropAspect.value);
    const outputHeight = editCropAspect.value >= 1 ? Math.round(900 / editCropAspect.value) : 900;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const sourceWidth = editCropSourceSize.value.width;
    const sourceHeight = editCropSourceSize.value.height;
    const sourceX = (image.naturalWidth - sourceWidth) * ((editCropX.value + 100) / 200);
    const sourceY = (image.naturalHeight - sourceHeight) * ((editCropY.value + 100) / 200);
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, outputWidth, outputHeight);
    context?.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
  };
  watch([editCropZoom, editCropX, editCropY, editCropAspect], () => renderEditCrop());
  const resetEditCardSlots = (): void => {
    editCardSlots.value = [];
  };
  const toggleEditCardSlot = (index: number): void => {
    editCardSlots.value = editCardSlots.value.includes(index)
      ? editCardSlots.value.filter((candidate) => candidate !== index)
      : [...editCardSlots.value, index].sort((left, right) => left - right);
  };
  const prepareAssetImage = (file: File | null): void => {
    assetDataUrl.value = null;
    assetPreview.value = null;
    assetError.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      assetError.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      assetDataUrl.value = typeof reader.result === 'string' ? reader.result : null;
      assetPreview.value = assetDataUrl.value;
      if (!assetDataUrl.value) return;
      const image = new Image();
      image.onload = () => {
        cropImage.value = image;
        void nextTick(renderCrop);
      };
      image.onerror = () => { assetError.value = 'Unable to decode the selected image.'; };
      image.src = assetDataUrl.value;
    };
    reader.onerror = () => { assetError.value = 'Unable to read the selected image.'; };
    reader.readAsDataURL(file);
  };
  const saveAsset = async (): Promise<void> => {
    if (!binder.value || !assetName.value.trim() || !assetDataUrl.value || !cropCanvas.value) return;
    assetSaving.value = true;
    assetError.value = null;
    const asset = assetKind.value === 'proxy'
      ? binderStore.createProxy(folderId.value, assetName.value, assetQuantity.value, assetDate.value)
      : binderStore.createImage(folderId.value, assetName.value, assetWidth.value, assetHeight.value);
    try {
      const croppedDataUrl = cropCanvas.value.toDataURL('image/jpeg', 0.92);
      if (assetKind.value === 'image' && cropImage.value) {
        await manualImageStore.upload({
          set_id: 'binder-assets',
          card_id: folderId.value,
          variant_id: asset.id,
          language_id: 'image-source',
          data_url: optimizedImageSource(cropImage.value)
        });
      }
      await manualImageStore.upload({
        set_id: 'binder-assets',
        card_id: folderId.value,
        variant_id: asset.id,
        language_id: assetKind.value,
        data_url: croppedDataUrl
      });
      if (assetKind.value === 'image') {
        binderStore.updateImage(folderId.value, asset.id, {
          name: assetName.value,
          width: assetWidth.value,
          height: assetHeight.value,
          cardSlots: [],
          cropZoom: cropZoom.value,
          cropX: cropX.value,
          cropY: cropY.value
        });
      }
      showAssetDialog.value = false;
    } catch (error) {
      binderStore.removeAsset(folderId.value, assetKind.value, asset.id);
      if (assetKind.value === 'image') {
        await manualImageStore.remove('binder-assets', folderId.value, asset.id, 'image-source').catch(() => undefined);
      }
      assetError.value = error instanceof Error ? error.message : String(error);
    } finally {
      assetSaving.value = false;
    }
  };
  const openEditAsset = (kind: 'proxy' | 'image', assetId: string): void => {
    if (isAssetLocked(kind, assetId)) return;
    const asset = kind === 'proxy'
      ? binder.value?.proxies.find((candidate) => candidate.id === assetId)
      : binder.value?.images.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    editAssetKind.value = kind;
    editAssetId.value = assetId;
    editName.value = asset.name;
    editAssetError.value = null;
    if (kind === 'proxy') {
      const proxy = asset as BinderProxy;
      editQuantity.value = proxy.quantity;
      editDate.value = proxy.date ?? '';
    } else {
      const image = asset as BinderImage;
      editWidth.value = image.width;
      editHeight.value = image.height;
      editOriginalWidth.value = image.width;
      editOriginalHeight.value = image.height;
      editCardSlots.value = [...image.card_slots];
      editCropZoom.value = image.crop_zoom;
      editCropX.value = image.crop_x;
      editCropY.value = image.crop_y;
      editOriginalCropZoom.value = image.crop_zoom;
      editOriginalCropX.value = image.crop_x;
      editOriginalCropY.value = image.crop_y;
      editCropImage.value = null;
      editQuantity.value = 1;
    }
    showEditAssetDialog.value = true;
    if (kind === 'image') {
      const source = new Image();
      source.onload = () => {
        editCropImage.value = source;
        void nextTick(renderEditCrop);
      };
      source.onerror = () => { editAssetError.value = 'Unable to load the existing image for cropping.'; };
      const original = manualImageStore.find('binder-assets', folderId.value, assetId, 'image-source');
      source.src = original
        ? `${original.url}?v=${encodeURIComponent(original.updated_at)}`
        : binderAssetUrl(assetId, 'image');
    }
  };
  const saveAssetEdits = async (): Promise<void> => {
    if (!editName.value.trim() || isAssetLocked(editAssetKind.value, editAssetId.value)) return;
    if (editAssetKind.value === 'proxy') {
      binderStore.updateProxy(folderId.value, editAssetId.value, {
        name: editName.value, quantity: editQuantity.value, date: editDate.value
      });
    } else {
      editAssetSaving.value = true;
      editAssetError.value = null;
      try {
        const needsRecrop = editWidth.value !== editOriginalWidth.value
          || editHeight.value !== editOriginalHeight.value
          || editCropZoom.value !== editOriginalCropZoom.value
          || editCropX.value !== editOriginalCropX.value
          || editCropY.value !== editOriginalCropY.value;
        if (needsRecrop) {
          if (!editCropCanvas.value || !editCropImage.value) throw new Error('The image is not ready for cropping.');
          if (!manualImageStore.find('binder-assets', folderId.value, editAssetId.value, 'image-source')) {
            await manualImageStore.upload({
              set_id: 'binder-assets',
              card_id: folderId.value,
              variant_id: editAssetId.value,
              language_id: 'image-source',
              data_url: optimizedImageSource(editCropImage.value)
            });
          }
          await manualImageStore.upload({
            set_id: 'binder-assets',
            card_id: folderId.value,
            variant_id: editAssetId.value,
            language_id: 'image',
            data_url: editCropCanvas.value.toDataURL('image/jpeg', 0.92)
          });
        }
        binderStore.updateImage(folderId.value, editAssetId.value, {
          name: editName.value,
          width: editWidth.value,
          height: editHeight.value,
          cardSlots: editCardSlots.value,
          cropZoom: editCropZoom.value,
          cropX: editCropX.value,
          cropY: editCropY.value
        });
      } catch (error) {
        editAssetError.value = error instanceof Error ? error.message : String(error);
        editAssetSaving.value = false;
        return;
      }
      editAssetSaving.value = false;
    }
    showEditAssetDialog.value = false;
  };
  const requestDeleteAsset = (kind: 'proxy' | 'image', assetId: string): void => {
    if (isAssetLocked(kind, assetId)) return;
    const asset = kind === 'proxy'
      ? binder.value?.proxies.find((candidate) => candidate.id === assetId)
      : binder.value?.images.find((candidate) => candidate.id === assetId);
    if (asset) deleteTarget.value = { kind, id: assetId, name: asset.name };
  };
  const confirmDeleteAsset = async (): Promise<void> => {
    if (!deleteTarget.value || isAssetLocked(deleteTarget.value.kind, deleteTarget.value.id)) return;
    deleteSaving.value = true;
    const target = deleteTarget.value;
    binderStore.removeAsset(folderId.value, target.kind, target.id);
    await manualImageStore.remove('binder-assets', folderId.value, target.id, target.kind).catch(() => undefined);
    if (target.kind === 'image') {
      await manualImageStore.remove('binder-assets', folderId.value, target.id, 'image-source').catch(() => undefined);
    }
    deleteSaving.value = false;
    deleteTarget.value = null;
  };
  const startEntryDrag = (entryId: string, event: DragEvent): void => {
    const row = rows.value.find((candidate) => candidate.entry.id === entryId);
    if (!row || row.available < 1 || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `entry:${entryId}`);
    event.dataTransfer.effectAllowed = 'copy';
  };
  const startSlotDrag = (slotIndex: number, event: DragEvent): void => {
    if (isSlotLocked(slotIndex)) {
      event.preventDefault();
      return;
    }
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', `slot:${slotIndex}`);
    event.dataTransfer.effectAllowed = 'move';
  };
  const startProxyDrag = (proxyId: string, event: DragEvent): void => {
    const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
    if (!proxy || proxyAvailable(proxy) < 1 || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `proxy:${proxyId}`);
    event.dataTransfer.effectAllowed = 'copy';
  };
  const startImageDrag = (imageId: string, event: DragEvent): void => {
    if (isAssetLocked('image', imageId)) {
      event.preventDefault();
      return;
    }
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', `image:${imageId}`);
    event.dataTransfer.effectAllowed = 'move';
  };
  const cardAllowedAtSlot = (slotIndex: number): boolean => {
    if (!binder.value) return false;
    const count = binderSlotsPerPage(binder.value.layout);
    const sideIndex = Math.floor(slotIndex / count);
    const localIndex = slotIndex % count;
    const row = Math.floor(localIndex / binderColumns.value);
    const column = localIndex % binderColumns.value;
    return binder.value.image_placements.every((placement) => {
      if (placement.side_index !== sideIndex) return true;
      const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
      if (
        !image
        || row < placement.row
        || row >= placement.row + image.height
        || column < placement.column
        || column >= placement.column + image.width
      ) return true;
      return image.card_slots.includes(
        (row - placement.row) * image.width + column - placement.column
      );
    });
  };
  const dropOnSlot = (targetIndex: number, event: DragEvent): void => {
    if (isSlotLocked(targetIndex)) return;
    const payload = event.dataTransfer?.getData('text/plain') ?? '';
    if (!payload.startsWith('image:') && !cardAllowedAtSlot(targetIndex)) return;
    if (payload.startsWith('slot:')) {
      binderStore.moveSlot(folderId.value, Number(payload.slice(5)), targetIndex);
      return;
    }
    if (payload.startsWith('entry:')) {
      const entryId = payload.slice(6);
      const row = rows.value.find((candidate) => candidate.entry.id === entryId);
      if (row && row.available > 0) binderStore.setSlot(folderId.value, targetIndex, entryId);
      return;
    }
    if (payload.startsWith('proxy:')) {
      const proxyId = payload.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
      if (proxy && proxyAvailable(proxy) > 0) binderStore.setSlot(folderId.value, targetIndex, `proxy:${proxyId}`);
      return;
    }
    if (payload.startsWith('image:') && binder.value) {
      const imageId = payload.slice(6);
      const count = binderSlotsPerPage(binder.value.layout);
      const sideIndex = Math.floor(targetIndex / count);
      const localIndex = targetIndex % count;
      binderStore.placeImage(
        folderId.value,
        imageId,
        sideIndex,
        Math.floor(localIndex / binderColumns.value),
        localIndex % binderColumns.value
      );
    }
  };

  const openGotIt = (slotIndex: number, entryId: string): void => {
    if (isSlotLocked(slotIndex)) return;
    gotItCondition.value = 'NM';
    gotItTarget.value = { slotIndex, entryId };
  };
  const gotItCardName = computed(() => {
    const entryId = gotItTarget.value?.entryId;
    return entryId ? rows.value.find((row) => row.entry.id === entryId)?.card.display_name ?? '' : '';
  });
  const confirmGotIt = (): void => {
    if (!gotItTarget.value) return;
    const ownedEntry = collectionStore.fulfillWanted(gotItTarget.value.entryId, gotItCondition.value);
    if (ownedEntry) binderStore.setSlot(folderId.value, gotItTarget.value.slotIndex, ownedEntry.id);
    gotItTarget.value = null;
  };
</script>

<style scoped>
  .binder-spread {
    display: grid;
    width: min(100%, calc((100dvh - 190px) * 16 / 11));
    margin-inline: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-items: end;
    padding: 12px;
    border-radius: 10px;
    background: #101010;
    box-shadow: inset 0 0 18px rgb(0 0 0 / 70%);
  }

  .binder-leaf {
    min-width: 0;
  }

  .binder-page {
    display: grid;
    gap: 7px;
    border: 7px solid #171717;
    background: #272727;
    box-shadow: inset 0 0 0 2px rgb(255 255 255 / 6%);
  }

  .binder-page--empty {
    display: flex;
    aspect-ratio: 8 / 11;
    border-style: dashed;
    background: #161616;
  }

  .binder-page--locked {
    border-color: #8f7a18;
    box-shadow: inset 0 0 0 2px rgb(255 214 0 / 22%);
  }

  .binder-slot {
    z-index: 2;
    aspect-ratio: 8 / 11;
    overflow: hidden;
    border: 2px dashed #616161;
    border-radius: 8px;
    background: rgb(21 21 21 / 32%);
  }

  .binder-slot--filled {
    border-style: solid;
    border-color: #424242;
    background: #151515;
  }

  .binder-slot--decorated {
    border-color: transparent;
    background: transparent;
  }

  .binder-slot--decorated:hover {
    border-color: rgb(241 199 72 / 55%);
  }

  .binder-decoration {
    z-index: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-radius: 6px;
    pointer-events: none;
  }

  .binder-decoration img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .binder-slot img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    cursor: grab;
  }

  .wanted-image {
    filter: grayscale(1);
  }

  .binder-preview-collage {
    display: flex;
    width: 44px;
    height: 60px;
    overflow: hidden;
  }

  .binder-preview-collage > div {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
  }

  .binder-preview-collage img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .slot-status-overlay {
    position: absolute;
    z-index: 3;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background: rgb(80 20 20 / 62%);
    color: white;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    pointer-events: none;
  }

  .slot-remove {
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .slot-got-it {
    right: auto;
    bottom: 8px;
    left: 50%;
    z-index: 3;
    opacity: 0;
    transform: translateX(-50%);
    transition: opacity 120ms ease;
  }

  .binder-slot:hover .slot-remove,
  .binder-slot:focus-within .slot-remove {
    opacity: 1;
  }

  .binder-slot:hover .slot-got-it,
  .binder-slot:focus-within .slot-got-it {
    opacity: 1;
  }

  .cursor-grab {
    cursor: grab;
  }

  .crop-frame {
    position: relative;
    max-height: 360px;
    margin-inline: auto;
    overflow: hidden;
    border: 2px solid var(--q-primary);
    border-radius: 4px;
    background: #212121;
  }

  .crop-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .crop-slot-grid {
    position: absolute;
    inset: 0;
    display: grid;
    gap: 3px;
    padding: 3px;
  }

  .crop-slot-toggle {
    display: grid;
    min-width: 0;
    min-height: 0;
    place-items: center;
    border: 2px dashed rgb(255 255 255 / 60%);
    border-radius: 4px;
    color: white;
    background: rgb(0 0 0 / 35%);
    cursor: pointer;
  }

  .crop-slot-toggle--selected {
    border-style: solid;
    border-color: var(--q-primary);
    color: var(--q-primary);
    background: rgb(0 0 0 / 12%);
  }

  .crop-position-control+.crop-position-control {
    margin-top: 4px;
  }

  .michi-dialog-body {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 24px;
    max-height: 68vh;
    overflow: hidden;
  }

  .michi-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .michi-preview {
    min-height: 360px;
    max-height: 68vh;
    overflow-y: auto;
    padding-right: 4px;
  }

  .michi-page-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .michi-page {
    display: grid;
    gap: 3px;
    padding: 5px;
    border: 3px solid #171717;
    background: #272727;
  }

  .michi-cell {
    z-index: 2;
    display: grid;
    place-items: center;
    aspect-ratio: 8 / 11;
    overflow: hidden;
    border: 1px dashed rgb(255 255 255 / 18%);
  }

  .michi-cell img,
  .michi-decoration img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .michi-decoration {
    z-index: 1;
    overflow: hidden;
  }

  @media (max-width: 700px) {
    .michi-dialog-body {
      display: block;
      overflow-y: auto;
    }

    .michi-preview {
      margin-top: 24px;
      overflow: visible;
    }
  }

  @media (hover: none) {
    .slot-remove {
      opacity: 1;
    }

    .slot-got-it {
      opacity: 1;
    }
  }
</style>
