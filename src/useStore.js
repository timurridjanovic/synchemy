import { useEffect, useState, useMemo } from 'react'

const useStore = synchemy => (mapStateToProps, shouldUpdate) => {
  const initialState = useMemo(() => mapStateToProps(synchemy.store, synchemy.asyncActions), [])
  const [storeState, setStoreState] = useState(initialState)
  useEffect(() => {
    const subscribeCallback = state => {
      setStoreState(state)
    }

    const listenerId = synchemy.subscribe(mapStateToProps, subscribeCallback, shouldUpdate)

    return () => {
      synchemy.unsubscribe(listenerId)
    }
  }, [])

  return storeState
}

export default useStore
