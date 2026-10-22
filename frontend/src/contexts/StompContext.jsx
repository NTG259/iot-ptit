import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { notification } from 'antd'
import { Client as StompClient } from '@stomp/stompjs'

const StompContext = createContext({
  stompConnected: false,
  windAlertActive: false,
  windAlertValue: null,
  alertHistory: [],
  dismissWindAlert: () => {},
})

export function useStompStatus() {
  return useContext(StompContext)
}

export function StompProvider({ children }) {
  const [notifier, notificationHolder] = notification.useNotification()
  const notifierRef = useRef(notifier)
  notifierRef.current = notifier

  const [stompConnected, setStompConnected] = useState(false)
  const [windAlertActive, setWindAlertActive] = useState(false)
  const [windAlertValue, setWindAlertValue] = useState(null)
  const [alertHistory, setAlertHistory] = useState([])

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
        client.subscribe('/topic/alerts', (msg) => {
          const alert = JSON.parse(msg.body)
          if (alert.sensorCode === 'wind') {
            setWindAlertActive(true)
            setWindAlertValue(alert.value)
            setAlertHistory(prev =>
              [{ value: alert.value, threshold: alert.threshold, time: alert.time }, ...prev].slice(0, 20)
            )
            notifierRef.current.warning({
              message: 'Wind Speed Alert',
              description: `Wind speed ${alert.value.toFixed(1)} m/s exceeds threshold (${alert.threshold} m/s)`,
              placement: 'topRight',
              duration: 5,
            })
          }
        })
      },
    })
    client.activate()
    return () => { client.deactivate() }
  }, [])

  function dismissWindAlert() { setWindAlertActive(false) }

  return (
    <StompContext.Provider value={{ stompConnected, windAlertActive, windAlertValue, alertHistory, dismissWindAlert }}>
      {notificationHolder}
      {children}
    </StompContext.Provider>
  )
}
