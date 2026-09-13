import { system, world, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { getPlayerTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const logger = createLogger("Minefield");
const ITEM_ID = "siedler:mine";
const STORAGE_KEY = "minefield:mines";
const SCAN_INTERVAL = 5;
const ARM_DELAY_TICKS = 20;
const REARM_TICKS = 20 * 15;
const DETONATION_DELAY_TICKS = 20;
const CHAIN_RADIUS = 3.25;
const EXPLOSION_RADIUS = 4;
const MAX_MINES = 2000;
const CONTROL_RADIUS = 8;
const GROUP_RADIUS_DEFAULT = 8;
const MONSTER_TRIGGER_RADIUS = 0.9;
const PLACEMENT_COOLDOWN_TICKS = 4;
const TRIGGER_MODE = Object.freeze({ HOSTILE: 0, HOSTILE_NEUTRAL: 1, EVERYONE: 2 });

let mines = [];
let loaded = false;
let saving = false;
const placementCooldown = new Map();

function distanceSquared(a,b){return (a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2;}
function createMineId(){return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;}
function cleanGroup(value){return typeof value === "string" && value.length ? value.slice(0,32) : null;}

function load(){
    if(loaded)return; loaded=true;
    try{
        const raw=world.getDynamicProperty(STORAGE_KEY); if(!raw)return;
        const parsed=JSON.parse(String(raw)); if(!Array.isArray(parsed))return;
        mines=parsed.filter(m=>m&&typeof m.x==="number"&&typeof m.y==="number"&&typeof m.z==="number"&&typeof m.dimension==="string").slice(0,MAX_MINES).map(m=>({
            id:typeof m.id==="string"?m.id:createMineId(),x:Math.floor(m.x)+.5,y:Math.floor(m.y)+.05,z:Math.floor(m.z)+.5,dimension:m.dimension,
            ownerId:typeof m.ownerId==="string"?m.ownerId:null,ownerTeam:typeof m.ownerTeam==="string"?m.ownerTeam:null,group:cleanGroup(m.group),
            triggerMode:Number.isInteger(m.triggerMode)&&m.triggerMode>=0&&m.triggerMode<=2?m.triggerMode:0,armed:m.armed!==false,armAt:Number(m.armAt)||0,rearmAt:Number(m.rearmAt)||0,detonating:false
        }));
        logger.info(`Loaded ${mines.length} persistent mines.`);
    }catch(error){logger.error("Failed to load persistent mines",error);mines=[];}
}
function save(){
    if(saving)return; saving=true;
    try{world.setDynamicProperty(STORAGE_KEY,JSON.stringify(mines.map(({detonating,...m})=>m)));}
    catch(error){logger.error("Failed to save mines",error);}finally{saving=false;}
}

function isEmptyBlock(block){
    if(!block)return false;
    try{if(block.isAir)return true;}catch{}
    return block.typeId==="minecraft:air"||block.typeId==="minecraft:cave_air"||block.typeId==="minecraft:void_air";
}
function isLiquidBlock(block){
    if(!block)return true;
    try{if(block.isLiquid)return true;}catch{}
    return block.typeId==="minecraft:water"||block.typeId==="minecraft:flowing_water"||block.typeId==="minecraft:lava"||block.typeId==="minecraft:flowing_lava";
}
function getPlacementTarget(block,face){
    if(!block)return null;
    const faceName=face===undefined||face===null?"up":String(face).toLowerCase();
    if(face!==undefined&&face!==null&&faceName!=="up"&&faceName!=="direction.up"&&faceName!=="blockface.up"&&faceName!=="1")return null;
    try{return block.dimension.getBlock({x:block.location.x,y:block.location.y+1,z:block.location.z})??null;}catch{return null;}
}
function canPlaceAt(player,base,target){
    if(!base||!target)return "§c[Mine] Zielposition konnte nicht ermittelt werden.";
    if(isLiquidBlock(base)||isLiquidBlock(target))return "§c[Mine] Auf Flüssigkeiten kann keine Mine platziert werden.";
    if(!isEmptyBlock(target))return "§c[Mine] Über diesem Block ist kein freier Platz für die Mine.";
    const l={x:base.location.x+.5,y:base.location.y+1.05,z:base.location.z+.5};
    if(distanceSquared(l,player.location)<.35*.35)return "§c[Mine] Du stehst zu nah an der Zielposition.";
    if(hasMineAt(l,player.dimension.id))return "§e[Mine] Hier liegt bereits eine Mine.";
    if(mines.length>=MAX_MINES)return `§c[Mine] Das Limit von ${MAX_MINES} Minen ist erreicht.`;
    return null;
}
function consumeMine(p){try{const c=p.getComponent("minecraft:inventory")?.container,s=c?.getItem(p.selectedSlotIndex);if(!s||s.typeId!==ITEM_ID)return false;if(s.amount<=1)c.setItem(p.selectedSlotIndex,undefined);else{s.amount--;c.setItem(p.selectedSlotIndex,s);}return true;}catch(error){logger.warn("Could not consume mine item",error);return false;}}
function hasMineAt(l,d){return mines.some(m=>!m.detonating&&m.dimension===d&&distanceSquared(m,l)<.8*.8);}
function placeMine(p,base,face){
    if(!p?.isValid||!base)return;
    const now=system.currentTick;
    const last=placementCooldown.get(p.id);
    if(last!==undefined&&now-last<PLACEMENT_COOLDOWN_TICKS)return;
    placementCooldown.set(p.id,now);
    const target=getPlacementTarget(base,face);
    const error=canPlaceAt(p,base,target);
    if(error){p.sendMessage(error);try{p.playSound("note.bass",{volume:.45,pitch:.7});}catch{}return;}
    if(!consumeMine(p)){p.sendMessage("§c[Mine] Die Minenladung befindet sich nicht mehr im ausgewählten Slot.");return;}
    const l={x:Math.floor(base.location.x),y:Math.floor(base.location.y)+1,z:Math.floor(base.location.z)};
    const team=getPlayerTeam(p);
    mines.push({id:createMineId(),x:l.x+.5,y:l.y+.05,z:l.z+.5,dimension:p.dimension.id,ownerId:p.id??null,ownerTeam:team,group:null,triggerMode:0,armed:false,armAt:system.currentTick+ARM_DELAY_TICKS,rearmAt:0,detonating:false});
    save();
    try{p.playSound("random.click",{volume:.9,pitch:.8});}catch{}
    p.sendMessage(`§a[Mine] Mine platziert bei §f${l.x} ${l.y} ${l.z}§a${team?` für Team §f${team}`:""}. §7Sie wird in 1 Sekunde scharf.`);
}
function canManage(p,m){if(!p?.isValid||!m)return false;if(p.commandPermissionLevel>=CommandPermissionLevel.GameDirectors)return true;return !!m.ownerTeam&&getPlayerTeam(p)===m.ownerTeam;}
function canTrigger(p,m){if(!m||!p)return false;if(!m.ownerTeam)return true;const t=getPlayerTeam(p);if(t&&t===m.ownerTeam)return false;if(!t)return true;const r=getTeamRelation(m.ownerTeam,t);if(r===TEAM_RELATION.FRIENDLY)return false;if(m.triggerMode===2)return true;if(m.triggerMode===1)return r===TEAM_RELATION.HOSTILE||r===TEAM_RELATION.NEUTRAL;return r===TEAM_RELATION.HOSTILE;}
function isMonster(entity){if(!entity?.isValid)return false;if(entity.typeId==="siedler:monster")return true;try{return entity.getComponent("minecraft:type_family")?.hasTypeFamily("monster")===true;}catch{return false;}}
function warning(m){try{const d=world.getDimension(m.dimension);d.spawnParticle("minecraft:basic_smoke_particle",m);for(const p of d.getPlayers({location:m,maxDistance:6})){p.playSound("note.pling",{volume:.9,pitch:1.8});p.sendMessage("§c⚠ MINE! §7Explosion in §e1 Sekunde§7!");}}catch(error){logger.warn("Mine warning failed",error);}}
function schedule(i,fromGroup=false){const m=mines[i];if(!m||m.detonating||!m.armed)return;m.detonating=true;m.armed=false;warning(m);const id=m.id;save();system.runTimeout(()=>detonateById(id),DETONATION_DELAY_TICKS);if(!fromGroup&&m.group){for(let j=0;j<mines.length;j++){const o=mines[j];if(j!==i&&o?.armed&&!o.detonating&&o.group===m.group&&o.dimension===m.dimension&&o.ownerTeam===m.ownerTeam)schedule(j,true);}}}
function detonateById(id){const i=mines.findIndex(m=>m.id===id);if(i>=0)detonate(i);}
function detonate(i){const m=mines[i];if(!m)return;try{const d=world.getDimension(m.dimension),near=[];for(let j=0;j<mines.length;j++){const o=mines[j];if(j!==i&&o&&!o.detonating&&o.armed&&o.dimension===m.dimension&&distanceSquared(o,m)<=CHAIN_RADIUS**2)near.push(j);}d.createExplosion(m,EXPLOSION_RADIUS,{breaksBlocks:false,causesFire:true});m.detonating=false;m.armed=false;m.rearmAt=system.currentTick+REARM_TICKS;for(const j of near)schedule(j);save();}catch(error){logger.error("Mine detonation failed",error);m.detonating=false;m.armed=false;m.rearmAt=system.currentTick+REARM_TICKS;save();}}
function controlled(p,r=CONTROL_RADIUS){return mines.map((mine,index)=>({mine,index})).filter(e=>e.mine.dimension===p.dimension.id&&distanceSquared(e.mine,p.location)<=r*r&&canManage(p,e.mine)).sort((a,b)=>distanceSquared(a.mine,p.location)-distanceSquared(b.mine,p.location));}
function groupEntries(p,g){return mines.map((mine,index)=>({mine,index})).filter(e=>e.mine.group===g&&e.mine.dimension===p.dimension.id&&canManage(p,e.mine));}
function modeText(m){return m===2?"§cAlle Spieler":m===1?"§eFeinde + Neutral":"§cNur Feinde";}
function list(p){const l=controlled(p,64);if(!l.length)return p.sendMessage("§7[Mine] Keine eigenen/Team-Minen in 64 Blöcken gefunden.");p.sendMessage(`§6--- Deine Team-Minen (${l.length}) ---`);for(const e of l.slice(0,30))p.sendMessage(`§7${e.mine.id} §8→ §f${e.mine.x.toFixed(0)}, ${e.mine.y.toFixed(0)}, ${e.mine.z.toFixed(0)} §7| ${modeText(e.mine.triggerMode)}${e.mine.group?` §8| ${e.mine.group}`:""}`);}
function nearest(p,a){const e=controlled(p)[0];if(!e)return p.sendMessage("§c[Mine] Keine kontrollierbare Mine in 8 Blöcken.");const m=e.mine;if(a==="remove")mines.splice(e.index,1);else if(a==="arm"){m.armed=true;m.armAt=0;m.rearmAt=0;m.detonating=false;}else{m.armed=false;m.armAt=0;m.rearmAt=0;m.detonating=false;}save();p.sendMessage(`§a[Mine] ${m.id}: ${a}.`);}
function clear(p){const n=mines.length;mines=mines.filter(m=>!(m.dimension===p.dimension.id&&canManage(p,m)));save();p.sendMessage(`§a[Mine] ${n-mines.length} Mine(n) entfernt.`);}
function createGroup(p,g,r){g=cleanGroup(g);const radius=Math.max(1,Math.min(64,Number(r)||GROUP_RADIUS_DEFAULT)),e=controlled(p,radius).filter(x=>!x.mine.detonating);if(!g)return p.sendMessage("§c[Mine] Gruppenname fehlt.");if(!e.length)return p.sendMessage("§c[Mine] Keine kontrollierbaren Minen im Radius.");for(const x of e)x.mine.group=g;save();p.sendMessage(`§a[Mine] Gruppe §f${g}§a: ${e.length} Mine(n).`);}
function groupList(p){const map=new Map();for(const e of controlled(p,128)){if(e.mine.group)map.set(e.mine.group,(map.get(e.mine.group)||0)+1);}if(!map.size)return p.sendMessage("§7[Mine] Keine Minengruppen vorhanden.");p.sendMessage("§6--- Minengruppen ---");for(const [g,n] of map)p.sendMessage(`§f${g} §7→ §e${n}§7 Mine(n)`);}
function groupAction(p,g,a){g=cleanGroup(g);const e=groupEntries(p,g);if(!e.length)return p.sendMessage(`§c[Mine] Gruppe §f${g}§c nicht gefunden.`);if(a==="remove")mines=mines.filter(m=>!(m.group===g&&m.dimension===p.dimension.id&&canManage(p,m)));else for(const x of e){x.mine.armed=a==="arm";x.mine.armAt=0;x.mine.rearmAt=0;x.mine.detonating=false;}save();p.sendMessage(`§a[Mine] ${a} für §f${g}§a auf ${e.length} Mine(n).`);}
function groupMode(p,g,m){const e=groupEntries(p,cleanGroup(g));if(!e.length)return p.sendMessage(`§c[Mine] Gruppe §f${g}§c nicht gefunden.`);for(const x of e)x.mine.triggerMode=m;save();p.sendMessage(`§a[Mine] Modus ${m} für ${e.length} Mine(n) gesetzt.`);}
function groupDetonate(p,g){const e=groupEntries(p,cleanGroup(g)).filter(x=>x.mine.armed&&!x.mine.detonating);if(!e.length)return p.sendMessage(`§c[Mine] Keine scharfen Minen in §f${g}§c.`);for(const x of e)schedule(x.index,true);p.sendMessage(`§c[Mine] Gruppe §f${g}§c zündet gleichzeitig: §e${e.length}§c Mine(n).`);}
function registerCommands(r){
    const playerOnly=o=>o?.sourceEntity?.typeId==="minecraft:player"?o.sourceEntity:null;
    const reg=(name,description,parameters,handler)=>r.registerCommand({name,description,permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false,...(parameters.length?{mandatoryParameters:parameters}:{})},(origin,...args)=>{const p=playerOnly(origin);if(!p)return{status:CustomCommandStatus.Failure};system.run(()=>handler(p,...args));return{status:CustomCommandStatus.Success};});
    reg("siedler:mine_list","Listet kontrollierbare Minen auf.",[],list);reg("siedler:mine_status","Zeigt den Minenstatus.",[],p=>p.sendMessage(`§6[Mine] Gesamt §e${mines.length}/${MAX_MINES}§7 | Kontrollierbar §e${controlled(p,128).length}`));
    reg("siedler:mine_arm","Schaltet die nächste Mine scharf.",[],p=>nearest(p,"arm"));reg("siedler:mine_disarm","Entschärft die nächste Mine.",[],p=>nearest(p,"disarm"));reg("siedler:mine_remove","Entfernt die nächste Mine.",[],p=>nearest(p,"remove"));reg("siedler:mine_clear","Entfernt Team-Minen.",[],clear);
    reg("siedler:mine_mode","Setzt den Auslösemodus.",[{type:CustomCommandParamType.Integer,name:"modus"}],(p,m)=>{m=Number(m);if(![0,1,2].includes(m))return p.sendMessage("§c[Mine] 0=Feinde, 1=Feinde+Neutral, 2=Alle.");const e=controlled(p)[0];if(!e)return p.sendMessage("§c[Mine] Keine kontrollierbare Mine.");e.mine.triggerMode=m;save();});
    reg("siedler:mine_group_create","Erstellt eine Minengruppe aus Minen im Radius.",[{type:CustomCommandParamType.String,name:"gruppe"},{type:CustomCommandParamType.Integer,name:"radius"}],createGroup);
    reg("siedler:mine_group_list","Listet Minengruppen.",[],groupList);
    reg("siedler:mine_group_arm","Schaltet eine Gruppe scharf.",[{type:CustomCommandParamType.String,name:"gruppe"}],(p,g)=>groupAction(p,g,"arm"));
    reg("siedler:mine_group_disarm","Entschärft eine Gruppe.",[{type:CustomCommandParamType.String,name:"gruppe"}],(p,g)=>groupAction(p,g,"disarm"));
    reg("siedler:mine_group_remove","Entfernt eine Gruppe.",[{type:CustomCommandParamType.String,name:"gruppe"}],(p,g)=>groupAction(p,g,"remove"));
    reg("siedler:mine_group_mode","Setzt den Modus einer Gruppe.",[{type:CustomCommandParamType.String,name:"gruppe"},{type:CustomCommandParamType.Integer,name:"modus"}],(p,g,m)=>{m=Number(m);if(![0,1,2].includes(m))return p.sendMessage("§c[Mine] 0=Feinde, 1=Feinde+Neutral, 2=Alle.");groupMode(p,g,m);});
    reg("siedler:mine_group_detonate","Zündet alle scharfen Gruppenminen gleichzeitig.",[{type:CustomCommandParamType.String,name:"gruppe"}],groupDetonate);
}
function scan(){
    const now=system.currentTick;let changed=false;
    for(const m of mines){
        if(!m.armed&&!m.detonating&&m.armAt>0&&now>=m.armAt&&m.rearmAt===0){m.armed=true;m.armAt=0;changed=true;}
        if(!m.armed&&!m.detonating&&m.rearmAt>0&&now>=m.rearmAt){m.armed=true;m.rearmAt=0;changed=true;}
    }
    for(const p of world.getAllPlayers()){
        if(!p?.isValid)continue;
        for(let i=0;i<mines.length;i++){
            const m=mines[i];
            if(!m?.armed||m.detonating||m.dimension!==p.dimension.id)continue;
            if(distanceSquared(m,p.location)<=.75*.75&&canTrigger(p,m))schedule(i);
        }
    }
    for(const m of mines){
        if(!m?.armed||m.detonating)continue;
        try{
            const d=world.getDimension(m.dimension);
            const monsters=d.getEntities({location:m,maxDistance:MONSTER_TRIGGER_RADIUS,families:["monster"]});
            if(monsters.some(isMonster)){const i=mines.indexOf(m);if(i>=0)schedule(i);continue;}
            const custom=d.getEntities({location:m,maxDistance:MONSTER_TRIGGER_RADIUS,type:"siedler:monster"});
            if(custom.some(isMonster)){const i=mines.indexOf(m);if(i>=0)schedule(i);}
        }catch(error){logger.debug(`Monster scan skipped for mine ${m.id}: ${error?.message??error}`);}
    }
    if(changed)save();
}

try{
    world.afterEvents.itemStartUseOn.subscribe(e=>{
        const p=e.source;
        if(p?.typeId!=="minecraft:player"||e.itemStack?.typeId!==ITEM_ID)return;
        placeMine(p,e.block,e.blockFace);
    });
    world.afterEvents.playerInteractWithBlock.subscribe(e=>{
        const p=e.player;
        if(p?.typeId!=="minecraft:player"||e.itemStack?.typeId!==ITEM_ID)return;
        placeMine(p,e.block,e.blockFace);
    });
    system.beforeEvents.startup.subscribe(e=>registerCommands(e.customCommandRegistry));
}catch(error){logger.error("Could not initialize minefield events",error);}

system.runTimeout(load,1);
system.runInterval(scan,SCAN_INTERVAL);
logger.success("Minefield loaded: solid-block placement, teams, diplomacy, persistent groups and synchronized detonation.");
