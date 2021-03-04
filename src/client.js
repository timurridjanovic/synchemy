import { v4 as uuid } from 'uuid'

const messagingManager = {
  client: null,
  host: null,
  listeners: {},
  queue: []
}

const callListeners = (listeners, changes, store, loaders) => {
  Object.values(listeners).forEach(listener => {
    listener(changes, store, loaders)
  })
}

const containsChange = (changes, store) => {
  return Object.entries(changes).reduce((hasChange, change) => {
    if (hasChange) { return true }
    if (store[change[0]] !== undefined) {
      return true
    }

    return false
  }, false)
}

const isOpen = ws => {
  return ws.readyState === ws.OPEN
}

class SynchemyClient {
  constructor () {
    this.store = {}
    this.actions = {}
    this.asyncActions = {}
  }

  createConnection ({ host }) {
    return new Promise((resolve, reject) => {
      messagingManager.host = host
      messagingManager.client = new WebSocket(host)
      messagingManager.client.onmessage = ({ data }) => {
        const response = JSON.parse(data)
        const { result, messageId } = response
        const { resolve, options } = messagingManager.queue.find(m => m.message.messageId === messageId)
        if (options.updateStore !== false) {
          this.store = { ...this.store, ...result }
          callListeners(messagingManager.listeners, result, this.store, this.asyncActions)
        }

        resolve(result)
        messagingManager.queue = messagingManager.queue.filter(m => m.message.messageId !== messageId)
      }

      messagingManager.client.onerror = error => {
        console.log('ERROR: ', error)
      }

      messagingManager.client.onclose = event => {
        console.log('EVENT: ', event)
        if (event.code !== 1000) {
          // Error code 1000 means that the connection was closed normally.
          // Try to reconnect.
          if (!navigator.onLine) {
            reject(new Error('You are offline. Please connect to the Internet and try again.'))
          }
        }
      }

      messagingManager.client.onopen = () => {
        resolve()
      }
    })
  }

  subscribe (mapStateToProps = state => state, callback) {
    const newSubscribeCallback = (changes, store, loaders) => {
      const mappedProps = mapStateToProps(store, loaders)
      if (containsChange(changes, mappedProps)) {
        callback(mappedProps)
      }
    }

    const listenerId = uuid()
    messagingManager.listeners[listenerId] = newSubscribeCallback
    return listenerId
  }

  unsubscribe (listenerId) {
    const { [listenerId]: _, ...otherListeners } = messagingManager.listeners
    messagingManager.listeners = otherListeners
  }

  send (message, options = {}) {
    return new Promise((resolve, reject) => {
      const newMessage = { ...message, messageId: uuid() }
      messagingManager.queue.push({ message: newMessage, resolve, options })
      if (isOpen(messagingManager.client)) {
        messagingManager.client.send(JSON.stringify(newMessage))
      } else {
        this.createConnection({ host: messagingManager.host })
        messagingManager.client.onopen = () => {
          messagingManager.client.send(JSON.stringify(newMessage))
        }
      }
    })
  }

  updateStore (state) {
    this.store = { ...this.store, ...state }
    callListeners(messagingManager.listeners, state, this.store, this.asyncActions)
  }

  registerAction (actionName, action) {
    const methodName = actionName.split('_').map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }

      return `${word.substring(0, 1).toUpperCase()}${word.substring(1).toLowerCase()}`
    }).join('')

    this.asyncActions[methodName] = {
      name: actionName,
      loading: false
    }

    this.actions[methodName] = async (...args) => {
      this.asyncActions[methodName] = {
        ...this.asyncActions[methodName],
        loading: true
      }
      callListeners(messagingManager.listeners, {
        [`${methodName}Loading`]: true
      }, this.store, this.asyncActions)
      await action(...args)
      this.asyncActions[methodName] = {
        ...this.asyncActions[methodName],
        loading: false
      }
      callListeners(messagingManager.listeners, {
        [`${methodName}Loading`]: false
      }, this.store, this.asyncActions)
    }
  }
}

const synchemy = new SynchemyClient()
export default synchemy
