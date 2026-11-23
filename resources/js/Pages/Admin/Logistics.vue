<template>
  <AdminLayout>
    <div class="w-full space-y-6">
      <div class="space-y-1">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{{ $t('admin.logistics.title', 'Kebutuhan & Bantuan Psikososial') }}</h1>
        <p class="text-xs sm:text-sm text-slate-500 font-normal">{{ $t('admin.logistics.subtitle', 'Pantau kebutuhan bantuan psikososial di setiap posko.') }}</p>
        <div v-if="shelters?.length" class="flex items-center gap-2 text-xs text-slate-500 pt-1 font-normal">
          <span>{{ $t('admin.logistics.activeShelters', { count: activeSheltersCount }, '{count} posko aktif') }}</span>
          <span class="text-slate-300">·</span>
          <span class="text-amber-800 font-medium">{{ $t('admin.logistics.shortageNotice', { count: shortageCount }, '{count} membutuhkan tambahan obat kronis') }}</span>
        </div>
      </div>

      <p v-if="message" class="rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">{{ message }}</p>

      <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div class="min-w-0 bg-white rounded-lg border border-slate-200/80 overflow-hidden shadow-none">
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full min-w-[720px] text-left border-collapse">
            <colgroup>
              <col class="w-[34%]" />
              <col class="w-[12%]" />
              <col class="w-[16%]" />
              <col class="w-[16%]" />
              <col class="w-[16%]" />
              <col class="w-[6%]" />
            </colgroup>
            <thead>
              <tr class="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                <th scope="col" class="py-3 px-5">{{ $t('admin.logistics.columns.shelter', 'POSKO') }}</th>
                <th scope="col" class="py-3 px-4">{{ $t('admin.logistics.columns.survivors', 'PENYINTAS') }}</th>
                <th scope="col" class="py-3 px-4">{{ $t('admin.logistics.columns.childKit', 'KIT ANAK') }}</th>
                <th scope="col" class="py-3 px-4">{{ $t('admin.logistics.columns.sanitation', 'SANITASI') }}</th>
                <th scope="col" class="py-3 px-4">{{ $t('admin.logistics.columns.chronicMeds', 'OBAT KRONIS') }}</th>
                <th scope="col" class="py-3 px-5 text-right">{{ $t('admin.logistics.columns.actions', 'AKSI') }}</th>
              </tr>
            </thead>
            <tbody v-if="shelters.length" class="divide-y divide-slate-100">
              <tr v-for="shelter in shelters" :key="shelter.id" class="hover:bg-slate-50/40 transition-colors">
                <td class="py-3.5 px-5 align-top">
                  <div class="space-y-0.5">
                    <div class="text-sm font-semibold text-slate-900 leading-snug">{{ shelter.name }}</div>
                    <div class="text-xs text-slate-400 font-normal truncate max-w-sm">{{ shelter.address || $t('admin.summary.defaultShelterArea', 'Kawasan Posko Bencana') }}</div>
                  </div>
                </td>
                <td class="py-3.5 px-4 align-top text-xs text-slate-600">
                  <div class="pt-0.5">
                    <span class="font-semibold text-slate-800">{{ shelter.patients_count }}</span><span class="text-slate-500 font-normal"> {{ $t('admin.logistics.survivorsSuffix', 'penyintas') }}</span>
                  </div>
                </td>
                <td v-for="category in categories" :key="category.value" class="py-3.5 px-4 align-top">
                  <button type="button" class="text-left disabled:cursor-default w-full" :disabled="!shelter.is_active" @click="openManagement(shelter.id, category.value)">
                    <ResourceSummary :summary="categorySummary(shelter, category.value)" />
                  </button>
                </td>
                <td class="py-3.5 px-5 text-right align-top">
                  <button
                    type="button"
                    class="whitespace-nowrap rounded-md border border-teal-700 px-3 py-1.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    :disabled="!shelter.is_active"
                    @click="openManagement(shelter.id)"
                  >
                    {{ shelter.is_active ? $t('admin.logistics.manageButton', 'Kelola') : $t('common.inactive', 'Nonaktif') }}
                  </button>
                </td>
              </tr>
            </tbody>
            <tbody v-else><tr><td colspan="6" class="py-10 text-center text-xs text-slate-400">{{ $t('admin.logistics.emptyShelters', 'Belum ada data posko.') }}</td></tr></tbody>
          </table>
        </div>

        <div class="md:hidden">
          <div v-if="shelters.length" class="divide-y divide-slate-100">
            <div v-for="shelter in shelters" :key="shelter.id" class="p-4 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-0.5">
                  <h2 class="text-sm font-semibold text-slate-900 leading-snug">{{ shelter.name }}</h2>
                  <p class="text-xs text-slate-400 font-normal">{{ shelter.address || $t('admin.summary.defaultShelterArea', 'Kawasan Posko Bencana') }}</p>
                </div>
                <div class="text-xs text-slate-600 shrink-0 text-right pt-0.5">
                  <span class="font-semibold text-slate-800">{{ shelter.patients_count }}</span><span class="text-slate-500 font-normal"> {{ $t('admin.logistics.survivorsSuffix', 'penyintas') }}</span>
                </div>
              </div>
              <div class="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <button v-for="category in categories" :key="category.value" type="button" class="flex w-full items-start justify-between gap-2 text-left disabled:cursor-default" :disabled="!shelter.is_active" @click="openManagement(shelter.id, category.value)">
                  <span class="text-slate-600 font-medium pt-0.5">{{ categoryLabel(category) }}</span>
                  <ResourceSummary :summary="categorySummary(shelter, category.value)" align="right" />
                </button>
              </div>
              <div class="flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  class="rounded-md border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  :disabled="!shelter.is_active"
                  @click="openManagement(shelter.id)"
                >
                  {{ shelter.is_active ? $t('admin.logistics.manageLogisticsButton', 'Kelola logistik') : $t('admin.logistics.shelterInactive', 'Posko nonaktif') }}
                </button>
              </div>
            </div>
          </div>
          <div v-else class="p-8 text-center text-xs text-slate-400">{{ $t('admin.logistics.emptyShelters', 'Belum ada data posko.') }}</div>
        </div>
        </div>

        <aside class="rounded-lg border border-slate-200/80 bg-white p-5 xl:sticky xl:top-6" aria-labelledby="priority-summary-title">
        <div class="border-b border-slate-100 pb-4">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-teal-700">{{ $t('admin.logistics.asideTag', 'Ringkasan operasional') }}</p>
          <h2 id="priority-summary-title" class="mt-1 text-base font-bold text-slate-900">{{ $t('admin.logistics.asideTitle', 'Prioritas Kebutuhan') }}</h2>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">{{ $t('admin.logistics.asideSubtitle', 'Kebutuhan aktif yang masih menunggu alokasi.') }}</p>
        </div>

        <div class="py-4">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ $t('admin.logistics.highestNeedShelter', 'Posko kebutuhan terbanyak') }}</p>
          <template v-if="priorityShelter">
            <button type="button" class="mt-2 block w-full rounded-lg bg-amber-50 px-3.5 py-3 text-left hover:bg-amber-100/70" @click="openManagement(priorityShelter.id)">
              <span class="block text-sm font-semibold text-slate-900">{{ priorityShelter.name }}</span>
              <span class="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                {{ $t('admin.logistics.unfulfilledTypesCount', { count: priorityShelter.outstandingCount }, '{count} jenis belum terpenuhi') }}
              </span>
            </button>
          </template>
          <p v-else class="mt-2 rounded-lg bg-slate-50 px-3.5 py-3 text-xs text-slate-500">{{ $t('admin.logistics.noPendingNeeds', 'Tidak ada kebutuhan tertunda.') }}</p>
        </div>

        <div class="border-t border-slate-100 py-4">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ $t('admin.logistics.unfulfilledByCategory', 'Belum terpenuhi per kategori') }}</p>
          <dl class="mt-3 space-y-2.5">
            <div v-for="item in outstandingByCategory" :key="item.value" class="flex items-center justify-between gap-3 text-xs">
              <dt class="text-slate-600">{{ categoryLabel(item) }}</dt>
              <dd class="font-semibold tabular-nums" :class="item.count > 0 ? 'text-amber-800' : 'text-slate-400'">{{ $t('admin.logistics.typesCount', { count: item.count }, '{count} jenis') }}</dd>
            </div>
          </dl>
        </div>

        <div class="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ $t('admin.logistics.totalPendingAllocations', 'Total alokasi tertunda') }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ $t('admin.logistics.acrossActiveShelters', 'Di seluruh Posko aktif') }}</p>
          </div>
          <p class="text-2xl font-bold tabular-nums" :class="totalOutstandingNeeds > 0 ? 'text-amber-800' : 'text-teal-800'">{{ totalOutstandingNeeds }}</p>
        </div>
        </aside>
      </div>
    </div>

    <div v-if="selectedShelter" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" role="presentation" @mousedown.self="closeManagement">
      <section role="dialog" aria-modal="true" aria-labelledby="logistics-dialog-title" class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="logistics-dialog-title" class="text-lg font-bold text-slate-900">{{ $t('admin.logistics.modalTitle', { name: selectedShelter.name }, 'Logistik {name}') }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ $t('admin.logistics.modalSubtitle', 'Catat kebutuhan dan alokasi aktual untuk Posko ini.') }}</p>
          </div>
          <button type="button" class="text-xl leading-none text-slate-400 hover:text-slate-700" :aria-label="$t('admin.logistics.closeDialogAria', 'Tutup dialog')" @click="closeManagement">×</button>
        </header>

        <div class="border-b border-slate-200 px-5 pt-3">
          <div class="flex gap-4 overflow-x-auto" role="tablist" :aria-label="$t('admin.logistics.categoryTabsAria', 'Kategori logistik')">
            <button v-for="category in categories" :key="category.value" type="button" role="tab" :aria-selected="activeCategory === category.value" class="whitespace-nowrap border-b-2 px-1 pb-3 text-xs font-semibold" :class="activeCategory === category.value ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'" @click="selectCategory(category.value)">
              {{ categoryLabel(category) }}
            </button>
          </div>
        </div>

        <div class="overflow-y-auto p-5">
          <div v-if="activeNeeds.length" class="space-y-3">
            <article v-for="need in activeNeeds" :key="need.id" class="rounded-lg border border-slate-200 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">{{ need.material_name }}</h3>
                  <p class="mt-1 text-xs text-slate-500">{{ $t('admin.logistics.needProgress', { needed: formatNumber(need.quantity_needed), allocated: formatNumber(need.allocated_quantity), unit: need.unit }, 'Dibutuhkan {needed} {unit} · dialokasikan {allocated} {unit}') }}</p>
                  <p v-if="need.notes" class="mt-1 text-xs text-slate-500">{{ need.notes }}</p>
                </div>
                <span v-if="Number(need.remaining_quantity) > 0" class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
                  {{ $t('admin.logistics.remainingQty', { remaining: formatNumber(need.remaining_quantity), unit: need.unit }, 'Sisa {remaining} {unit}') }}
                </span>
                <span v-else class="text-xs font-medium text-teal-700">
                  {{ $t('admin.logistics.fulfilled', 'Terpenuhi') }}
                </span>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                <button type="button" class="text-xs font-semibold text-teal-800" @click="editNeed(need)">{{ $t('admin.logistics.editNeed', 'Ubah kebutuhan') }}</button>
                <button v-if="Number(need.remaining_quantity) > 0" type="button" class="text-xs font-semibold text-teal-800" @click="startAllocation(need)">{{ $t('admin.logistics.recordAllocation', 'Catat alokasi') }}</button>
              </div>

              <form v-if="allocationNeedId === need.id" class="mt-3 rounded-lg bg-slate-50 p-3" @submit.prevent="submitAllocation">
                <label class="block text-xs font-semibold text-slate-700" :for="`allocation-quantity-${need.id}`">{{ $t('admin.logistics.allocatedQuantityLabel', { unit: need.unit }, 'Jumlah dialokasikan ({unit})') }}</label>
                <div class="mt-1 flex items-start gap-2">
                  <div class="flex-1">
                    <input :id="`allocation-quantity-${need.id}`" v-model="allocationForm.quantity_allocated" type="number" min="0.01" :max="need.remaining_quantity" step="0.01" required class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none" />
                    <p v-if="allocationForm.errors.quantity_allocated || allocationForm.errors.shelter_id" class="mt-1 text-xs text-red-800">{{ localizeMessage(allocationForm.errors.quantity_allocated || allocationForm.errors.shelter_id, locale) }}</p>
                  </div>
                  <button :disabled="allocationForm.processing" class="rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{{ allocationForm.processing ? $t('admin.logistics.saving', 'Menyimpan…') : $t('common.save', 'Simpan') }}</button>
                </div>
              </form>

              <details v-if="need.allocations.length" class="mt-3 text-xs">
                <summary class="cursor-pointer font-medium text-slate-600">{{ $t('admin.logistics.allocationHistory', { count: need.allocations.length }, 'Riwayat alokasi ({count})') }}</summary>
                <ul class="mt-2 divide-y divide-slate-100 rounded-lg bg-slate-50 px-3">
                  <li v-for="allocation in need.allocations" :key="allocation.id" class="flex justify-between gap-3 py-2 text-slate-600">
                    <span>{{ formatNumber(allocation.quantity_allocated) }} {{ need.unit }} · {{ allocation.actor?.name || $t('admin.logistics.actorUnavailable', 'Admin tidak tersedia') }}</span>
                    <time class="shrink-0 text-slate-400">{{ formatDate(allocation.allocated_at) }}</time>
                  </li>
                </ul>
              </details>
            </article>
          </div>
          <p v-else class="rounded-lg bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">{{ $t('admin.logistics.emptyCategory', 'Belum ada kebutuhan pada kategori ini.') }}</p>

          <form class="mt-5 border-t border-slate-200 pt-5" @submit.prevent="submitNeed">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h3 class="text-sm font-bold text-slate-900">{{ editingNeedId ? $t('admin.logistics.editNeed', 'Ubah kebutuhan') : $t('admin.logistics.addNeed', 'Tambah kebutuhan') }}</h3>
              <button v-if="editingNeedId" type="button" class="text-xs font-semibold text-slate-500" @click="resetNeedForm">{{ $t('admin.logistics.cancelEdit', 'Batal ubah') }}</button>
            </div>
            <p v-if="needForm.errors.shelter_id" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{{ localizeMessage(needForm.errors.shelter_id, locale) }}</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label for="material-name" class="block text-xs font-semibold text-slate-700">{{ $t('admin.logistics.materialName', 'Nama bahan') }}</label>
                <input id="material-name" v-model="needForm.material_name" :list="suggestionListId" :disabled="editingIdentityLocked" required maxlength="150" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none disabled:bg-slate-100" :placeholder="$t('admin.logistics.materialPlaceholder', 'Ketik atau pilih bahan')" />
                <datalist :id="suggestionListId"><option v-for="suggestion in activeSuggestions" :key="suggestion" :value="suggestion" /></datalist>
                <p v-if="needForm.errors.material_name" class="mt-1 text-xs text-red-800">{{ localizeMessage(needForm.errors.material_name, locale) }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="quantity-needed" class="block text-xs font-semibold text-slate-700">{{ $t('admin.logistics.quantityNeeded', 'Jumlah dibutuhkan') }}</label>
                  <input id="quantity-needed" v-model="needForm.quantity_needed" type="number" min="0.01" step="0.01" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none" />
                  <p v-if="needForm.errors.quantity_needed" class="mt-1 text-xs text-red-800">{{ localizeMessage(needForm.errors.quantity_needed, locale) }}</p>
                </div>
                <div>
                  <label for="need-unit" class="block text-xs font-semibold text-slate-700">{{ $t('admin.logistics.unit', 'Satuan') }}</label>
                  <input id="need-unit" v-model="needForm.unit" :disabled="editingIdentityLocked" required maxlength="30" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none disabled:bg-slate-100" :placeholder="$t('admin.logistics.unitPlaceholder', 'paket')" />
                  <p v-if="needForm.errors.unit" class="mt-1 text-xs text-red-800">{{ localizeMessage(needForm.errors.unit, locale) }}</p>
                </div>
              </div>
              <div class="sm:col-span-2">
                <label for="need-notes" class="block text-xs font-semibold text-slate-700">{{ $t('admin.logistics.notesLabel', 'Catatan kebutuhan') }} <span class="font-normal text-slate-400">({{ $t('common.optional', 'opsional') }})</span></label>
                <textarea id="need-notes" v-model="needForm.notes" rows="2" maxlength="1000" class="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"></textarea>
                <p v-if="needForm.errors.notes" class="mt-1 text-xs text-red-800">{{ localizeMessage(needForm.errors.notes, locale) }}</p>
              </div>
            </div>
            <button :disabled="needForm.processing" class="mt-3 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{{ needForm.processing ? $t('admin.logistics.saving', 'Menyimpan…') : editingNeedId ? $t('admin.logistics.saveChanges', 'Simpan perubahan') : $t('admin.logistics.addNeed', 'Tambah kebutuhan') }}</button>
          </form>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import { useForm, usePage } from '@inertiajs/vue3';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { t as $t, useI18n } from '@/i18n';
import { localizeMessage } from '@/i18n/localizeMessage';

const { locale } = useI18n();
const intlLocale = computed(() => (locale.value === 'en' ? 'en-US' : 'id-ID'));

type Category = { value: string; label: string };
type Allocation = { id: number; quantity_allocated: string; allocated_at: string | null; actor: { id: number; name: string } | null };
type ResourceNeed = { id: number; category: string; material_name: string; quantity_needed: string; unit: string; notes: string | null; allocated_quantity: string; remaining_quantity: string; updated_at: string | null; allocations: Allocation[] };
type Shelter = { id: number; name: string; address: string | null; is_active: boolean; patients_count: number; resource_needs: ResourceNeed[] };
type Summary = { count: number; state: 'empty' | 'outstanding' | 'fulfilled' };

const ResourceSummary = defineComponent({
  props: {
    summary: { type: Object as () => Summary, required: true },
    align: { type: String as () => 'left' | 'right', default: 'left' },
  },
  setup(componentProps) {
    return () => {
      const isRight = componentProps.align === 'right';
      const containerClass = [
        'flex flex-col justify-start min-h-[36px]',
        isRight ? 'items-end text-right' : 'items-start text-left',
      ];

      if (componentProps.summary.state === 'empty') {
        return h('div', { class: containerClass }, [
          h('span', { class: 'text-xs font-normal text-slate-400 whitespace-nowrap leading-tight' }, $t('admin.logistics.summaryEmpty', 'Belum dicatat')),
        ]);
      }
      const count = componentProps.summary.count;
      const outstanding = componentProps.summary.state === 'outstanding';

      return h('div', { class: [...containerClass, 'gap-0.5'] }, [
        h('span', { class: 'text-xs font-normal text-slate-500 whitespace-nowrap leading-tight' }, $t('admin.logistics.typesCount', { count }, '{count} jenis')),
        outstanding
          ? h('span', { class: 'inline-flex items-center gap-1 text-xs font-medium text-amber-800 whitespace-nowrap leading-tight' }, [
              h('span', { class: 'h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500' }),
              $t('admin.logistics.needsAllocation', 'Perlu alokasi'),
            ])
          : h('span', { class: 'text-xs font-medium text-teal-700 whitespace-nowrap leading-tight' }, $t('admin.logistics.fulfilled', 'Terpenuhi')),
      ]);
    };
  },
});

const props = defineProps<{ shelters: Shelter[]; categories: Category[]; materialSuggestions: Record<string, string[]> }>();
const page = usePage();
const message = computed(() => localizeMessage((page.props.flash as { message?: string } | undefined)?.message, locale.value));
const selectedShelterId = ref<number | null>(null);
const activeCategory = ref('');
const editingNeedId = ref<number | null>(null);
const allocationNeedId = ref<number | null>(null);
const selectedShelter = computed(() => props.shelters.find((shelter) => shelter.id === selectedShelterId.value) ?? null);
const activeNeeds = computed(() => selectedShelter.value?.resource_needs.filter((need) => need.category === activeCategory.value) ?? []);
const activeSuggestions = computed(() => props.materialSuggestions[activeCategory.value] ?? []);
const suggestionListId = computed(() => `material-suggestions-${activeCategory.value.toLowerCase()}`);
const editingNeed = computed(() => selectedShelter.value?.resource_needs.find((need) => need.id === editingNeedId.value) ?? null);
const editingIdentityLocked = computed(() => Number(editingNeed.value?.allocated_quantity ?? 0) > 0);

function categoryLabel(category: Category): string {
  return $t(`admin.logistics.categories.${category.value}`, category.label);
}

const needForm = useForm({ shelter_id: null as number | null, category: '', material_name: '', quantity_needed: '', unit: '', notes: '' });
const allocationForm = useForm({ shelter_id: null as number | null, quantity_allocated: '' });
const activeSheltersCount = computed(() => props.shelters.filter((shelter) => shelter.is_active).length);
const shortageCount = computed(() => props.shelters.filter((shelter) => shelter.is_active && shelter.resource_needs.some((need) => need.category === 'ESSENTIAL_CHRONIC_MEDICINE' && Number(need.remaining_quantity) > 0)).length);
const activeOutstandingNeeds = computed(() => props.shelters
  .filter((shelter) => shelter.is_active)
  .flatMap((shelter) => shelter.resource_needs.filter((need) => Number(need.remaining_quantity) > 0)));
const totalOutstandingNeeds = computed(() => activeOutstandingNeeds.value.length);
const outstandingByCategory = computed(() => props.categories.map((category) => ({
  ...category,
  count: activeOutstandingNeeds.value.filter((need) => need.category === category.value).length,
})));
const priorityShelter = computed(() => props.shelters
  .filter((shelter) => shelter.is_active)
  .map((shelter) => ({
    id: shelter.id,
    name: shelter.name,
    outstandingCount: shelter.resource_needs.filter((need) => Number(need.remaining_quantity) > 0).length,
  }))
  .filter((shelter) => shelter.outstandingCount > 0)
  .sort((left, right) => right.outstandingCount - left.outstandingCount || left.name.localeCompare(right.name, intlLocale.value))[0] ?? null);

function categorySummary(shelter: Shelter, category: string): Summary {
  const needs = shelter.resource_needs.filter((need) => need.category === category);
  if (!needs.length) return { count: 0, state: 'empty' };
  return {
    count: new Set(needs.map((need) => need.material_name.trim().toLocaleLowerCase(intlLocale.value))).size,
    state: needs.some((need) => Number(need.remaining_quantity) > 0) ? 'outstanding' : 'fulfilled',
  };
}

function openManagement(shelterId: number, category?: string) {
  selectedShelterId.value = shelterId;
  activeCategory.value = category ?? props.categories[0]?.value ?? '';
  resetNeedForm();
  cancelAllocation();
}
function closeManagement() {
  if (needForm.processing || allocationForm.processing) return;
  selectedShelterId.value = null;
  resetNeedForm();
  cancelAllocation();
}
function selectCategory(category: string) {
  activeCategory.value = category;
  resetNeedForm();
  cancelAllocation();
}
function editNeed(need: ResourceNeed) {
  cancelAllocation();
  editingNeedId.value = need.id;
  needForm.clearErrors();
  needForm.shelter_id = selectedShelter.value?.id ?? null;
  needForm.category = need.category;
  needForm.material_name = need.material_name;
  needForm.quantity_needed = need.quantity_needed;
  needForm.unit = need.unit;
  needForm.notes = need.notes ?? '';
}
function resetNeedForm() {
  editingNeedId.value = null;
  needForm.clearErrors();
  needForm.shelter_id = selectedShelter.value?.id ?? null;
  needForm.category = activeCategory.value;
  needForm.material_name = '';
  needForm.quantity_needed = '';
  needForm.unit = '';
  needForm.notes = '';
}
function submitNeed() {
  needForm.shelter_id = selectedShelter.value?.id ?? null;
  needForm.category = activeCategory.value;
  const options = { preserveScroll: true, onSuccess: () => resetNeedForm() };
  if (editingNeedId.value) needForm.put(`/admin/logistics/needs/${editingNeedId.value}`, options);
  else needForm.post('/admin/logistics/needs', options);
}
function startAllocation(need: ResourceNeed) {
  resetNeedForm();
  allocationNeedId.value = need.id;
  allocationForm.clearErrors();
  allocationForm.shelter_id = selectedShelter.value?.id ?? null;
  allocationForm.quantity_allocated = '';
}
function cancelAllocation() {
  allocationNeedId.value = null;
  allocationForm.clearErrors();
  allocationForm.shelter_id = null;
  allocationForm.quantity_allocated = '';
}
function submitAllocation() {
  if (!allocationNeedId.value) return;
  allocationForm.post(`/admin/logistics/needs/${allocationNeedId.value}/allocations`, { preserveScroll: true, onSuccess: () => cancelAllocation() });
}
function formatNumber(value: string): string {
  return new Intl.NumberFormat(intlLocale.value, { maximumFractionDigits: 2 }).format(Number(value));
}
function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedShelter.value) closeManagement();
}
onMounted(() => document.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown));
</script>
