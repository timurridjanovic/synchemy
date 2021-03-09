export const raf = (() => {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame
  }

  const fps = 60
  const delay = 1000 / fps
  const animationStartTime = Date.now()
  let previousCallTime = animationStartTime
  return func => {
    const requestTime = Date.now()
    const timeout = Math.max(0, delay - (requestTime - previousCallTime))
    const timeToCall = requestTime + timeout
    previousCallTime = timeToCall
    return setTimeout(() => {
      func(timeToCall - animationStartTime)
    }, timeout)
  }
})()

export const caf = (() => {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    return window.cancelAnimationFrame
  }

  return (id) => {
    clearTimeout(id)
  }
})()
