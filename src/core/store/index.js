import { createStore } from 'vuex'
import auth from '@/modules/auth/store/auth.store'
import users from '@/modules/users/store/users.store'
import projects from '@/modules/planning/store/projects.store'
import tasks from '@/modules/planning/store/tasks.store'
import funds from '@/modules/planning/store/funds.store'
import allocations from '@/modules/planning/store/allocations.store'
import costs from '@/modules/planning/store/costs.store'
import creationIdeas from '@/modules/planning/store/creationIdeas.store'
import telegram from '@/modules/settings/store/telegram.store'
import chat from '@/modules/chat/store/chat.store'

// Each feature module owns its own namespaced Vuex module. New modules are
// registered here as the app grows.
const store = createStore({
  modules: {
    auth,
    users,
    projects,
    tasks,
    funds,
    allocations,
    costs,
    creationIdeas,
    telegram,
    chat,
  },
})

export default store
