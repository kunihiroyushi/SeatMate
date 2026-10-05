(function(root){
'use strict';
const services=[
{id:'smart-ex',name:'スマートEX',url:'https://shinkansen2.jr-central.co.jp/RSV_P/S_smart_index.htm',entryHint:'公式ログイン画面を開きます。ログイン後に「列車を検索」へ進んでください。検索条件は自動入力されません。',test:/のぞみ|ひかり|こだま|みずほ|さくら|つばめ/},
{id:'eki-net',name:'えきねっと',url:'https://www.eki-net.com/Personal/Top/Index',entryHint:'乗車日・駅名を入力する検索フォームを開きます。検索条件は自動入力されません。',test:/はくたか|かがやき|あさま|とき|たにがわ|やまびこ|はやぶさ|こまち|つばさ|なすの|あずさ|かいじ|ひたち|ときわ|踊り子|しおさい|成田エクスプレス/},
{id:'e5489',name:'e5489',url:'https://e5489.jr-odekake.net/e5489/cssp/CBTopMenuSP',entryHint:'列車予約・空席照会の入口を開きます。「新規予約」から検索してください。ログインが必要な場合があります。',test:/サンダーバード|しらさぎ|くろしお|やくも|はるか|こうのとり|きのさき|はしだて|まいづる|しなの/},
{id:'jrkyushu',name:'JR九州ネット予約',url:'https://train.yoyaku.jrkyushu.co.jp/jr/pc/Top',entryHint:'列車予約の入口を開きます。必要に応じてログインして検索してください。メンテナンス中は時間をおいてお試しください。',test:/ソニック|にちりん|かもめ|ゆふ|きりしま|みどり|ハウステンボス/}
];
const stations=['東京','新橋','上野','大宮','高崎','長野','上越妙高','糸魚川','黒部宇奈月温泉','富山','新高岡','金沢','小松','加賀温泉','芦原温泉','福井','越前たけふ','敦賀','新大阪','京都','名古屋','新横浜','品川','博多','小倉','熊本','鹿児島中央','大阪','新神戸','岡山','広島','新山口','佐賀','長崎','大分','宮崎','仙台','盛岡','新青森','新函館北斗','秋田','山形','新潟','越後湯沢','軽井沢','佐久平','上田','飯山','松本','篠ノ井','塩尻','甲府','新宿','立川','八王子','中津川','木曽福島','多治見','岐阜羽島','米原','静岡','浜松','豊橋','熱海','三島','新富士','掛川','新尾道','福山','新倉敷','徳山','新下関','久留米','新鳥栖','武雄温泉','諫早','新大村','嬉野温泉'];
const norm=s=>String(s||'').normalize('NFKC').replace(/\r/g,'');
const mins=s=>/^([01]?\d|2[0-3]):[0-5]\d$/.test(s||'')?Number(s.split(':')[0])*60+Number(s.split(':')[1]):null;
function station(line){const hits=stations.filter(s=>line.includes(s)).sort((a,b)=>b.length-a.length);return hits[0]||line.match(/([一-龠々ヶぁ-んァ-ヶー]{2,12})駅/)?.[1]||null;}
function times(line){return [...line.matchAll(/(?<!\d)([01]?\d|2[0-3])[:.時]([0-5]\d)分?(?!\d)/g)].map(m=>m[1].padStart(2,'0')+':'+m[2]);}
function parseOCR(raw,year=new Date().getFullYear()){
 const text=norm(raw).replace(/(?<=[一-龠々ヶぁ-んァ-ヶー])[ \t]+(?=[一-龠々ヶぁ-んァ-ヶー])/g,''),compact=text.replace(/\s/g,''),fields={};
 const names=/((?:ゆふいんの森|成田エクスプレス|サンダーバード|はくたか|かがやき|あさま|たにがわ|やまびこ|はやぶさ|こまち|つばさ|なすの|のぞみ|ひかり|こだま|みずほ|さくら|つばめ|しらさぎ|くろしお|やくも|はるか|ソニック|にちりん|かもめ|みどり|ハウステンボス|しなの|あずさ|かいじ|ひたち|ときわ|踊り子|しおさい|きりしま|ゆふ|とき)\d*号?)/;
 const train=compact.match(names);if(train)fields.train=train[1];
 const car=compact.match(/(\d{1,2})号車/);if(car)fields.car=car[1];
 const seat=compact.match(/(\d{1,3})番?([A-E])(?:席)?/i);if(seat)fields.seat=seat[1]+seat[2].toUpperCase();
 let d=compact.match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})日?/);if(!d){const md=compact.match(/(\d{1,2})月(\d{1,2})日/);if(md)d=['',String(year),md[1],md[2]];}
 if(d){const iso=`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`;if(Number.isFinite(Date.parse(iso+'T00:00:00Z'))&&new Date(iso+'T00:00:00Z').toISOString().slice(0,10)===iso)fields.date=iso;}
 const lines=text.split('\n').map(l=>l.trim()).filter(Boolean),stops=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  const route=line.match(/(.+?)\s*(?:→|⇒|➡|->)\s*(.+)/);if(route&&!(times(route[1]).length&&times(route[2]).length&&!station(route[1])&&!station(route[2]))){fields.from=station(route[1])||route[1].replace(/駅$/,'').trim();fields.to=station(route[2])||route[2].replace(/駅$/,'').trim();continue;}
  if(/乗車駅|出発駅/.test(line))fields.from=station(line)||line.replace(/.*?(?:乗車駅|出発駅)\s*[:：]?\s*/,'').replace(/駅$/,'');
  if(/降車駅|到着駅/.test(line))fields.to=station(line)||line.replace(/.*?(?:降車駅|到着駅)\s*[:：]?\s*/,'').replace(/駅$/,'');
  const name=station(line)||line.match(/^([一-龠々ヶぁ-んァ-ヶー]{2,12})\s+(?:[01]?\d|2[0-3])[:.時]/)?.[1];if(!name)continue;
  let tt=times(line),context=line;
  if(!tt.length&&i+1<lines.length&&!station(lines[i+1])){tt=times(lines[i+1]);context+=' '+lines[i+1];}
  if(!tt.length)continue;
  const arr=tt.length>1?tt[0]:(/着/.test(context)&&!/発/.test(context)?tt[0]:null),dep=tt.length>1?tt[1]:(arr?null:tt[0]);
  const existing=stops.find(s=>s.name===name);if(existing){existing.arr ||= arr;existing.dep ||=dep;}else stops.push({name,arr,dep});
 }
 if(stops.length>=2){fields.from ||=stops[0].name;fields.to ||=stops.at(-1).name;}
 return {fields,stops};
}
function timeline(t){
 let day=0,previous=null;
 const base=Date.parse(t.date+'T00:00:00+09:00');
 if(!Number.isFinite(base))return [];
 return (t.stops||[]).map(s=>{const out={...s};for(const key of ['arr','dep']){let m=mins(s[key]);if(m===null){out[key+'At']=null;continue;}if(previous!==null&&m+day*1440<previous){day++;}previous=m+day*1440;out[key+'At']=base+previous*60000;}out.at=out.arrAt??out.depAt;return out;});
}
function state(t,now=Date.now()){
 const st=timeline(t).filter(s=>s.at!==null);if(!st.length)return {current:'時刻表を登録してください',next:null,minutes:null};
 const from=st.find(s=>s.name===t.from),to=st.find(s=>s.name===t.to);
 if(from&&now<(from.depAt??from.at))return {current:'乗車前',next:from,minutes:Math.ceil(((from.depAt??from.at)-now)/60000)};
 if(to&&now>=to.at)return {current:'降車駅に到着',next:null,minutes:null};
 for(let i=0;i<st.length;i++){const s=st[i];if(now<s.at)return {current:i?`${st[i-1].name} → ${s.name}`:'乗車前',next:s,minutes:Math.ceil((s.at-now)/60000)};if(s.depAt&&now<s.depAt)return {current:s.name+'に停車中',next:st[i+1]||null,minutes:st[i+1]?Math.ceil((st[i+1].at-now)/60000):null};}
 return {current:'到着済み',next:null,minutes:null};
}
// Compare the same neighbor, car, date, and destination across forward search origins.
function infer(t,history){
 const names=(t.stops||[]).map(s=>s.name),records=history.filter(h=>h.tripId===t.id&&(h.train===undefined||h.train===t.train)&&h.seat===t.neighbor&&(h.car===undefined||h.car===t.car)&&(h.date===undefined||h.date===t.date)).slice().sort((a,b)=>String(a.ts||'').localeCompare(String(b.ts||'')));
 let empty=null,result=null;
 for(const r of records){if(r.status==='不明'){empty=null;continue;}if(r.status==='空席'){empty=r;continue;}
 if(r.status==='使用不可'&&empty){const a=names.indexOf(empty.searchFrom||empty.station),b=names.indexOf(r.searchFrom||r.station);const same=(empty.searchTo||t.to)===(r.searchTo||t.to);if(a>=0&&b>a&&same){const candidates=names.slice(a+1,b+1);result={candidates,from:names[a],to:names[b],legacy:!empty.searchFrom||!r.searchFrom};}empty=null;}}
 return result;
}
function prediction(t,now=Date.now()){const s=timeline(t).find(s=>s.name===t.predictedStation);if(!s||s.at===null)return null;const delta=(s.at-now)/60000;const minutes=delta<0?Math.floor(delta):Math.ceil(delta);return {minutes,soon:minutes>=0&&minutes<=Number(t.notifyBefore)&&Number(t.notifyBefore)>0,at:s.at};}

