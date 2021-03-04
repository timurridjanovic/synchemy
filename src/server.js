import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'

let sockets = {}
let onEventCallback

class SynchemyServer {
  createConnection ({ app, server }) {
    const ws = new WebSocket.Server({
      server
    })

    server.on('request', app)

    ws.on('connection', socket => {
      const socketId = uuid()
      sockets[socketId] = socket

      socket.on('message', data => {
        const message = JSON.parse(data)
        if (onEventCallback) {
          onEventCallback(message).then(({ result, type, messageId }) => {
            socket.send(JSON.stringify({
              result, type, messageId
            }))
          })
        }
      })

      socket.on('close', function () {
        const { [socketId]: _, ...otherSockets } = sockets
        sockets = otherSockets
      })
    })
  }

  onEvent (func) {
    onEventCallback = message => {
      return new Promise((resolve, reject) => {
        const { type, messageId, ...otherProps } = message
        const result = func({ type, ...otherProps })
        resolve({ result, type, messageId })
      })
    }
  }
}

const synchemy = new SynchemyServer()
export default synchemy
