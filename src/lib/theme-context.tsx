'use client'
import { createContext, useContext } from 'react'

interface ThemeCtx { dark: boolean; toggle: () => void }

export const ThemeContext = createContext<ThemeCtx>({ dark: true, toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)
