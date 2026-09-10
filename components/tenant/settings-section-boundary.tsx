"use client";
import React from 'react';
import {useI18n} from '@/lib/i18n';
function LocalizedError(){const{t}=useI18n();return <section className="rounded-2xl bg-white p-8 shadow-sm"><p role="alert" className="text-red-600">{t('sectionError')}</p></section>}
class Boundary extends React.Component<React.PropsWithChildren,{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<LocalizedError/>:this.props.children;}}
function Renderer({render}:{render:()=>React.ReactNode}){return render();}
export default function SettingsSectionBoundary({render}:{render:()=>React.ReactNode}){return <Boundary><Renderer render={render}/></Boundary>;}
