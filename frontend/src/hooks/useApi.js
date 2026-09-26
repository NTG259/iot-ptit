import { useEffect, useState } from 'react'

/**
 * Runs `load()` whenever `deps` change (and every `intervalMs` if given) and keeps the last
 * successful result, so polling doesn't flash the UI back to a loading state.
 */
export default function useApi(load, deps, { intervalMs } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const run = () =>
      load().then(
        (data) => !cancelled && setState({ data, error: null, loading: false }),
        (error) => !cancelled && setState((prev) => ({ ...prev, error, loading: false })),
      )

    run()
    const id = intervalMs ? setInterval(run, intervalMs) : undefined
    return () => {
      cancelled = true
      clearInterval(id)
    }
    // `load` is a fresh closure each render; `deps` lists what it actually reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey, intervalMs])

  return { ...state, reload: () => setReloadKey((k) => k + 1) }
}