function journeyProgress(t,now=Date.now()){
 const st=timeline(t).filter(s=>s.at!==null);if(!st.length)return {ratio:0,start:null,end:null};
 const from=st.find(s=>s.name===t.from)||st[0],to=st.find(s=>s.name===t.to)||st.at(-1);
 const start=from?.depAt??from?.at,end=to?.arrAt??to?.at;
 if(start==null||end==null||end<=start)return {ratio:0,start,end};
 return {ratio:Math.max(0,Math.min(1,(now-start)/(end-start))),start,end};
}
function trainKind(train=''){
 if(/はくたか|かがやき|あさま|とき|たにがわ|やまびこ|はやぶさ|こまち|つばさ|なすの|のぞみ|ひかり|こだま|みずほ|さくら|つばめ/.test(train))return 'shinkansen';
 if(/しなの|あずさ|かいじ|ひたち|ときわ|踊り子|しおさい|サンダーバード|しらさぎ|くろしお|やくも|はるか|こうのとり|きのさき|はしだて|まいづる|ソニック|にちりん|かもめ|ゆふ|みどり|ハウステンボス|成田エクスプレス/.test(train))return 'limited';
 return 'local';
}
function jstParts(ms){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
 return Object.fromEntries(parts.map(p=>[p.type,p.value]));
}
function googleCalendarUrl(t){
 if(!t?.predictedStation||Number(t.notifyBefore)<=0)return null;
 const s=timeline(t).find(x=>x.name===t.predictedStation);if(!s?.at)return null;
 const before=Number(t.notifyBefore),start=s.at-before*60000,end=start+5*60000;
 const stamp=ms=>{const p=jstParts(ms);return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;};
 const qs=new URLSearchParams({action:'TEMPLATE',text:`SeatMate｜${t.predictedStation}まで${before}分`,dates:`${stamp(start)}/${stamp(end)}`,ctz:'Asia/Tokyo',details:`${t.train} / 隣席 ${t.neighbor||'—'} が ${t.predictedStation} から使用される可能性。SeatMateの推定情報です。`,location:`${t.predictedStation}駅`});
 return {url:`https://calendar.google.com/calendar/render?${qs.toString()}`,start,stationAt:s.at,before};
}

function service(train){return services.find(s=>s.test.test(train))||null;}
const api={stations,services,parseOCR,timeline,state,infer,prediction,journeyProgress,trainKind,googleCalendarUrl,service,mins};if(typeof module!=='undefined')module.exports=api;root.SM=api;
})(typeof window!=='undefined'?window:globalThis);
