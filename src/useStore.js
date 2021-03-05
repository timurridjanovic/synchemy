import { useEffect, useState, useMemo } from 'react'

const useStore = synchemy => (mapStateToProps) => {
  const initialState = useMemo(() => mapStateToProps(synchemy.store, synchemy.asyncActions), [])
  const [storeState, setStoreState] = useState(initialState)
  useEffect(() => {
    const subscribeCallback = state => {
      setStoreState(state)
    }

    const listenerId = synchemy.subscribe(mapStateToProps, subscribeCallback, synchemy.store, synchemy.asyncActions)

    return () => {
      synchemy.unsubscribe(listenerId)
    }
  }, [])

  return storeState
}

export default useStore
