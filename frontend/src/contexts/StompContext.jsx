import { createContext, useContext, useEffect, useState } from 'react'
import { Client as StompClient } from '@stomp/stompjs'

const StompContext = createContext({ stompConnected: false })

export function useStompStatus() {
  return useContext(StompContext)
}

export function StompProvider({ children }) {
  const [stompConnected, setStompConnected] = useState(false)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${protocol}://${window.location.host}/api/ws`

    const client = new StompClient({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      onStompError: (frame) => console.error('[STOMP] error', frame),
      onWebSocketError: (event) => { console.error('[STOMP] ws error', event); setStompConnected(false) },
      onDisconnect: () => setStompConnected(false),
      onConnect: () => {
        setStompConnected(true)
        console.log('[STOMP] connected to', wsUrl)
      },
    })
    client.activate()
    return () => { client.deactivate() }
  }, [])

  return (
    <StompContext.Provider value={{ stompConnected }}>
      {children}
    </StompContext.Provider>
  )
}
