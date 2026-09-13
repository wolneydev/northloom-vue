<template>
  <div class="container detail-page">
    <div v-if="loading && !project" class="state muted">Loading project...</div>
    <div v-else-if="loadError" class="alert alert-error">{{ loadError }}</div>

    <template v-else-if="project">
      <header class="page-head">
        <div>
          <p class="page-kicker">Project</p>
          <h1>{{ project.name }}</h1>
          <p class="period muted">
            {{ formatDate(project.starts_on) }} → {{ formatDate(project.expected_ends_on) }}
            <span v-if="formatProjectHours(project.hours)"> · {{ formatProjectHours(project.hours) }}</span>
          </p>
        </div>
        <div class="head-actions">
          <router-link to="/projects">
            <button type="button" class="btn btn-ghost">Back</button>
          </router-link>
          <router-link :to="`/projects/${project.id}/edit`">
            <button type="button" class="btn btn-secondary">Edit project</button>
          </router-link>
          <router-link :to="`/projects/${project.id}/funds`" class="btn btn-secondary">
            Add funds
          </router-link>
          <router-link :to="`/projects/${project.id}/costs`" class="btn btn-secondary">
            Costs
          </router-link>
          <button type="button" @click="openCreate">New task</button>
        </div>
      </header>

      <p v-if="project.notes" class="card notes">{{ project.notes }}</p>

      <section class="section">
        <div class="section__head">
          <h2>Project tasks</h2>
          <span class="muted">{{ tasks.length }} in the displayed period</span>
        </div>

        <p v-if="taskError" class="alert alert-error">{{ taskError }}</p>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Date</th>
                <th>Time</th>
                <th>Priority</th>
                <th>Status</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in tasks" :key="task.id">
                <td>
                  <strong>{{ task.title }}</strong>
                  <span v-if="task.location" class="muted task-loc">{{ task.location }}</span>
                  <span class="task-reminder" :class="{ 'task-reminder--off': !task.notify }">
                    <template v-if="task.notify && taskNotifyAt(task)">
                      🔔 Reminder scheduled for {{ formatReminder(taskNotifyAt(task)) }}
                    </template>
                    <template v-else>No reminder configured</template>
                  </span>
                </td>
                <td>{{ formatDate(task.task_date) }}</td>
                <td>{{ formatTimeRange(task) }}</td>
                <td><PriorityBadge :priority="task.priority" /></td>
                <td><StatusBadge :status="task.status" /></td>
                <td>
                  <div class="row-actions">
                    <router-link
                      :to="`/projects/${project.id}/tasks/${task.id}/finance`"
                      class="btn btn-sm"
                    >
                      Allocate funds
                    </router-link>
                    <button class="btn btn-secondary btn-sm" @click="openEdit(task)">Edit</button>
                    <button class="btn btn-danger btn-sm" @click="handleDelete(task)">Delete</button>
                  </div>
                </td>
              </tr>
              <tr v-if="tasks.length === 0">
                <td colspan="6" class="state muted">
                  No tasks in the displayed period. Click a date below to add one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <div class="section__head">
          <h2>Calendar</h2>
        </div>
        <TaskCalendar
          :events="events"
          @range-change="onRangeChange"
          @date-select="openCreate"
          @event-select="openEditById"
        />
      </section>

      <TaskFormModal
        :open="modalOpen"
        :task="selectedTask"
        :prefill="prefill"
        :projects="projects"
        :locked-project-id="project.id"
        @close="closeModal"
        @saved="closeModal"
        @deleted="closeModal"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import TaskCalendar from '@/modules/planning/components/TaskCalendar.vue'
import TaskFormModal from '@/modules/planning/components/TaskFormModal.vue'
import StatusBadge from '@/modules/planning/components/StatusBadge.vue'
import PriorityBadge from '@/modules/planning/components/PriorityBadge.vue'
import {
  toTimeInput,
  formatDate,
  formatReminder,
  formatProjectHours,
  taskNotifyAt,
} from '@/modules/planning/types/planning.types'

const route = useRoute()
const store = useStore()

const projectId = Number(route.params.id)

const project = computed(() => store.getters['projects/projectById'](projectId))
const projects = computed(() => store.getters['projects/allProjects'])
const loading = computed(() => store.getters['projects/isLoading'])
const events = computed(() => store.getters['tasks/calendarEvents'])
const tasks = computed(() => store.getters['tasks/allTasks'])
const taskError = computed(() => store.getters['tasks/taskError'])
const loadError = ref('')

const modalOpen = ref(false)
const selectedTask = ref(null)
const prefill = ref({})

onMounted(async () => {
  try {
    await Promise.all([
      store.dispatch('projects/fetchProjects'),
      store.dispatch('projects/fetchProject', projectId),
    ])
  } catch (err) {
    loadError.value = err.message || 'Error loading the project.'
  }
  // Scope every task fetch on this page to the current project.
  store.dispatch('tasks/applyFilters', { projectId, status: '', priority: '' })
})

onUnmounted(() => {
  // Reset the shared filter so other pages start clean.
  store.commit('tasks/SET_FILTERS', { projectId: '', status: '', priority: '' })
})

const formatTimeRange = (task) => {
  const start = toTimeInput(task.starts_at)
  const end = toTimeInput(task.ends_at)
  return end ? `${start} – ${end}` : start
}

const onRangeChange = (range) => store.dispatch('tasks/setRange', range)

const openCreate = (prefillData = {}) => {
  selectedTask.value = null
  prefill.value = { ...prefillData, project_id: projectId }
  modalOpen.value = true
}

const openEdit = (task) => {
  selectedTask.value = task
  prefill.value = {}
  modalOpen.value = true
}

const openEditById = (taskId) => {
  const task = tasks.value.find((t) => String(t.id) === String(taskId))
  if (task) openEdit(task)
}

const closeModal = () => {
  modalOpen.value = false
  selectedTask.value = null
  prefill.value = {}
}

const handleDelete = async (task) => {
  if (!confirm(`Delete the task "${task.title}"?`)) return
  try {
    await store.dispatch('tasks/deleteTask', task.id)
  } catch (err) {
    alert(err.message || 'Error deleting the task.')
  }
}
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
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

.period {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.head-actions a {
  display: inline-flex;
}

.notes {
  margin: 0 0 1.5rem;
  padding: 1.1rem 1.25rem;
  white-space: pre-wrap;
  color: var(--color-text);
}

.section {
  margin-top: 2rem;
}

.section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}

.section__head h2 {
  margin: 0;
}

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-md);
  -webkit-overflow-scrolling: touch;
}

.task-loc {
  display: block;
  font-size: 0.8rem;
}

.task-reminder {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--color-primary);
}

.task-reminder--off {
  color: var(--color-text-muted);
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

@media (max-width: 640px) {
  .page-head {
    flex-direction: column;
    align-items: stretch;
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
  .section__head {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
}
</style>
