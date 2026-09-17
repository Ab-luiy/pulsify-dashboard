(() => {
 const media=matchMedia('(prefers-color-scheme: dark)');
 function apply(value){let mode=value;try{mode=mode||localStorage.getItem('theme')||'dark';if(value)localStorage.setItem('theme',value);}catch{}const dark=mode==='dark'||(mode==='system'&&media.matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.classList.toggle('dark',dark);document.body?.classList.toggle('dark',dark);window.dispatchEvent(new CustomEvent('pulsify:theme',{detail:{mode,dark}}));}
 window.PulsifyTheme={apply};apply();media.addEventListener('change',()=>apply());
})();
