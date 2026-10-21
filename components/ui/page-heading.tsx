'use client';
import type {ReactNode} from 'react';
import {SimulatorOpenButton} from '@/components/tenant/simulator-drawer';

/**
 * Z8: the page header of every cabinet page — title, one line of help, page actions and «Проверить ответы» at the
 * end edge (on phones the same button floats above the bottom menu, see .simulator-open-button in globals.css).
 */
export default function PageHeading({title,help,actions}:{title:ReactNode;help?:ReactNode;actions?:ReactNode}){
 return <header className="page-heading z8-heading"><div className="page-heading-copy"><h1>{title}</h1>{help?<p>{help}</p>:null}</div><div className="page-actions">{actions}<SimulatorOpenButton/></div></header>;
}
