# Synchemy

Synchemy is  a state management library that keeps the client side store 
automatically in sync with the server using websockets. 
This library is used both on the client side and on the server side 
using nodejs and expressjs.

On the server side, this library uses an evented approach to receive
and send back messages to the client. Any messages sent back to the
client will update the store, unless explicitly told not to. 
This eliminates the need for a REST api and makes it quite easy to
keep data in sync with the client.

On the client side, you can register actions that will automatically
generate loading flags for each action. If used with react, you
can use the useStore hook to respond to any store or loading flag 
changes.

This is the client side setup.
```js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
import { synchemyClient as synchemy } from 'synchemy';
import registerActions from './actions';

const setup = async () => {
  await synchemy.createConnection({ host: 'ws://localhost:3000' });
  synchemy.updateStore({ todos: [] });
  registerActions();
  ReactDOM.render(<App />, document.getElementById('app'));
};

setup();
```

Here we register our actions. In this specific case, we register a GET_TODOS action.
The action can get called by invoking synchemy.actions.getTodos().
This will automatically create a synchemy.asyncActions.getTodos.loading 
flag that will be set to true in the beginning of the action and set to 
false at the end of the action.
```js
import { synchemyClient as synchemy } from 'synchemy';

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

The useStore hook is used in combination with react. The useStore 
callback will be invoked anytime there is a store change or a loading flag
change. Your component will rerender only if the changes are in any
of the properties that you return from the callback.
```js
import React, { useEffect } from 'react';
import { synchemyClient as synchemy, useStore } from 'synchemy';

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

This is the server side setup.
Whenever you send an event from the client side using
synchemy.send({ type: 'GET_TODOS' }), the onEvent callback will get
called. Whatever you return will then automatically update your store
on the client side, unless you send the event using
synchemy.send({ type: 'GET_TODOS' }, { updateStore: false })
```js
const express = require('express');
const server = require('http').createServer();
const { synchemyServer: synchemy } = require('synchemy');

var app = express();

synchemy.createConnection({ app, server });
synchemy.onEvent(async event => {
  if (event.type === 'GET_TODOS') {
    // to whatever you need to do to fetch todos
    const todos = await getTodos()
    return { todos }
  }

  return event;
});
```
## synchemyClient methods

| Method | Params | Params Example | Return Type | Description | Example |
| --- | --- | --- | --- | --- | --- |
| createConnection | { host: string } | { host: 'ws://localhost:3000' } // The port should be the same as your express server | Constructor function that defines the layout (height / width) of each element | Promise | createConnection is used to establish a websockets connection with the server. | await synchemy.createConnection({ host: 'ws://localhost:3000' }); |
