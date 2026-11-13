// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Real Lucide SVG paths bundled locally (no runtime CDN). See LUCIDE_LICENSE.md.
import {ICON_PATHS_1} from './lucide-paths-1.js';
import {ICON_PATHS_2} from './lucide-paths-2.js';
import {ICON_PATHS_3} from './lucide-paths-3.js';
import {ICON_PATHS_4} from './lucide-paths-4.js';
import {ICON_PATHS_5} from './lucide-paths-5.js';
import {ICON_PATHS_6} from './lucide-paths-6.js';
import {ICON_PATHS_7} from './lucide-paths-7.js';
import {ICON_PATHS_8} from './lucide-paths-8.js';
import {ICON_PATHS_9} from './lucide-paths-9.js';
import {ICON_PATHS_10} from './lucide-paths-10.js';
import {ICON_PATHS_11} from './lucide-paths-11.js';
import {ICON_PATHS_12} from './lucide-paths-12.js';
import {ICON_PATHS_13} from './lucide-paths-13.js';

export const ICON_PATHS=Object.freeze({
  ...ICON_PATHS_1,...ICON_PATHS_2,...ICON_PATHS_3,...ICON_PATHS_4,
  ...ICON_PATHS_5,...ICON_PATHS_6,...ICON_PATHS_7,...ICON_PATHS_8,
  ...ICON_PATHS_9,...ICON_PATHS_10,...ICON_PATHS_11,...ICON_PATHS_12,...ICON_PATHS_13
});
export const AVAILABLE_ICONS=Object.freeze(Object.keys(ICON_PATHS));
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const aliases=Object.freeze({'trash-2':'trash','circle-help':'circle-question-mark','shield-alert':'shield-ban'});
export function icon(name,{size=18,className='',label=''}={}){
  const preferred=aliases[name]||name;
  const key=Object.hasOwn(ICON_PATHS,preferred)?preferred:'circle-question-mark';
  const px=Number.isFinite(Number(size))?Math.min(64,Math.max(12,Math.round(Number(size)))):18;
  const title=label?'<title>'+escapeHtml(label)+'</title>':'';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+px+'" height="'+px+
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon '+escapeHtml(className)+
    '" role="'+(label?'img':'presentation')+'" '+(label?'aria-label="'+escapeHtml(label)+'"':'aria-hidden="true"')+
    ' focusable="false">'+title+ICON_PATHS[key]+'</svg>';
}
export const NAV_ICON_NAMES=Object.freeze({
  '/':'house','/tickets/new':'ticket-plus','/tickets/new/ban_appeal':'scale',
  '/tickets/mine':'tickets','/dashboard':'clipboard-list','/apply':'file-pen-line',
  '/team-applications/apply':'file-pen-line','/team-applications/review':'clipboard-list',
  '/promotions':'award','/feed':'newspaper','/suggestions':'lightbulb',
  '/members':'users-round','/team':'shield-check','/mega-team':'wallet','/profile':'circle-user-round',
  '/notifications':'bell','/saved':'bookmark','/profile/edit':'user-round-pen',
  '/staff/tickets':'inbox','/staff':'clipboard-list','/staff/promotions':'award',
  '/admin/roles':'shield-check','/admin/settings':'settings-2','/admin/moderation':'gavel',
  '/owner/approvals':'badge-check','/owner/audit':'file-search','/owner/owners':'key-round'
});
export const navigationIcon=href=>icon(NAV_ICON_NAMES[href]||'circle-question-mark',{size:19});
