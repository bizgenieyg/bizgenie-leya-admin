'use client';
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
export type ThemeChoice='system'|'light'|'dark';
const ThemeContext=createContext({theme:'system' as ThemeChoice,setTheme:(_theme:ThemeChoice)=>{}});
export function ThemeProvider({children}:{children:ReactNode}){const[theme,setState]=useState<ThemeChoice>('system');useEffect(()=>{const saved=localStorage.getItem('leya-theme');if(saved==='light'||saved==='dark'||saved==='system')setState(saved);},[]);useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[theme]);const setTheme=useCallback((next:ThemeChoice)=>{localStorage.setItem('leya-theme',next);setState(next);},[]);return <ThemeContext.Provider value={{theme,setTheme}}>{children}</ThemeContext.Provider>}
export const useTheme=()=>useContext(ThemeContext);
