'use client';
import type {ReactNode} from 'react';
import {SimulatorDrawerProvider} from '@/lib/tenant/simulator-drawer';
import SimulatorDrawer from '@/components/tenant/simulator-drawer';

export default function AssistantSectionLayout({children}: {children: ReactNode}) {
  return <SimulatorDrawerProvider>
    {children}
    <SimulatorDrawer/>
  </SimulatorDrawerProvider>;
}
