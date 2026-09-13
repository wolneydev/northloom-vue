<template>
  <div class="container">
    <header class="page-head">
      <div>
        <p class="page-kicker">Planning</p>
        <h1>Projects</h1>
      </div>
      <div class="head-actions">
        <router-link to="/calendar">
          <button type="button" class="btn btn-secondary">Open schedule</button>
        </router-link>
        <router-link to="/projects/new">
          <button type="button">New project</button>
        </router-link>
      </div>
    </header>

    <p v-if="successMessage" class="alert alert-success">{{ successMessage }}</p>
    <div v-if="loading" class="state muted">Loading projects...</div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="!loading && !error" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Start</th>
            <th>Expected end</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in projects" :key="project.id">
            <td>
              <router-link :to="`/projects/${project.id}`" class="project-link">
                {{ project.name }}
              </router-link>
              <span v-if="formatProjectHours(project.hours)" class="muted">
                · {{ formatProjectHours(project.hours) }}
              </span>
              <span v-if="project.notes" class="muted project-notes">{{ project.notes }}</span>
            </td>
            <td>{{ formatDate(project.starts_on) }}</td>
            <td>{{ formatDate(project.expected_ends_on) }}</td>
            <td>
              <div class="row-actions">
                <router-link :to="`/projects/${project.id}`">
                  <button class="btn btn-ghost btn-sm">Details</button>
                </router-link>
                <router-link
                  :to="`/projects/${project.id}/funds`"
                  class="btn btn-secondary btn-sm"
                >
                  Add funds
                </router-link>
                <router-link :to="`/projects/${project.id}/edit`">
                  <button class="btn btn-secondary btn-sm">Edit</button>
                </router-link>
                <button class="btn btn-danger btn-sm" @click="handleDelete(project)">Delete</button>
              </div>
            </td>
          </tr>
          <tr v-if="projects.length === 0">
            <td colspan="4" class="state muted">No projects registered yet.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { formatDate, formatProjectHours } from '@/modules/planning/types/planning.types'

const store = useStore()

const projects = computed(() => store.getters['projects/allProjects'])
const loading = computed(() => store.getters['projects/isLoading'])
const error = computed(() => store.getters['projects/projectError'])
const successMessage = ref('')

onMounted(() => store.dispatch('projects/fetchProjects'))

const handleDelete = async (project) => {
  if (!confirm(`Delete the project "${project.name}"? Linked tasks may also be removed.`)) {
    return
  }
  successMessage.value = ''
  try {
    await store.dispatch('projects/deleteProject', project.id)
    successMessage.value = 'Project deleted successfully.'
  } catch (err) {
    alert(err.message || 'Error deleting the project.')
  }
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
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

.head-actions {
  display: flex;
  gap: 0.6rem;
}

.head-actions a {
  display: inline-flex;
}

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  -webkit-overflow-scrolling: touch;
}

.project-link {
  font-weight: 600;
}

.project-notes {
  display: block;
  font-size: 0.82rem;
  max-width: 42ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-actions {
  width: 1%;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}

.state {
  padding: 1.5rem;
  text-align: center;
}

.alert {
  margin-bottom: 1rem;
}

.alert-success {
  color: var(--color-success);
  background: var(--color-secondary-soft);
  border: 1px solid #cfe0d6;
}

@media (max-width: 600px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
  }
  .head-actions {
    flex-wrap: wrap;
  }
  .head-actions a,
  .head-actions button {
    flex: 1 1 100%;
    width: 100%;
  }
  .row-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
