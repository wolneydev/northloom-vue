<template>
  <div class="container form-page">
    <header class="page-head">
      <p class="page-kicker">{{ isEditing ? 'Edit' : 'New' }}</p>
      <h1>{{ isEditing ? 'Edit project' : 'New project' }}</h1>
    </header>

    <div class="card form-card">
      <div v-if="loading" class="state muted">Loading...</div>

      <template v-else>
        <CreationIdeaHint
          v-if="!isEditing"
          :context-line="ideaContextLine"
          :error-message="ideaError"
          :refreshing="ideaLoading"
          @suggest-another="refreshIdea"
        />

        <form class="form" @submit.prevent="save">

        <div class="field">
          <label for="name">Project name *</label>
          <input
            id="name"
            v-model="form.name"
            maxlength="255"
            placeholder="e.g. Hall renovation"
            required
          />
          <p v-if="fieldErrors.name" class="field__error">{{ fieldErrors.name }}</p>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="starts_on">Start date *</label>
            <input id="starts_on" v-model="form.starts_on" type="date" required />
            <p v-if="fieldErrors.starts_on" class="field__error">{{ fieldErrors.starts_on }}</p>
          </div>
          <div class="field">
            <label for="expected_ends_on">Expected end *</label>
            <input id="expected_ends_on" v-model="form.expected_ends_on" type="date" required />
            <p v-if="fieldErrors.expected_ends_on" class="field__error">
              {{ fieldErrors.expected_ends_on }}
            </p>
          </div>
        </div>

        <div class="field">
          <label for="currency">Currency</label>
          <input
            id="currency"
            v-model.trim="form.currency"
            maxlength="3"
            autocomplete="off"
            placeholder="e.g. BRL (optional)"
            @input="form.currency = form.currency.toUpperCase()"
          />
          <p class="muted field__hint">Optional three-letter ISO code used by project finances.</p>
          <p v-if="fieldErrors.currency" class="field__error">{{ fieldErrors.currency }}</p>
        </div>

        <div class="field">
          <label for="hours">Hours</label>
          <input
            id="hours"
            v-model="form.hours"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 40"
          />
          <p class="muted field__hint">Optional effort estimate for the whole project.</p>
          <p v-if="fieldErrors.hours" class="field__error">{{ fieldErrors.hours }}</p>
        </div>

        <div class="field">
          <label for="notes">Description / notes</label>
          <textarea
            id="notes"
            v-model="form.notes"
            rows="4"
            placeholder="Details, scope or notes (optional)..."
          ></textarea>
        </div>

        <div class="actions">
          <button type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
          <router-link to="/projects">
            <button type="button" class="btn btn-ghost">Cancel</button>
          </router-link>
        </div>

        <p v-if="errorMessage" class="alert alert-error">{{ errorMessage }}</p>
      </form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import CreationIdeaHint from '@/modules/planning/components/CreationIdeaHint.vue'
import {
  isValidProjectCurrency,
  isValidProjectHours,
  normalizeProjectHours,
} from '@/modules/planning/types/planning.types'

const route = useRoute()
const router = useRouter()
const store = useStore()

const isEditing = computed(() => !!route.params.id)
const loading = ref(false)
const saving = computed(() => store.getters['projects/isSaving'])
const errorMessage = ref('')
const fieldErrors = reactive({})

const form = reactive({
  name: '',
  starts_on: '',
  expected_ends_on: '',
  currency: '',
  hours: '',
  notes: '',
})

const ideaLoading = computed(() => store.getters['creationIdeas/isIdeaLoading'])
const ideaError = computed(() => store.getters['creationIdeas/ideaError'] ?? '')
const ideaContextLine = computed(() => store.getters['creationIdeas/currentIdea']?.contextLine ?? '')

const applyIdeaToForm = (idea) => {
  if (!idea || isEditing.value) return
  form.name = idea.headline ?? ''
  form.notes = idea.suggestion ?? ''
}

const loadIdea = async () => {
  const idea = await store.dispatch('creationIdeas/fetchIdea', { target: 'project' })
  applyIdeaToForm(idea)
}

const refreshIdea = async () => {
  const idea = await store.dispatch('creationIdeas/refreshIdea', { target: 'project' })
  applyIdeaToForm(idea)
}

watch(
  () => store.getters['creationIdeas/currentIdea'],
  (idea) => applyIdeaToForm(idea),
)

const clearFieldErrors = () => Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])

onMounted(async () => {
  if (!isEditing.value) {
    await loadIdea()
    return
  }
  loading.value = true
  try {
    const project = await store.dispatch('projects/fetchProject', route.params.id)
    Object.assign(form, {
      name: project.name ?? '',
      starts_on: project.starts_on?.split('T')[0] ?? '',
      expected_ends_on: project.expected_ends_on?.split('T')[0] ?? '',
      currency: project.currency?.trim().toUpperCase() ?? '',
      hours: project.hours == null || project.hours === '' ? '' : String(project.hours),
      notes: project.notes ?? '',
    })
  } catch (err) {
    errorMessage.value = err.message || 'Error loading the project.'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  store.dispatch('creationIdeas/clearIdea')
})

const save = async () => {
  errorMessage.value = ''
  clearFieldErrors()
  form.currency = form.currency.trim().toUpperCase()
  if (!isValidProjectCurrency(form.currency)) {
    fieldErrors.currency = 'Enter a valid three-letter currency code, such as BRL, or leave it empty.'
    errorMessage.value = 'Please check the highlighted fields.'
    return
  }
  if (!isValidProjectHours(form.hours)) {
    fieldErrors.hours = 'Enter a non-negative number of hours, or leave it empty.'
    errorMessage.value = 'Please check the highlighted fields.'
    return
  }
  const payload = { ...form, hours: normalizeProjectHours(form.hours) }
  try {
    if (isEditing.value) {
      await store.dispatch('projects/updateProject', { id: route.params.id, payload })
      router.push('/projects')
      return
    }
    const project = await store.dispatch('projects/createProject', payload)
    router.push(`/projects/${project.id}`)
  } catch (err) {
    const errors = err?.data?.errors
    if (errors && typeof errors === 'object') {
      Object.entries(errors).forEach(([field, messages]) => {
        fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages)
      })
      errorMessage.value = 'Please check the highlighted fields.'
    } else {
      errorMessage.value = err.message || 'Error saving the project.'
    }
  }
}
</script>

<style scoped>
.form-page {
  max-width: 620px;
}

.form-card .idea-hint {
  margin-bottom: 1.1rem;
}

.page-head {
  margin-bottom: 1.5rem;
}

.page-head h1 {
  margin: 0;
}

.page-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.field__error {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: var(--color-danger-hover);
}

.field__hint {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.alert {
  margin: 0;
}

.state {
  padding: 1rem;
  text-align: center;
}

@media (max-width: 540px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }

  .actions a,
  .actions button {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>
