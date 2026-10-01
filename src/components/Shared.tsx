import type { ReactNode, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context';
import { stageStatus, type Assessment } from '../model';
import styles from '../app.module.css';
export function AppLink({to,children,className,...props}:{to:string;children:ReactNode;className?:string;'aria-current'?:'page'|'step'}) {
  const {store}=useSession();const navigate=useNavigate();
  const click=async(e:MouseEvent<HTMLAnchorElement>)=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();try{await store.flush();navigate(to);}catch{}};
  return <Link to={to} className={className} onClick={click} {...props}>{children}</Link>;
}
export function Paragraphs({lines}:{lines:string[]}) {return <>{lines.map((line,i)=><p key={`${i}-${line}`}>{line}</p>)}</>;}
export function ErrorBox({message}:{message:string}) {return <div className={styles.errorBox} role="alert"><h1>Unable to open this view</h1><p>{message}</p><Link to="/learner">Return to assessments</Link></div>;}
export function StageProgress({a,current}:{a:Assessment;current:string}) {
  const {run,mode}=useSession();return <nav aria-label="Assessment stages" className={styles.stageProgress}><ol>{a.stages.map((s,i)=>{
    const status=stageStatus(a,run.sessions[a.id],s);const active=s.id===current;const enabled=status!=='notYetAvailable';
    const inner=<><span className={styles.stepNumber}>{status==='submitted'?'✓':i+1}</span><span><strong>{s.title}</strong><small>{status==='submitted'?'Submitted and locked':status==='current'?'Current stage':'Locked'}</small></span></>;
    return <li key={s.id} data-active={active} data-status={status}>{enabled?<AppLink to={`/${mode}/assessment/${a.id}/stage/${s.id}`} aria-current={active?'step':undefined}>{inner}</AppLink>:<span aria-disabled="true">{inner}</span>}</li>;
  })}</ol></nav>;
}
