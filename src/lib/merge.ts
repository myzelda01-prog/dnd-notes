/**
 * Last-writer-wins rules for syncing. Every record carries an `updated` time;
 * a delete is stored remotely as a tombstone `{ deleted: true, updated }` so
 * that other devices learn about it.
 */

export interface RemoteRecord {
  updated: number
  deleted?: boolean
}

export type RemoteAction = 'put' | 'delete' | 'skip'

/** What to do locally when the cloud copy of a record arrives. */
export function decideRemote(
  remote: RemoteRecord,
  local: { updated: number } | undefined,
  localDeletedAt: number | undefined,
): RemoteAction {
  if (remote.deleted) {
    return local && local.updated <= remote.updated ? 'delete' : 'skip'
  }
  // A newer delete on this device wins; it will be pushed.
  if (localDeletedAt !== undefined && localDeletedAt >= remote.updated) return 'skip'
  if (!local || remote.updated > local.updated) return 'put'
  return 'skip'
}

/** Whether a local change still needs to be sent to the cloud. */
export function needsPush(localUpdated: number, remoteUpdated: number | undefined): boolean {
  return remoteUpdated === undefined || localUpdated > remoteUpdated
}
