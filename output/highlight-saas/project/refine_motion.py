from pathlib import Path
p=Path(__file__).parent/'html/motion.html'
s=p.read_text(encoding='utf-8')
s=s.replace('<svg class="bridge" viewBox="0 0 780 610"><path d="M380 70 H520 V235 H240 V405 H520"/>','<svg class="bridge" viewBox="0 0 1080 1920"><path d="M490 659H590 M780 718V760H300V805 M490 864H590 M780 923V965H300V1010 M490 1069H590"/>')
s=s.replace("$('.subtitles span').textContent=cue?cue.text:'';",'''const safe=cue?cue.text.replaceAll('&','&amp;').replaceAll('<','&lt;'):'';const key=["what you're good at",'one place','first view','what to post',"who's closing",'pulsify'].find(k=>safe.includes(k));$('.subtitles span').innerHTML=key?safe.replace(key,'<b>'+key+'</b>'):safe;''')
s=s.replace('</style>','.bridge{left:0;top:0;width:1080px;height:1920px}.wordmark{filter:invert(1)}.subtitles b{color:#6871f4;font-weight:700}</style>')
p.write_text(s,encoding='utf-8')
