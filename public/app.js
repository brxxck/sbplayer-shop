// BUILT BY SB // RUNING ON WEED AND CAFFEINE
for(const form of document.querySelectorAll('form[data-confirm]')){
  form.addEventListener('submit',event=>{
    if(!window.confirm(form.getAttribute('data-confirm')||'Confirm this action?'))event.preventDefault();
  });
}
// Keep long text input status visible without leaking client content to third parties.
for(const field of document.querySelectorAll('textarea[maxlength]')){
  const count=document.createElement('small');count.className='char-count muted';
  field.insertAdjacentElement('afterend',count);
  const update=()=>{count.textContent=`${field.value.length} / ${field.maxLength} characters`;};
  field.addEventListener('input',update);update();
}
