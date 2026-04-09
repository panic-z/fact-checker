import React from 'react'
import { createRoot } from 'react-dom/client'
import { Options } from './Options'

const container = document.getElementById('root')!
createRoot(container).render(<Options />)
