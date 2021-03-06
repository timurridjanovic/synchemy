import { v4 as uuid } from 'uuid'
import { debounce, throttle } from 'lodash'

const messagingManager = {
  client: null,
  host: null,
  listeners: {},
  queue: [],
  asyncActions: {}
}

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
        const { updateStore, processResponse } = options
        const newResult = processResponse ? processResponse(result) : result
        if (updateStore !== false) {
          this.store = { ...this.store, ...newResult }
          callListeners(messagingManager.listeners, {
            store: newResult,
            loaders: messagingManager.asyncActions
          }, this.store, this.asyncActions)
        }

        resolve(newResult)
        messagingManager.queue = messagingManager.queue.filter(m => m.message.messageId !== messageId)
      }

      messagingManager.client.onerror = error => {
        console.log('ERROR: ', error)
      }

      messagingManager.client.onclose = event => {
        if (event.code !== 1000) {
          // Error code 1000 means that the connection was closed normally.
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

  subscribe (mapStateToProps = state => state, callback, shouldUpdate) {
    const store = this.store
    const loaders = this.asyncActions
    const prevState = mapStateToProps(store, loaders)
    const debounceRender = (render, mappedProps) => {
      // If there's a pending render, cancel it
      if (render.debounce) {
        window.cancelAnimationFrame(render.debounce)
      }
      // Setup the new render to run at the next animation frame
      render.debounce = window.requestAnimationFrame(() => {
        render(mappedProps)
      })
    }
    const subscribeCallback = (prevState, changes, store, loaders, listener) => {
      if (listener.shouldUpdate) {
        const newState = mapStateToProps(store, loaders)
        if (listener.shouldUpdate(prevState, newState)) {
          listener.prevState = newState
          return debounceRender(callback, newState)
        }
        return
      }

      const newChanges = mapStateToProps(changes.store, changes.loaders)
      if (containsChange(newChanges, prevState)) {
        const newState = mapStateToProps(store, loaders)
        listener.prevState = newState
        return debounceRender(callback, newState)
      }
    }

    const listener = { subscribeCallback, prevState, shouldUpdate }
    const listenerId = uuid()
    messagingManager.listeners[listenerId] = listener
    return listenerId
  }

  unsubscribe (listenerId) {
    const { [listenerId]: _, ...otherListeners } = messagingManager.listeners
    messagingManager.listeners = otherListeners
  }

  send (message, options = {}) {
    return new Promise((resolve, reject) => {
      const getMessage = message => {
        if (typeof message === 'function') {
          return message(this.store)
        }

        return message
      }
      const newMessage = { ...getMessage(message), messageId: uuid() }
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
    if (typeof state === 'function') {
      const newState = state(this.store)
      this.store = { ...this.store, ...newState }

      callListeners(messagingManager.listeners, {
        store: newState, loaders: messagingManager.asyncActions
      }, this.store, this.asyncActions)
    } else {
      this.store = { ...this.store, ...state }

      callListeners(messagingManager.listeners, {
        store: state,
        loaders: messagingManager.asyncActions
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

    messagingManager.asyncActions[methodName] = {}
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
          ...messagingManager.asyncActions,
          [methodName]: { loading: true }
        }
      }
      callListeners(messagingManager.listeners, changes, this.store, this.asyncActions)
      await newAction(...args)
      this.asyncActions[methodName] = {
        ...this.asyncActions[methodName],
        loading: false
      }
      const newChanges = {
        store: {},
        loaders: {
          ...messagingManager.asyncActions,
          [methodName]: { loading: false }
        }
      }
      callListeners(messagingManager.listeners, newChanges, this.store, this.asyncActions)
    }
  }
}

const synchemy = new SynchemyClient()
export default synchemy
