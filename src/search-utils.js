// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// User-entered search terms are literal text, not SQL LIKE wildcards.
export function literalLikePattern(value,maxLength=80){
 const term=String(value??'').trim().slice(0,maxLength).replace(/[\\%_]/g,'\\$&');
 return '%'+term+'%';
}

// Validate actual UTC calendar dates. Date.parse alone normalizes e.g. February 30.
export function isoDayMillis(value){
 const valueText=String(value??'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(valueText))
   throw Object.assign(new Error('Invalid date filter.'),{status:400});
 const at=Date.parse(valueText+'T00:00:00.000Z');
 if(!Number.isFinite(at)||new Date(at).toISOString().slice(0,10)!==valueText)
   throw Object.assign(new Error('Invalid date filter.'),{status:400});
 return at;
}
