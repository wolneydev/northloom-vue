import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (relativePath) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8')

const financialViews = [
  'src/modules/planning/pages/ProjectFundsPage.vue',
  'src/modules/planning/pages/ProjectCostsPage.vue',
  'src/modules/planning/pages/TaskFinancePage.vue',
  'src/modules/planning/components/FundFormModal.vue',
  'src/modules/planning/components/FundBalanceSummary.vue',
  'src/modules/planning/components/CostRegistrationForm.vue',
  'src/modules/planning/components/CostHistoryList.vue',
  'src/modules/planning/components/TaskAllocationForm.vue',
  'src/modules/planning/components/AllocationHistoryList.vue',
]

const ideaViews = [
  'src/modules/planning/pages/ProjectFormPage.vue',
  'src/modules/planning/components/TaskFormModal.vue',
  'src/modules/planning/components/CreationIdeaHint.vue',
]

describe('financial architecture boundaries', () => {
  it.each([...financialViews, ...ideaViews])('%s does not bypass Vuex for HTTP', (path) => {
    const contents = source(path)

    expect(contents).not.toMatch(/from\s+['"]axios['"]/)
    expect(contents).not.toMatch(/@\/core\/http\/httpClient/)
  })

  it('does not persist auth or financial state in browser storage', () => {
    const files = [
      ...financialViews,
      ...ideaViews,
      'src/modules/auth/store/auth.store.js',
      'src/modules/planning/store/funds.store.js',
      'src/modules/planning/store/costs.store.js',
      'src/modules/planning/store/allocations.store.js',
      'src/modules/planning/store/creationIdeas.store.js',
    ]

    files.forEach((path) => {
      expect(source(path)).not.toMatch(/\b(?:localStorage|sessionStorage)\s*\./)
    })
  })
})
