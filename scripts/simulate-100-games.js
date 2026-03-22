// Space Tycoon: 100-Playthrough Comprehensive Simulation
const GAMES=100, MONTHS=4320, PPG=25;
const STRATS=['mining_empire','tech_leader','colony_rusher','trader','service_mogul','risk_taker','alliance_builder','late_joiner'];
// Costs match actual game: Ground Station $30M, LEO Sat $15M, Launch $50M etc.
const SV={t1:{o:[1.1,2.5,2.1,1.7,2.2,3.3,2.0,6.2],c:25e6},t2:{o:[9.5,4.7,6,8,4,3,5.5,13,7,11],c:200e6},t3:{o:[32,14,30,40,30,45,35,50],c:5e9},t4:{o:[55,80,50,70,30,55],c:60e9},t5:{o:[105,90,70,170],c:200e9},t6:{o:[350],c:700e9}};
function econ(m){let c=m%222;for(const[d,r]of[[36,1.3],[54,1.15],[72,1],[36,.85],[24,.7]]){if(c<d)return r;c-=d;}return 1;}
function scar(t){return t>=5e6?.05:t>=1e6?.2:t>=2e5?.4:t>=5e4?.65:t>=1e4?.85:1;}
function ovhd(b,s,c,sh){return Math.round((b*5e5+s*1e6+c*5e6+sh*2e5)*Math.pow(1.02,Math.max(0,b-10)));}
let R={comp:0,blow:0,ljT:0,ljN:0,aw:0,al:0,sw:{},acol:0,ares:0,dis:0,rA:0,rS:0,mv:0,npc:0,vp:{e:0,t:0,r:0,i:0,b:0}};
for(const s of STRATS)R.sw[s]=0;
for(let g=0;g<GAMES;g++){
let ps=[],gm={iron:0};
for(let p=0;p<PPG;p++){let s=STRATS[p%8],lj=s==='late_joiner',jm=lj?90+~~(Math.random()*180):0;
let ljBoost=0,ljSv=0,ljBl=0;
if(lj){let months=jm/30;if(months>=3){ljBoost=10e6;ljSv=2;ljBl=2;}if(months>=6){ljBoost+=8e6;ljSv+=1;ljBl+=1;}}
ps.push({s,jm,m:100e6+(lj?Math.min(1.5e9,jm/30*40e6):0),te:0,ts:0,mg:ljBoost*.7,me:ljBoost*.3,sv:ljSv,bl:ljBl,rs:0,co:0,lo:2,sh:3,rep:0,rc:0,rw:0,rl:0,dl:0});}
for(let mo=0;mo<MONTHS;mo++){
let em=econ(mo);
gm.iron+=250*scar(gm.iron);R.npc+=250;
for(const p of ps){if(mo<p.jm)continue;let a=mo-p.jm;
let nm=a<20?2:a<45?1.5:a<90?1.2:1;
// Revenue = gross revenue × economic cycle × newcomer multiplier
// Expenses = operating costs + maintenance overhead (scales with empire size)
// No insurance drain in simulation — actual game handles it per-tick
let gr=p.mg*em*nm;
let ex=p.me; // Operating costs only (overhead handled separately)
// Empire overhead: modest scaling (prevents infinite growth but doesn't kill early game)
let oh=p.bl>10?(p.bl-10)*100000:0; // $100K per building over 10
let net=gr-ex-oh;
p.m+=net;if(net>0)p.te+=net;
if(p.m<-50e6)p.m=-50e6;
if(p.bl>=5&&Math.random()<.012){let l=Math.min(p.m*.04,300e6);p.m-=l;p.dl+=l;R.dis++;}
if(a>0&&a%30===0){let bb=Math.max(0,p.m)*(p.s==='risk_taker'?.8:.5);
if(p.sv<6&&bb>SV.t1.c){let n=Math.min(3,~~(bb/SV.t1.c));for(let i=0;i<n&&p.sv<6;i++){let v=SV.t1.o[p.sv%8]*1e6;p.mg+=v*.7;p.me+=v*.3;p.sv++;p.bl++;p.m-=SV.t1.c;p.ts+=SV.t1.c;}}
if(p.sv>=4&&p.sv<10&&bb>SV.t2.c){let v=SV.t2.o[p.sv%10]*1e6;p.mg+=v*.65;p.me+=v*.35;p.sv++;p.bl+=2;p.m-=SV.t2.c;p.ts+=SV.t2.c;}
if((p.s==='tech_leader'||a%60===0)&&p.m>100e6*Math.pow(2.5,~~(p.rs/4))*2){let c=100e6*Math.pow(2.5,~~(p.rs/4));p.m-=c;p.ts+=c;p.rs++;p.rep+=3;}
if(p.s==='tech_leader'&&p.rs>5){p.mg*=1.001;} // Research compounds: each tech slightly boosts all revenue
if(p.s==='mining_empire'){let sc=scar(gm.iron);p.mg*=1+.002*sc;gm.iron+=~~(80*sc);p.m+=30000*~~(80*sc);}
if(p.sv>=5&&p.m>SV.t3.c&&p.co<3){let v=SV.t3.o[p.co%8]*1e6;p.mg+=v*.6;p.me+=v*.4;p.co++;p.sv+=2;p.bl+=3;p.lo++;p.m-=SV.t3.c;p.ts+=SV.t3.c;p.rep+=50;}
if(p.co>=2&&p.m>SV.t4.c&&p.co<6){let v=SV.t4.o[(p.co-2)%6]*1e6;p.mg+=v*.55;p.me+=v*.45;p.co++;p.sv+=2;p.bl+=3;p.lo+=2;p.m-=SV.t4.c;p.ts+=SV.t4.c;p.rep+=100;}
if(p.co>=4&&p.m>SV.t5.c&&p.co<9){let v=SV.t5.o[(p.co-4)%4]*1e6;p.mg+=v*.5;p.me+=v*.5;p.co++;p.sv+=2;p.lo+=2;p.m-=SV.t5.c;p.ts+=SV.t5.c;p.rep+=200;}
if(p.co>=7&&p.m>SV.t6.c&&p.co<12){let v=SV.t6.o[0]*1e6;p.mg+=v*.5;p.me+=v*.5;p.co++;p.sv+=2;p.m-=SV.t6.c;p.ts+=SV.t6.c;p.rep+=500;}
if(p.s==='risk_taker'&&p.rc<=0&&p.m>200e6){let c=p.m*.2;R.rA++;if(Math.random()<.48){p.m+=c*4;p.rw++;R.rS++;p.rep+=20;}else{p.m-=c;p.rl++;p.rep-=10;}p.rc=4;} // Higher stakes, faster cooldown
if(p.rc>0)p.rc--;
if(p.s==='colony_rusher'&&p.sv>=6&&p.m>8e9&&p.co<5){p.co++;p.sv++;p.bl+=2;p.lo++;p.mg+=18e6;p.me+=12e6;p.m-=8e9;p.rep+=50;}
if(p.s==='trader'&&a%30===0){let tp=p.m*.008*em;p.m+=tp;p.te+=Math.max(0,tp);R.mv+=Math.abs(tp);}
if(p.s==='alliance_builder'&&a>=60){p.mg*=1.001;p.rep+=15;}
// Service mogul: builds extra services but at higher cost (premium for rapid expansion)
if(p.s==='service_mogul'&&p.sv>=6&&p.sv<15&&bb>SV.t2.c*1.2){let v=SV.t2.o[p.sv%10]*1e6;p.mg+=v*.6;p.me+=v*.4;p.sv++;p.bl+=2;p.m-=SV.t2.c*1.2;p.ts+=SV.t2.c*1.2;}
}}}
let ap=ps.filter(p=>p.te>0).sort((a,b)=>b.te-a.te);
if(ap.length>=2){let rat=ap[0].te/Math.max(1,ap[ap.length-1].te);
if(rat<50)R.comp++;if(rat>500)R.blow++;
R.aw+=ap[0].te;R.al+=ap[ap.length-1].te;R.sw[ap[0].s]++;
let mid=~~(ap.length/2);
for(const p of ap){if(p.s==='late_joiner'){R.ljN++;if(ap.indexOf(p)<mid)R.ljT++;}R.acol+=p.co;R.ares+=p.rs;}
if(ap[0].te>10e12)R.vp.e++;if(ap[0].rs>30)R.vp.t++;if(ap[0].co>8)R.vp.r++;
if(ap[0].bl>40&&ap[0].sv>20)R.vp.i++;if(ap[0].rs>15&&ap[0].co>4)R.vp.b++;
}}
R.aw=Math.round(R.aw/GAMES);R.al=Math.round(R.al/GAMES);
let tp=GAMES*PPG;
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  100-PLAYTHROUGH SIMULATION (25 players × 12 months)     ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log('');
console.log('─── COMPETITIVE BALANCE ───');
console.log('Competitive (ratio<50x): '+R.comp+'/100');
console.log('Blowouts (ratio>500x):   '+R.blow+'/100');
console.log('Winner avg: $'+(R.aw/1e9).toFixed(1)+'B | Last: $'+(R.al/1e9).toFixed(1)+'B | Ratio: '+(R.aw/Math.max(1,R.al)).toFixed(1)+'x');
console.log('');
console.log('─── STRATEGY WINS (multiple paths?) ───');
for(const[s,w]of Object.entries(R.sw)){console.log('  '+s.padEnd(18)+': '+w+' wins '+'█'.repeat(Math.round(w/GAMES*40)));}
console.log('');
console.log('─── VICTORY PROFILES ───');
console.log('Economic dom: '+R.vp.e+' | Tech lead: '+R.vp.t+' | Territory: '+R.vp.r+' | Industrial: '+R.vp.i+' | Balanced: '+R.vp.b);
console.log('');
console.log('─── LATE JOINERS ───');
console.log('In top half: '+R.ljT+'/'+R.ljN+' ('+(R.ljN>0?Math.round(R.ljT/R.ljN*100):0)+'%)');
console.log('');
console.log('─── ECONOMIC REALISM ───');
console.log('Disasters: '+R.dis+' total ('+((R.dis/GAMES).toFixed(1))+'/game)');
console.log('Risk attempts: '+R.rA+' | Success: '+(R.rA>0?Math.round(R.rS/R.rA*100):0)+'%');
console.log('Market volume: $'+(R.mv/1e9).toFixed(0)+'B');
console.log('');
console.log('─── PROGRESSION ───');
console.log('Avg colonies: '+(R.acol/tp).toFixed(1)+' | Avg research: '+(R.ares/tp).toFixed(1));
console.log('');
console.log('─── NPC MARKET ROLE ───');
console.log('NPC iron supplied: '+R.npc.toLocaleString()+' units (market supplement only)');
console.log('');
let ok=R.comp>=80&&R.blow<10&&(R.ljN>0?R.ljT/R.ljN>.2:true);
let wins=Object.values(R.sw);let diverse=wins.filter(w=>w>0).length>=5;
console.log('─── VERDICT ───');
if(ok&&diverse)console.log('✅ BALANCED — competitive, diverse paths, late joiners viable, NPCs supplement');
else{console.log('⚠️  Issues:');
if(R.comp<80)console.log('  - Not enough competitive games');
if(R.blow>10)console.log('  - Too many blowouts');
if(R.ljN>0&&R.ljT/R.ljN<.2)console.log('  - Late joiners too weak');
if(!diverse)console.log('  - Not enough strategy diversity ('+wins.filter(w=>w>0).length+'/8 strategies win)');}
