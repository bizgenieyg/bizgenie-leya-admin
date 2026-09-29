'use client';
import type {ReactNode} from 'react';
import {SimulatorDrawerProvider} from '@/lib/tenant/simulator-drawer';
import SimulatorDrawer from '@/components/tenant/simulator-drawer';

/** Same simulator drawer as in "Ассистент" (task X, 5а): the button on this page opened nothing without it. */
export default function KnowledgeSectionLayout({children}: {children: ReactNode}) {
  return <SimulatorDrawerProvider>
    {children}
    <SimulatorDrawer/>
  </SimulatorDrawerProvider>;
}
