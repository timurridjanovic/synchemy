# Synchemy

## Install
`npm install @synchemy/use-store --save`

## Package versions

| Name | Latest Version |
| --- | --- |
| [@synchemy/use-store](https://github.com/timurridjanovic/synchemy/tree/main/packages/use-store) | [![badge](https://img.shields.io/npm/v/@synchemy/use-store.svg?style=flat-square)](https://www.npmjs.com/package/@synchemy/use-store) |

## Description

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
an update should occur, you can provide a shouldUpdate function.

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
