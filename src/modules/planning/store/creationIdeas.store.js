import { creationIdeasService } from '@/modules/planning/services/creationIdeas.service'
import {
  IDEA_FORBIDDEN_MESSAGE,
  IDEA_LOAD_FAILURE_MESSAGE,
  ideaRefreshAt,
} from '@/modules/planning/types/creation-idea.types'

const state = () => ({
  idea: null,
  loading: false,
  error: null,
  forbidden: false,
  refreshNudge: 0,
})

const getters = {
  currentIdea: (state) => state.idea,
  isIdeaLoading: (state) => state.loading,
  ideaError: (state) => state.error,
  isIdeaForbidden: (state) => state.forbidden,
}

const mutations = {
  SET_IDEA(state, idea) {
    state.idea = idea
  },
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  SET_ERROR(state, error) {
    state.error = error
  },
  SET_FORBIDDEN(state, forbidden) {
    state.forbidden = forbidden
  },
  SET_REFRESH_NUDGE(state, refreshNudge) {
    state.refreshNudge = refreshNudge
  },
}

const actions = {
  async fetchIdea({ commit }, payload) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    commit('SET_FORBIDDEN', false)
    try {
      const idea = await creationIdeasService.get(payload)
      commit('SET_IDEA', idea)
      return idea
    } catch (err) {
      commit('SET_IDEA', null)
      if (err.status === 403) {
        commit('SET_FORBIDDEN', true)
        commit('SET_ERROR', err.message || IDEA_FORBIDDEN_MESSAGE)
        throw err
      }
      commit('SET_ERROR', err.message || IDEA_LOAD_FAILURE_MESSAGE)
      return null
    } finally {
      commit('SET_LOADING', false)
    }
  },

  refreshIdea({ dispatch, commit, state }, payload = {}) {
    const refreshNudge = state.refreshNudge + 1
    commit('SET_REFRESH_NUDGE', refreshNudge)
    return dispatch('fetchIdea', {
      ...payload,
      at: ideaRefreshAt(refreshNudge),
    })
  },

  clearIdea({ commit }) {
    commit('SET_IDEA', null)
    commit('SET_ERROR', null)
    commit('SET_FORBIDDEN', false)
    commit('SET_LOADING', false)
    commit('SET_REFRESH_NUDGE', 0)
  },
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
