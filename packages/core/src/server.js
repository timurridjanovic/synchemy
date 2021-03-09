import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'

const paramTypeErrors = (functionName, types, returnType) => {
  return `${functionName} takes these param types: (${types.join(', ')}) => ${returnType}.`
}

const getConstructorParamType = () => {
  return 'oneOf(' +
    '{ server: NodeHTTPServer, app?: ExpressApp, port?: Number }, ' +
    '{ port: Number }' +
  ')'
}

class SynchemyServer {
  sockets = []
  #messagingManager = {
    sockets: {},
    onMessageCallback: null,
    onSocketConnectionCallback: null,
    onSocketDisconnectionCallback: null
  }

  constructor (args) {
    if (!args) {
      throw new Error(paramTypeErrors('SynchemyServer constructor', [getConstructorParamType()], 'void'))
    }

    const { app, server, port, options = {} } = args
    if (!server && !port) {
      throw new Error(paramTypeErrors('SynchemyServer constructor', [getConstructorParamType()], 'void'))
    }

    if (app && typeof app !== 'function') {
      throw new Error('The app property needs to be an Expressjs app.')
    }

    const config = port ? { port } : { server }
    const ws = new WebSocket.Server({
      ...config,
      ...options
    })

    if (server && app) {
      server.on('request', app)
    }

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
    if (typeof func !== 'function') {
      throw new Error(paramTypeErrors('onSocketConnection', ['function'], 'void'))
    }

    this.#messagingManager.onSocketConnectionCallback = func
  }

  onSocketDisconnection (func) {
    if (typeof func !== 'function') {
      throw new Error(paramTypeErrors('onSocketConnection', ['function'], 'void'))
    }

    this.#messagingManager.onSocketDisconnectionCallback = func
  }

  onMessage (func) {
    if (typeof func !== 'function') {
      throw new Error(paramTypeErrors('onSocketConnection', ['function'], 'void'))
    }

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
