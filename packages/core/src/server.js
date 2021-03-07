import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'

class SynchemyServer {
  sockets = []
  #messagingManager = {
    sockets: {},
    onMessageCallback: null,
    onSocketConnectionCallback: null,
    onSocketDisconnectionCallback: null
  }

  constructor ({ app, server, options = {} }) {
    const ws = new WebSocket.Server({
      server,
      ...options
    })

    server.on('request', app)

    ws.on('connection', socket => {
      const socketId = uuid()
      this.#messagingManager.sockets[socketId] = socket
      this.sockets.push(socketId)

      socket.on('message', data => {
        const parsedData = JSON.parse(data)
        if (this.#messagingManager.onMessageCallback) {
          this.#messagingManager.onMessageCallback(parsedData, socketId).then(({ message, messageId }) => {
            socket.send(JSON.stringify({
              message, messageId
            }))
          })
        }
      })

      socket.on('close', () => {
        if (this.#messagingManager) {
          const { [socketId]: _, ...otherSockets } = this.#messagingManager.sockets
          this.#messagingManager.sockets = otherSockets
          this.sockets = Object.keys(otherSockets)
          if (this.#messagingManager.onSocketDisconnectionCallback) {
            this.#messagingManager.onSocketDisconnectionCallback(socketId)
          }
        }
      })

      if (this.#messagingManager.onSocketConnectionCallback) {
        this.#messagingManager.onSocketConnectionCallback(socketId)
      }
    })
  }

  onSocketConnection (func) {
    this.#messagingManager.onSocketConnectionCallback = func
  }

  onSocketDisconnection (func) {
    this.#messagingManager.onSocketDisconnectionCallback = func
  }

  onMessage (func) {
    this.#messagingManager.onMessageCallback = (data, socketId) => {
      return new Promise((resolve, reject) => {
        const { messageId, message } = data
        const newMessage = func({ message, socketId })
        resolve({ message: newMessage, messageId })
      })
    }
  }

  send (sockets = [], message) {
    if (!Array.isArray(sockets)) {
      throw new Error('The first param to synchemy.send must be an array of socket ids.')
    }

    sockets.forEach(socketId => {
      const socket = this.#messagingManager.sockets[socketId]
      if (socket && socket.send) {
        socket.send(JSON.stringify({
          message
        }))
      } else {
        throw new Error('One of the socketIds you provided is invalid.')
      }
    })
  }

  sendAll (message) {
    Object.values(this.#messagingManager.sockets).forEach(socket => {
      socket.send(JSON.stringify({
        message
      }))
    })
  }
}

export default SynchemyServer
