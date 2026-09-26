import { useEffect, useState } from 'react'

// Current time, refreshed every `intervalMs` so clocks stay live.
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
