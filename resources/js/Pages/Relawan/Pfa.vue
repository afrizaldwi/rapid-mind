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
        <!-- Sapaan Awal -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>{{ $t('relawan.pfa.greetingTitle') }}</h4>
          </div>
          <blockquote class="bg-teal-50/60 p-4 rounded-xl border-l-4 border-teal-600 text-xs text-teal-950 italic leading-relaxed">
            {{ $t('relawan.pfa.greetingScript') }}
          </blockquote>
        </div>

        <!-- Do's and Don'ts -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h4 class="font-bold text-sm text-slate-900">
            {{ $t('relawan.pfa.dosAndDonts') }}
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-emerald-950">
              <div class="flex items-center gap-2 font-bold text-emerald-800">
                <CircleCheck class="h-4 w-4" aria-hidden="true" />
                <span>{{ $t('relawan.pfa.dos') }}</span>
              </div>
              <ul class="space-y-1 list-disc list-inside text-emerald-900">
                <li>{{ $t('relawan.pfa.dos1') }}</li>
                <li>{{ $t('relawan.pfa.dos2') }}</li>
                <li>{{ $t('relawan.pfa.dos3') }}</li>
              </ul>
            </div>
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1.5 text-red-950">
              <div class="flex items-center gap-2 font-bold text-red-800">
                <CircleX class="h-4 w-4" aria-hidden="true" />
                <span>{{ $t('relawan.pfa.donts') }}</span>
              </div>
              <ul class="space-y-1 list-disc list-inside text-red-900">
                <li>{{ $t('relawan.pfa.donts1') }}</li>
                <li>{{ $t('relawan.pfa.donts2') }}</li>
                <li>{{ $t('relawan.pfa.donts3') }}</li>
              </ul>
            </div>
          </div>
        </div>

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

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>{{ $t('relawan.pfa.familyTitle') }}</h4>
          </div>
          <blockquote class="bg-slate-50 p-4 rounded-xl border-l-4 border-slate-400 text-xs text-slate-800 italic leading-relaxed">
            {{ $t('relawan.pfa.familyScript') }}
          </blockquote>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center space-x-2 text-teal-800 font-bold text-sm">
            <h4>{{ $t('relawan.pfa.closingTitle') }}</h4>
          </div>
          <blockquote class="bg-teal-50 p-4 rounded-xl border border-teal-200 text-xs text-teal-950 italic leading-relaxed">
            {{ $t('relawan.pfa.closingScript') }}
          </blockquote>
        </div>
      </div>
    </div>
  </RelawanLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CircleCheck, CircleX } from 'lucide-vue-next';
import RelawanLayout from '@/layouts/RelawanLayout.vue';
import { t as $t } from '@/i18n';

const activeTab = ref<'LOOK' | 'LISTEN' | 'LINK'>('LOOK');

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
