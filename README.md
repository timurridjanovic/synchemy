# Synchemy

## Install
`npm install @synchemy/core --save`

## Install synchemy useStore hook to use with react
`npm install @synchemy/use-store --save`

## Package versions

| Name | Latest Version |
| --- | --- |
| [@synchemy/core](https://github.com/timurridjanovic/synchemy/tree/main/packages/core) | [![badge](https://img.shields.io/npm/v/@synchemy/core.svg?style=flat-square)](https://www.npmjs.com/package/@synchemy/core) |
| [@synchemy/use-store](https://github.com/timurridjanovic/synchemy/tree/main/packages/use-store) | [![badge](https://img.shields.io/npm/v/@synchemy/use-store.svg?style=flat-square)](https://www.npmjs.com/package/@synchemy/use-store) |

## Description

Synchemy is a state management library that keeps the client side store 
automatically in sync with the server using websockets. 
This library is used both on the client side with react and on the server side 
using nodejs and expressjs.

On the server side, this library uses an evented approach to receive
and send back messages to the client. Any messages sent back to the
client will update the store, unless explicitly told not to. 
This eliminates the need for a REST api and makes it quite easy to
keep data in sync with the client.

On the client side, you can register actions that will automatically
generate loading flags for each action. Any time you call an action, a loading flag 
is automatically created. It is set to true at the beginning of the action and set 
to false at the end of the action. If used with react, you can use the useStore hook 
to subscribe to any store or loading flag changes. Actions also come with a debounce 
or throttle option in case you need to debounce or throttle your actions.

# SynchemyClient setup

First, let's create the synchemy instance and keep it in a separate file for easy imports.
```js
// synchemy.js
import { SynchemyClient } from '@synchemy/core';

const synchemy = new SynchemyClient({
  host: 'ws://localhost:3000'
})

export default synchemy
```

Next, you can initialize the store with some initial data and register your actions.
```js
// index.js
import React from "react";
import ReactDOM from "react-dom";
import Home from "./pages/home";
import synchemy from './synchemy';
import registerActions from './actions';

synchemy.updateStore({ counter: 0, todos: [] })
registerActions();
ReactDOM.render(<Home />, document.getElementById("app"));
```

Here we register our actions. In this specific case, we register a `GET_TODOS` action.
The action can get called by invoking `synchemy.actions.getTodos()`.
This will automatically create a `synchemy.asyncActions.getTodos.loading` 
flag that will be set to true in the beginning of the action and set to 
false at the end of the action.
```js
// actions.js
import synchemy from './synchemy';

const registerActions = () => {
  synchemy.registerAction('GET_TODOS', async () => {
    // sent messages receive a response from the server.
    // The store will be automatically updated with props from the 
    // response, unless you pass in { updateStore: false } as an option.
    // ex: const response = await synchemy.send({ type: 'GET_TODOS' }, { updateStore: false });
    const response = await synchemy.send({ type: 'GET_TODOS' });
  });
};

export default registerActions;
```

Debounce or throttle options can be set this way.
```js
  synchemy.registerAction('GET_TODOS', async () => {
    const response = await synchemy.send({ type: 'GET_TODOS' });
  }, { debounce: 500 });
```

Alternatively, you can also register your actions directly in the SynchemyClient constructor.
```js
const synchemy = new SynchemyClient({
  host: 'ws://localhost:3000',
  actions: {
    getTodos: {
      name: 'GET_TODOS',
      action: async () => {},
      options: { throttle: 500 } // options are optional
    }
  }
})
```

# useStore react hook setup (if used with react)

The useStore hook is used in combination with react. The useStore 
callback will be invoked anytime there is a store change or a loading flag
change. Your component will rerender only if the changes are in any
of the properties that you return from the callback.

```js
// app.js
import React, { useEffect } from 'react';
import synchemy from './synchemy';
import useStore from '@synchemy/use-store'

const App = () => {
  const store = useStore(synchemy)((state, loaders) => {
    return {
      todos: state.todos,
      getTodosLoading: loaders.getTodos.loading
    }
  });

  useEffect(() => {
    synchemy.actions.getTodos()
  }, []);

  return <div>
    TODOS
    {store.getTodosLoading &&
      <div>loading...</div>
    }
    {!store.getTodosLoading &&
      <div>
        {store.todos.map(todo => {
          return <Todo key={todo.id} {...todo} />
        })}
      </div>
    }
  </div>;
}

export default App;
```

Rerenders are based on the properties that you return from the useStore callback.
However, only a shallow comparison is made between the previous state and the next
state to determine whether a change has occured. If you want more customization on whether
an update should occur, you can provide a shouldUpdate callback.

```js
const store = useStore(synchemy)((state, loaders) => {
  return {
    todos: state.todos,
  }
}, (prevState, nextState) => {
  if (prevState.todos.length !== nextState.todos.length) {
    return true
  }

  return false
});
```

# SynchemyServer setup

Whenever you send an event from the client side using
`synchemy.send({ type: 'GET_TODOS' })`, the onMessage callback will get
called. Whatever you return will then automatically update your store
on the client side, unless you send the event using
`synchemy.send({ type: 'GET_TODOS' }, { updateStore: false })`.

```js
const express = require('express');
const server = require('http').createServer();
const { synchemyServer: synchemy } = require('@synchemy/core');

var app = express();

synchemy.createConnection({ app, server });
synchemy.onMessage(async (({ message, socketId }) => {
  // The socketId can be tracked to send messages to specific clients. All socket ids
  // are accessible on synchemy.sockets

  if (message.type === 'GET_TODOS') {
    // to whatever you need to do to fetch todos
    const todos = await getTodos()
    return { todos }
  }

  return message;
});
```

You can send messages to all clients...

```js
synchemy.sendAll(message)
```

...or to an array of specific clients.

```js
synchemy.send(socketIds, message)
```

If you don't want the client side store to update itself automatically when you send a 
message to the client using `synchemy.sendAll` or `synchemy.send`, you can set a callback
on the client side to react to messages from the server and perhaps update the store yourself.
```js
// this is on the client side
synchemy.onMessage(message => {
  // do something
})
```

Finally, if you need to do something on socket connection or socket disconnection, you can
setup these callbacks.

```js
  synchemy.onSocketConnection(callback)
  synchemy.onSocketDisconnection(callback)
```

## synchemyClient methods

| Method | Params | Description | Example |
| --- | --- | --- | --- |
| createConnection | (options: { host: string }) => Promise | createConnection is used to establish a websockets connection with the server. | `await synchemy.createConnection({ host: 'ws://localhost:3000' })` |
| subscribe | (mapStateToProps?: (state: State, loaders: Loaders) => props: Props, callback: () => void, shouldUpdate?: (prevState, nextState) => boolean) => string | subscribe is used to subscribe to store and loaders changes. The mapStateToProps param is used to select only certain props in the store for which you want to subscribe to. The callback is called once a change you subscribed to occurs. The shouldUpdate param gives you more control over whether you want to update the store or not. | `const listenerId = synchemy.subscribe(mapStateToProps, subscribeCallback, shouldUpdate)` |
| unsubscribe | (listenerId: string) => void | unsubscribe is used to remove the callback listener you set with the subscribe method. Use the listenerId returned by the subscribe method in the param. | `synchemy.unsubscribe(listenerId)` |
| onMessage | (message: { [key: string]: any } => void | onMessage is used to react to messages sent by the server instead of updating the store automatically. | `synchemy.onMessage(message => {})` |
| send | (message: { type: string, [key: string]: any } \| (store: Store) => Message, options?: { updateStore?: boolean, processResponse: (response: Response) => processedResponse: Response) => Promise | send is used to send messages to the server using websockets. The server will send back a response and update the store automatically unless updateStore is set to false. You can also process the server response before updating the store using the processResponse function. | `await synchemy.send({ type: 'GET_TODO', todoId }, { updateStore: false, processResponse })` |
| updateStore | (state: State \| (store: Store) => State) => void | updateStore is used to update the store directly on the client side without sending anything to the server. | `synchemy.updateStore(store => ({ counter: store.counter + 1 }))` |
| registerAction | (actionName: string, action: (...args: any) => void, options?: { debounce?: boolean, throttle?: boolean }) => void | registerAction is used to register an action that you can dispatch from your components. | `synchemy.registerAction('INCREMENT_COUNTER', async () => { ... }, { debounce: 500 })` |

## synchemyClient properties

| Properties | Description | Example |
| --- | --- | --- |
| actions | actions contains all the registered actions | `synchemy.actions.getTodos()` |
| asyncActions | asyncActions contains the loading flags for all the actions | `synchemy.asyncActions.getTodos.loading` |
| store | The store contains your application state | `synchemy.store.todos` |

## synchemyServer methods

| Method | Params | Description | Example |
| --- | --- | --- | --- |
| onMessage | ({ message: { type: string, [key: string]: any }, socketId: string }) => { [key: string]: any } | onMessage is used to set a callback that will receive all the messages sent from the client. The properties returned in the callback will then be used to update the store, unless the message was sent with the option { updateStore: false } | `synchemy.onMessage(({ message }) => { if (event.type === 'GET_TODOS') { return { todos } } return message })` |
| sendAll | (message: { [key: string]: any }) => void | send a message to all connected clients | `synchemy.sendAll(message)` |
| send | (sockets: [socketId: string], message: { [key: string]: any }) => void | send a message to specific connected clients | `synchemy.send(socketIds, message)` |
| onSocketConnection | (socketId: string) => void | callback that gets called every time a socket is connected | `synchemy.onSocketConnection(socketId => {})` |
| onSocketDisconnection | (socketId: string) => void | callback that gets called every time a socket is disconnected | `synchemy.onSocketDisconnection(socketId => {})` |

## synchemyServer properties

| Properties | Description | Example |
| --- | --- | --- |
| sockets | An array of socket ids that represent all the connected clients | `synchemy.sockets` |
