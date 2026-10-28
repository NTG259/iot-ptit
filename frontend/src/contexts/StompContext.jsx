import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { notification } from 'antd'
import { Client as StompClient } from '@stomp/stompjs'

const StompContext = createContext({
  stompConnected: false,
  alertActive: false,
  alertCode: null,
  alertValue: null,
  alertHistory: [],
  dismissAlert: () => {},
})

export function useStompStatus() {
  return useContext(StompContext)
}

export function StompProvider({ children }) {
  const [notifier, notificationHolder] = notification.useNotification()
  const notifierRef = useRef(notifier)
  notifierRef.current = notifier

  const [stompConnected, setStompConnected] = useState(false)
  const [alertActive, setAlertActive] = useState(false)
  const [alertCode, setAlertCode] = useState(null)
  const [alertValue, setAlertValue] = useState(null)
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
          setAlertActive(true)
          setAlertCode(alert.sensorCode)
          setAlertValue(alert.value)
          setAlertHistory(prev =>
            [{ sensorCode: alert.sensorCode, value: alert.value, threshold: alert.threshold, time: alert.time }, ...prev].slice(0, 20)
          )
          notifierRef.current.warning({
            message: 'Sensor Alert',
            description: `${alert.sensorCode.toUpperCase()} value ${alert.value} exceeds threshold (${alert.threshold})`,
            placement: 'topRight',
            duration: 5,
          })
        })
      },
    })
    client.activate()
    return () => { client.deactivate() }
  }, [])

  function dismissAlert() { setAlertActive(false) }

  return (
    <StompContext.Provider value={{ stompConnected, alertActive, alertCode, alertValue, alertHistory, dismissAlert }}>
      {notificationHolder}
      {children}
    </StompContext.Provider>
  )
}
