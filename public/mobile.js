// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Mobile enhancement only. Existing page navigation and server-side permission checks remain unchanged.
(() => {
 const media=window.matchMedia('(max-width:840px)');
 const menu=document.querySelector('[data-mobile-more]');
 if(!menu)return;
 const scrim=menu.querySelector('[data-mobile-more-close]');
 const search=menu.querySelector('[data-mobile-page-search]');
 const summary=menu.querySelector('summary');
 const setOpen=open=>{
  if(menu.open!==open)menu.open=open;
  document.body.classList.toggle('mobile-menu-open',open&&media.matches);
  summary.setAttribute('aria-expanded',String(open));
 };
 setOpen(false);
 menu.addEventListener('toggle',()=>setOpen(menu.open));
 scrim?.addEventListener('click',()=>{setOpen(false);summary.focus();});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!menu.open)return;
  event.preventDefault();setOpen(false);summary.focus();
 });
 menu.querySelectorAll('nav a').forEach(link=>link.addEventListener('click',()=>setOpen(false)));
 media.addEventListener('change',()=>setOpen(false));
 search?.addEventListener('click',()=>{
  // Use the existing permission-filtered site-wide page finder, rather than
  // introducing a second search/navigation system on phones.
  setOpen(false);
  const button=document.querySelector('.page-find-button');
  if(button){button.click();return;}
  const dialog=document.querySelector('dialog.page-finder');
  if(dialog&&!dialog.open){
   dialog.showModal();
   dialog.querySelector('input[type=search]')?.focus();
  }
 });
 // Prevent horizontal table scrolling from grabbing a vertical page swipe.
 for(const table of document.querySelectorAll('.table-wrap')){
  if(!table.hasAttribute('tabindex'))table.tabIndex=0;
  if(!table.hasAttribute('aria-label'))table.setAttribute('aria-label','Scrollable data table');
 }
})();
