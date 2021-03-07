import { v4 as uuid } from 'uuid'
import { debounce, throttle } from 'lodash'

const callListeners = (listeners, changes, store, loaders) => {
  Object.values(listeners).forEach(listener => {
    listener.subscribeCallback(listener.prevState, changes, store, loaders, listener)
  })
}

const containsChange = (changes, prevState) => {
  for (const change of Object.entries(changes)) {
    if (change[1] !== undefined && prevState[change[0]] !== change[1]) {
      return true
    }
  }

  return false
}

const debouncePerAnimationFrame = (func, params) => {
  // If there's a pending function call, cancel it
  if (func.debounce) {
    window.cancelAnimationFrame(func.debounce)
  }
  // Setup the new function call to run at the next animation frame
  func.debounce = window.requestAnimationFrame(() => {
    func(params)
  })
}

const isOpen = ws => {
  return ws.readyState === ws.OPEN
}

const isConnecting = ws => {
  return ws.readyState === ws.CONNECTING
}

class SynchemyClient {
  store = {}
  actions = {}
  asyncActions = {}
  #messagingManager = {
    client: null,
    host: null,
    onMessage: null,
    listeners: {},
    queue: [],
    asyncActions: {}
  }

  constructor ({ host, actions = {} }) {
    if (!host) {
      throw new Error('You must provide a host to connect to.')
    }

    this.createConnection({ host })

    Object.values(actions).forEach(action => {
      this.registerAction(action.name, action.action, action.options)
    })
  }

  createConnection ({ host }) {
    this.#messagingManager.host = host
    this.#messagingManager.client = new WebSocket(host)
    this.#messagingManager.client.onmessage = ({ data }) => {
      const response = JSON.parse(data)
      const { message, messageId } = response
      if (messageId) {
        const { resolve, options } = this.#messagingManager.queue.find(m => m.message.messageId === messageId)
        const { updateStore, processResponse } = options
        const newResult = processResponse ? processResponse(message) : message
        if (updateStore !== false) {
          this.store = { ...this.store, ...newResult }
          callListeners(this.#messagingManager.listeners, {
            store: newResult,
            loaders: this.#messagingManager.asyncActions
          }, this.store, this.asyncActions)
        }

        resolve(newResult)
        this.#messagingManager.queue = this.#messagingManager.queue.filter(m => m.message.messageId !== messageId)
      } else {
        if (this.#messagingManager.onMessage) {
          this.#messagingManager.onMessage(message)
        } else {
          this.store = { ...this.store, ...message }
          callListeners(this.#messagingManager.listeners, {
            store: message,
            loaders: this.#messagingManager.asyncActions
          }, this.store, this.asyncActions)
        }
      }
    }

    this.#messagingManager.client.onclose = event => {
      if (event.code !== 1000) {
        // Error code 1000 means that the connection was closed normally.
        if (!navigator.onLine) {
          throw new Error('You are offline. Please connect to the Internet and try again.')
        }
      }
    }
  }

  subscribe (mapStateToProps = state => state, callback, shouldUpdate) {
    const store = this.store
    const loaders = this.asyncActions
    const prevState = mapStateToProps(store, loaders)
    const subscribeCallback = (prevState, changes, store, loaders, listener) => {
      if (listener.shouldUpdate) {
        const newState = mapStateToProps(store, loaders)
        if (listener.shouldUpdate(prevState, newState)) {
          listener.prevState = newState
          return debouncePerAnimationFrame(callback, newState)
        }
        return
      }

      const newChanges = mapStateToProps(changes.store, changes.loaders)
      if (containsChange(newChanges, prevState)) {
        const newState = mapStateToProps(store, loaders)
        listener.prevState = newState
        return debouncePerAnimationFrame(callback, newState)
      }
    }

    const listener = { subscribeCallback, prevState, shouldUpdate }
    const listenerId = uuid()
    this.#messagingManager.listeners[listenerId] = listener
    return listenerId
  }

  unsubscribe (listenerId) {
    const { [listenerId]: _, ...otherListeners } = this.#messagingManager.listeners
    this.#messagingManager.listeners = otherListeners
  }

  onMessage (func) {
    this.#messagingManager.onMessage = func
  }

  send (message, options = {}) {
    return new Promise((resolve, reject) => {
      const getMessage = message => {
        if (typeof message === 'function') {
          return message(this.store)
        }

        return message
      }
      const newMessage = { message: getMessage(message), messageId: uuid() }
      this.#messagingManager.queue.push({ message: newMessage, resolve, options })
      if (isOpen(this.#messagingManager.client)) {
        this.#messagingManager.client.send(JSON.stringify(newMessage))
      } else {
        if (!isConnecting(this.#messagingManager.client)) {
          this.createConnection({ host: this.#messagingManager.host })
        }

        this.#messagingManager.client.onopen = () => {
          this.#messagingManager.client.send(JSON.stringify(newMessage))
        }
      }
    })
  }

  updateStore (state) {
    if (typeof state === 'function') {
      const newState = state(this.store)
      this.store = { ...this.store, ...newState }

      callListeners(this.#messagingManager.listeners, {
        store: newState, loaders: this.#messagingManager.asyncActions
      }, this.store, this.asyncActions)
    } else {
      this.store = { ...this.store, ...state }

      callListeners(this.#messagingManager.listeners, {
        store: state,
        loaders: this.#messagingManager.asyncActions
      }, this.store, this.asyncActions)
    }
  }

  registerAction (actionName, action, options = {}) {
    const getAction = (action, options) => {
      if (options.debounce) {
        return debounce(action, options.debounce)
      }

      if (options.throttle) {
        return throttle(action, options.throttle)
      }

      return action
    }

    const newAction = getAction(action, options)
    const methodName = actionName.split('_').map((word, index) => {
      if (index === 0) {
        return word.toLowerCase()
      }

      return `${word.substring(0, 1).toUpperCase()}${word.substring(1).toLowerCase()}`
    }).join('')

    this.#messagingManager.asyncActions[methodName] = {}
    this.asyncActions[methodName] = {
      name: actionName,
      loading: false
    }

    this.actions[methodName] = async (...args) => {
      this.asyncActions[methodName] = {
        ...this.asyncActions[methodName],
        loading: true
      }
      const changes = {
        store: {},
        loaders: {
          ...this.#messagingManager.asyncActions,
          [methodName]: { loading: true }
        }
      }
      callListeners(this.#messagingManager.listeners, changes, this.store, this.asyncActions)
      await newAction(...args)
      this.asyncActions[methodName] = {
        ...this.asyncActions[methodName],
        loading: false
      }
      const newChanges = {
        store: {},
        loaders: {
          ...this.#messagingManager.asyncActions,
          [methodName]: { loading: false }
        }
      }
      callListeners(this.#messagingManager.listeners, newChanges, this.store, this.asyncActions)
    }
  }
}

export default SynchemyClient
