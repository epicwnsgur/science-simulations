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
// Conservative areas inside the opaque silhouettes. Marker radii are defined by chargeRadius.
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
    { id:`p${i}`, sign:1, x:p.x-9, y:p.y },
    ...((kind === 'fur' && records.some(t=>t.donor===i)) ? [] : [{id:`n${i}`,sign:-1,x:p.x+9,y:p.y}])
  ]);
  if (kind === 'balloon') for (let i=0;i<records.length;i++) {
    const t=records[i];out.push({id:`extra${i}`,sign:-1,x:t.side*48,y:-57+t.slot*21});
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
  const donors=baseSites('fur').map((p,i)=>({id:i,x:p.x+9,y:p.y}))
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

export const chargeRadius = sign => sign > 0 ? 7 : 5.2;

// Bound-charge response, in visual units (not SI or a quantum electron trajectory).
// External Coulomb-force direction + local restoring force + damping.
// An insulating material keeps charges near their material sites; no free-charge gas.
export function stepBoundCharge(state, site, kind, origin, source, sourceCharge, dt, instant = false) {
  const next = state ? {...state} : {x:site.x,y:site.y,vx:0,vy:0};
  const stiffness = site.sign > 0 ? 520 : 85;
  const damping = 2 * Math.sqrt(stiffness) * .9;
  const limit = site.sign > 0 ? .7 : 3.4;
  const margin = chargeRadius(site.sign) + .6;
  const constrain = () => {
    let dx=next.x-site.x,dy=next.y-site.y;
    const length=Math.hypot(dx,dy);
    if(length>limit){dx*=limit/length;dy*=limit/length;next.vx=0;next.vy=0;}
    // The inset silhouette is convex and contains each original site.
    if(!insideBody(kind,{x:site.x+dx,y:site.y+dy},margin)) {
      let low=0,high=1;
      for(let i=0;i<18;i++){
        const mid=(low+high)/2;
        if(insideBody(kind,{x:site.x+dx*mid,y:site.y+dy*mid},margin))low=mid;else high=mid;
      }
      dx*=low;dy*=low;next.vx=0;next.vy=0;
    }
    next.x=site.x+dx;next.y=site.y+dy;
  };
  const force = () => {
    const dx=origin.x+next.x-source.x,dy=origin.y+next.y-source.y;
    // Softening represents a finite object rather than a singular point charge.
    const factor=site.sign*sourceCharge*2800000/Math.pow(dx*dx+dy*dy+4000,1.5);
    return {x:dx*factor,y:dy*factor};
  };
  if(instant){const f=force();next.x=site.x+f.x/stiffness;next.y=site.y+f.y/stiffness;next.vx=0;next.vy=0;constrain();return next;}
  const elapsed=Math.max(0,Math.min(.05,dt));
  const steps=Math.max(1,Math.ceil(elapsed/(1/240))),h=elapsed/steps;
  for(let i=0;i<steps;i++){
    const f=force();
    next.vx+=(f.x-stiffness*(next.x-site.x)-damping*next.vx)*h;
    next.vy+=(f.y-stiffness*(next.y-site.y)-damping*next.vy)*h;
    next.x+=next.vx*h;next.y+=next.vy*h;constrain();
  }
  return next;
}
