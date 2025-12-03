import { useEffect, useState } from 'react'
import App from './App.tsx'
import TestCaseGenerator from './components/TestCaseGenerator.tsx'
import EvalPage from './pages/EvalPage.tsx'

function getRoute() {
  const h = window.location.hash || '#/main'
  if (h.startsWith('#/form')) return 'form' as const
  if (h.startsWith('#/eval')) return 'eval' as const
  return 'main' as const
}

export default function Root() {
  const [route, setRoute] = useState<'main' | 'form' | 'eval'>(getRoute())

  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '#/main'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'form') return <TestCaseGenerator />
  if (route === 'eval') return <EvalPage />
  return <App />
}

