import { getHomeActions } from '@/data/home/server'
import { ActionList } from './home-content'

/**
 * Server component that fetches action items in one DB call.
 * Wrapped in Suspense by the parent — streams independently.
 */
export async function ActionsSection() {
  const actions = await getHomeActions()
  return <ActionList actions={actions} />
}
