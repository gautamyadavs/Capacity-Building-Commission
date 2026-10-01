import { createRoot } from 'react-dom/client';
import { ConfigSchema } from './model';
import App from './App';
import './global.css';

const root=createRoot(document.getElementById('root')!);
root.render(<div style={{padding:'4rem',fontFamily:'sans-serif'}}>Loading Bharat KALP…</div>);
fetch(`${import.meta.env.BASE_URL}content/assessments.json`, {cache:'no-cache'})
  .then(response=>{if(!response.ok)throw new Error('Unable to load assessment content.');return response.json();})
  .then(data=>root.render(<App config={ConfigSchema.parse(data)}/>))
  .catch(()=>root.render(<main style={{padding:'4rem',maxWidth:'40rem',fontFamily:'sans-serif'}}><h1>The assessment content could not be loaded</h1><p>Please check your connection and reload. Existing saved responses have not been changed.</p><button onClick={()=>window.location.reload()}>Reload assessment</button></main>));
