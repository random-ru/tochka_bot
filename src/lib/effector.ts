import { createEffect, createEvent, createStore, Effect, Event, forward, restore, Store } from 'effector'

interface Status {
  loading: Store<boolean>
  succeed: Store<boolean>
  failed: Store<boolean>
}

export function createStatus<TParams extends unknown, TDone extends unknown, TFail extends Error>(
  effect: Effect<TParams, TDone, TFail>
): Status {
  const loading = effect.pending

  const succeed = createStore(false)
    .on(effect.done, () => true)
    .reset(effect)

  const failed = createStore(false)
    .on(effect.fail, () => true)
    .reset(effect)

  return {
    loading,
    succeed,
    failed,
  }
}

interface Options<TValue, TMapped> {
  query: () => Promise<TValue>
  selector?: (value: TValue) => TMapped
}

interface Source<TValue, TMapped> {
  store: Store<TMapped | null>
  load: Event<void>
  status: Status
}

export function createSource<TValue, TMapped = TValue>({
  query,
  selector = (value) => value as unknown as TMapped,
}: Options<TValue, TMapped>): Source<TValue, TMapped> {
  const effect = createEffect(query)
  const load = createEvent()
  forward({ from: load, to: effect })
  const store = restore(effect, null)
  const mapped = store.map((value) => {
    if (value === null) return null
    return selector(value)
  })
  const status = createStatus(effect)
  return { store: mapped, load, status }
}
