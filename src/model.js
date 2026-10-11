export const BASE = 8;
export const LIMIT = 4;
export function charges(transferred) {
  const n = Math.max(0, Math.min(LIMIT, Math.trunc(transferred)));
  return { fur: { plus: BASE, minus: BASE - n }, balloon: { plus: BASE, minus: BASE + n } };
}
export function interaction(a, b) {
  if (!a || !b) return 'unmodeled';
  return a * b > 0 ? 'repel' : 'attract';
}
// Conservative areas inside the opaque silhouettes. Markers have radius 6.
export function insideBody(kind, p, margin = 0) {
  if (kind === 'fur') return Math.abs(p.x) <= 98 - margin && Math.abs(p.y) <= 60 - margin;
  return (p.x / (64 - margin)) ** 2 + ((p.y + 28) / (78 - margin)) ** 2 <= 1;
}
export function baseSites(kind) {
  return Array.from({ length: 8 }, (_, i) => kind === 'fur'
    ? { x: -63 + (i % 4) * 42, y: -23 + Math.floor(i / 4) * 45 }
    : { x: -22 + (i % 2) * 44, y: -65 + Math.floor(i / 2) * 27 });
}
export function chargeLayout(kind, transfers = [], prepared = false) {
  const records = prepared ? [0,1,2].map(i=>({ donor: [3,7,2][i], side: -1, slot:i })) : transfers;
  const out = baseSites(kind).flatMap((p,i) => [
    { id:`p${i}`, sign:1, x:p.x-7, y:p.y },
    ...((kind === 'fur' && records.some(t=>t.donor===i)) ? [] : [{id:`n${i}`,sign:-1,x:p.x+7,y:p.y}])
  ]);
  if (kind === 'balloon') for (let i=0;i<records.length;i++) {
    const t=records[i];out.push({id:`extra${i}`,sign:-1,x:t.side*43,y:-57+t.slot*21});
  }
  return out;
}
// Find a shared interior contact point; electrons never fly across empty space.
export function contactPoint(balloon, fur) {
  const middle={x:(balloon.x+fur.x)/2,y:(balloon.y-28+fur.y)/2};
  let best=null, score=Infinity;
  for(let x=-90;x<=90;x+=6) for(let y=-48;y<=48;y+=6) {
    const world={x:fur.x+x,y:fur.y+y};
    if(!insideBody('balloon',{x:world.x-balloon.x,y:world.y-balloon.y},8)) continue;
    const d=Math.hypot(world.x-middle.x,world.y-middle.y);
    if(d<score){best=world;score=d;}
  }
  return best;
}
export function rubbingDistance(a,b,distance) { return contactPoint(a,b) ? distance : 0; }
export function nextTransfer(balloon,fur,records) {
  const contact=contactPoint(balloon,fur);
  if(!contact || records.length>=LIMIT) return null;
  const donors=baseSites('fur').map((p,i)=>({id:i,x:p.x+7,y:p.y}))
    .filter(p=>!records.some(t=>t.donor===p.id))
    .sort((a,b)=>Math.hypot(fur.x+a.x-contact.x,fur.y+a.y-contact.y)-Math.hypot(fur.x+b.x-contact.x,fur.y+b.y-contact.y));
  const side=contact.x<balloon.x?-1:1;
  const slot=records.filter(t=>t.side===side).length;
  return {donor:donors[0].id,side,slot,contact};
}
// A qualitative response of the fiber tips, NOT translation of the fur backing.
export function attractionOffset(balloon, fur, transferred) {
  const dx=balloon.x-fur.x,dy=balloon.y-fur.y,d=Math.hypot(dx,dy);
  if(!transferred || dy>=-30 || d>=260 || d<1)return {x:0,y:0};
  const gain=Math.min(1,(260-d)/90)*Math.min(1,(-dy-30)/55);
  return {x:dx/d*18*gain,y:dy/d*18*gain};
}
export const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
// Damped approach to rest: zero initial speed, continuous acceleration/deceleration.
export const settle = t => t>=1 ? 1 : (1-(1+8*t)*Math.exp(-8*t))/(1-9*Math.exp(-8));
