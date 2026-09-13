<template>
  <div class="idea-hint">
    <p v-if="contextLine" class="idea-hint__context">{{ contextLine }}</p>
    <p v-if="errorMessage" class="idea-hint__error">{{ errorMessage }}</p>
    <button
      type="button"
      class="btn btn-ghost idea-hint__refresh"
      :disabled="refreshing || disabled"
      @click.stop.prevent="$emit('suggest-another')"
    >
      {{ refreshing ? '...' : suggestLabel }}
    </button>
  </div>
</template>

<script setup>
import { SUGGEST_ANOTHER_LABEL } from '@/modules/planning/types/creation-idea.types'

defineProps({
  contextLine: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  refreshing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  suggestLabel: { type: String, default: SUGGEST_ANOTHER_LABEL },
})

defineEmits(['suggest-another'])
</script>

<style scoped>
.idea-hint {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.idea-hint__context {
  margin: 0;
  font-size: 0.92rem;
}

.idea-hint__error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-danger-hover);
}

.idea-hint__refresh {
  align-self: flex-start;
  margin-top: 0.2rem;
}
</style>
