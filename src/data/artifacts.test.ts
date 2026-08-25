import { describe, expect, it } from 'vitest'
import { getChangelog, type ChangelogVariant } from './artifacts'
import { INCIDENT_COMMIT_SHA } from './scenarioConstants'

describe('changelog artifacts', () => {
  const variants: ChangelogVariant[] = ['swe', 'senior']

  it.each(variants)('keeps the sharing-service diff focused for the %s level', (variant) => {
    const entry = getChangelog(variant).find((change) => change.id === 'c1')
    const diff = entry?.diff?.map((line) => line.text).join('\n') ?? ''

    expect(diff).not.toContain('compression: true')
    expect(diff).not.toContain('folder_tree_prefetch: false')
  })

  it.each(variants)('links the %s changelog entry to the affected image', (variant) => {
    const entry = getChangelog(variant).find((change) => change.id === 'c1')
    expect(entry?.sha).toBe(INCIDENT_COMMIT_SHA)
  })
})
