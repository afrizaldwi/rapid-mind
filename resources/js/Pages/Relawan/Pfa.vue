<template>
  <RelawanLayout>
    <div class="space-y-5">
      <!-- Title & Phase Info -->
      <div class="bg-white rounded-xl p-5 shadow-xs border border-slate-200">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-teal-800 uppercase tracking-wider block">
              {{ $t('relawan.pfa.badge') }}
            </span>
            <h2 class="text-xl font-bold text-slate-900 mt-1">
              {{ $t('relawan.pfa.title') }}
            </h2>
          </div>
        </div>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">
          {{ $t('relawan.pfa.subtitle') }}
        </p>
      </div>

      <!-- Segment Tabs: LOOK, LISTEN, LINK -->
      <div class="flex rounded-xl bg-slate-200/80 p-1">
        <button
          type="button"
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex-1 py-2 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center space-x-1.5 cursor-pointer"
          :class="activeTab === tab.id ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- TAHAP 1: LOOK -->
      <div v-if="activeTab === 'LOOK'" class="space-y-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>{{ $t('relawan.pfa.lookSafetyTitle') }}</h4>
          </div>
          <ul class="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>{{ $t('relawan.pfa.lookSafety1') }}</li>
            <li>{{ $t('relawan.pfa.lookSafety2') }}</li>
          </ul>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>{{ $t('relawan.pfa.lookDistressTitle') }}</h4>
          </div>
          <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-800">{{ $t('relawan.pfa.shockTitle') }}:</span> {{ $t('relawan.pfa.shockDesc') }}
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-800">{{ $t('relawan.pfa.hysteriaTitle') }}:</span> {{ $t('relawan.pfa.hysteriaDesc') }}
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="font-bold text-slate-800">{{ $t('relawan.pfa.agitationTitle') }}:</span> {{ $t('relawan.pfa.agitationDesc') }}
            </div>
          </div>
          <p class="text-[11px] text-slate-500 italic mt-1">
            {{ $t('relawan.pfa.approachTip') }}
          </p>
        </div>
      </div>

      <!-- TAHAP 2: LISTEN -->
      <div v-if="activeTab === 'LISTEN'" class="space-y-4">
        <section aria-labelledby="pfa-greeting" class="rounded-xl border border-teal-900/10 bg-teal-50/70 p-4 sm:p-5">
          <h3 id="pfa-greeting" class="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-800">
            <MessageCircle class="size-4 shrink-0" aria-hidden="true" />
            {{ $t('relawan.pfa.greetingTitle') }}
          </h3>
          <blockquote class="max-w-prose text-base leading-relaxed text-slate-900">
            {{ $t('relawan.pfa.greetingScript') }}
          </blockquote>
        </section>

        <section aria-labelledby="pfa-conduct" class="@container rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 id="pfa-conduct" class="border-b border-slate-200 pb-3 text-base font-semibold text-slate-900">
            {{ $t('relawan.pfa.dosAndDonts') }}
          </h3>
          <div class="grid gap-4 pt-3 text-[15px] leading-6 text-slate-700 @xl:grid-cols-2">
            <div>
              <h4 class="mb-1.5 flex items-center gap-2 font-semibold text-teal-800">
                <CircleCheck class="size-4 shrink-0" aria-hidden="true" />
                {{ $t('relawan.pfa.dos') }}
              </h4>
              <ul class="list-disc space-y-1 ps-6 marker:text-teal-700">
                <li>{{ $t('relawan.pfa.dos1') }}</li>
                <li>{{ $t('relawan.pfa.dos2') }}</li>
                <li>{{ $t('relawan.pfa.dos3') }}</li>
              </ul>
            </div>
            <div class="border-t border-slate-200 pt-3 @xl:border-s @xl:border-t-0 @xl:ps-4 @xl:pt-0">
              <h4 class="mb-1.5 flex items-center gap-2 font-semibold text-slate-800">
                <CircleX class="size-4 shrink-0" aria-hidden="true" />
                <span class="text-red-800">{{ $t('relawan.pfa.donts') }}</span>
              </h4>
              <ul class="list-disc space-y-1 ps-6 marker:text-slate-500">
                <li>{{ $t('relawan.pfa.donts1') }}</li>
                <li>{{ $t('relawan.pfa.donts2') }}</li>
                <li>{{ $t('relawan.pfa.donts3') }}</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Grounding 5-4-3-2-1 -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h4 class="text-sm font-bold text-teal-800">{{ $t('relawan.pfa.groundingTitle') }}</h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            {{ $t('relawan.pfa.groundingDesc') }}
          </p>

          <div class="space-y-2 text-xs">
            <div v-for="step in localizedGroundingSteps" :key="step.number" class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div class="flex items-start gap-2">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                  {{ step.number }}
                </span>
                <span class="font-bold text-slate-800">{{ step.title }}</span>
              </div>
              <p class="pl-7 text-slate-700 leading-relaxed">{{ step.script }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TAHAP 3: LINK -->
      <div v-if="activeTab === 'LINK'" class="space-y-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>{{ $t('relawan.pfa.logisticsTitle') }}</h4>
          </div>
          <p class="text-xs text-slate-600">
            {{ $t('relawan.pfa.logisticsDesc') }}
          </p>
          <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>{{ $t('relawan.pfa.water') }}</span>
            </div>
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>{{ $t('relawan.pfa.blanket') }}</span>
            </div>
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>{{ $t('relawan.pfa.medicine') }}</span>
            </div>
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <span>{{ $t('relawan.pfa.babyElder') }}</span>
            </div>
          </div>
        </div>

        <section
          v-for="script in linkScripts"
          :key="script.id"
          :aria-labelledby="script.id"
          class="rounded-xl border border-teal-900/10 bg-teal-50/70 p-4 sm:p-5"
        >
          <h3 :id="script.id" class="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-800">
            <MessageCircle class="size-4 shrink-0" aria-hidden="true" />
            {{ $t(script.title) }}
          </h3>
          <blockquote class="max-w-prose text-base leading-relaxed text-slate-900">
            {{ $t(script.text) }}
          </blockquote>
        </section>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CircleCheck, CircleX, MessageCircle } from 'lucide-vue-next';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { t as $t } from '@/i18n';

const activeTab = ref<'LOOK' | 'LISTEN' | 'LINK'>('LOOK');

const linkScripts = [
  { id: 'pfa-family', title: 'relawan.pfa.familyTitle', text: 'relawan.pfa.familyScript' },
  { id: 'pfa-closing', title: 'relawan.pfa.closingTitle', text: 'relawan.pfa.closingScript' },
] as const;

const tabs = [
  { id: 'LOOK' as const, label: 'LOOK' },
  { id: 'LISTEN' as const, label: 'LISTEN' },
  { id: 'LINK' as const, label: 'LINK' },
];

const localizedGroundingSteps = computed(() => [
  {
    number: 1,
    title: $t('relawan.pfa.step1Title'),
    script: $t('relawan.pfa.step1Script'),
  },
  {
    number: 2,
    title: $t('relawan.pfa.step2Title'),
    script: $t('relawan.pfa.step2Script'),
  },
  {
    number: 3,
    title: $t('relawan.pfa.step3Title'),
    script: $t('relawan.pfa.step3Script'),
  },
]);
</script>
