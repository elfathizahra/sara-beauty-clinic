import { getStore } from '@netlify/blobs';
import type { Config } from '@netlify/functions';

const times = ['09:00','10:30','12:00','13:30','15:00','16:30'];
const serviceIds = ['analyse','hydrafacial','hydrafacial-deluxe','laser-gezicht','laser-oksels','laser-benen'];
const json = (body: object,status=200) => new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
function validDate(d:string) {const dt = new Date(`${d}T12:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0,10)===d && dt.getUTCDay()!==0;}
export default async (request:Request) => {
 try {
  const store=getStore({name:'sara-bookings',consistency:'strong'});
  if(request.method==='GET') {
    const date=new URL(request.url).searchParams.get('date')||'';
    if(!validDate(date)) return json({error:'Kies een geldige datum.'},400);
    const {blobs}=await store.list({prefix:`${date}/`});
    return json({slots:times.filter(t=>!blobs.some(b=>b.key===`${date}/${t}`))});
  }
  if(request.method!=='POST') return json({error:'Methode niet toegestaan.'},405);
  const b=await request.json() as Record<string,unknown>;
  const {date,time,service,name,email,phone}=b;
  if(typeof date!=='string'||!validDate(date)||typeof time!=='string'||!times.includes(time)||typeof service!=='string'||!serviceIds.includes(service)||typeof name!=='string'||!name.trim()||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||typeof phone!=='string'||phone.trim().length<7) return json({error:'Controleer je gegevens.'},400);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(date<today) return json({error:'Deze datum is voorbij.'},400);
  const key=`${date}/${time}`;
  if(await store.get(key)) return json({error:'Deze tijd is al gereserveerd.'},409);
  await store.setJSON(key,{service,name:name.trim().slice(0,120),email:email.trim().slice(0,200),phone:phone.trim().slice(0,40),createdAt:new Date().toISOString()});
  return json({success:true});
 } catch {return json({error:'De agenda is tijdelijk niet bereikbaar. Probeer het later opnieuw.'},503);}
};
export const config:Config={path:'/api/bookings'};
