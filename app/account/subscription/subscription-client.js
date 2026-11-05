 'use client'
import {useEffect,useRef} from 'react'
export default function SubscriptionClient(){
 const root=useRef(null)
 useEffect(()=>{
  if(!['web.zpas.org','localhost','127.0.0.1'].includes(location.hostname)){location.replace('https://web.zpas.org/account/subscription');return}
  let active=true,cleanup
  import(/* webpackIgnore: true */ '/resources/js/subscription-account.mjs?v=1').then(module=>{if(active)cleanup=module.mountSubscription(root.current)}).catch(()=>{if(active)root.current.textContent='Subscription management could not load. Please reload to try again.'})
  return()=>{active=false;cleanup?.()}
 },[])
 return <main className="billing-account"><link rel="stylesheet" href="/resources/css/subscription-account.css?v=1"/><div ref={root} role="region" aria-label="Subscription management">Loading your subscription…</div></main>
}
