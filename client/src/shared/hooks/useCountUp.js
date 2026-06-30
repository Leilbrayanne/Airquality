import { useState, useEffect } from 'react'

export function useCountUp(target, duration = 1200, decimals = 1) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let start = 0
    const steps = 40
    const increment = target / steps
    const interval = duration / steps

    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(parseFloat(start.toFixed(decimals)))
      }
    }, interval)

    return () => clearInterval(timer)
  }, [target, duration, decimals])

  return value
}
