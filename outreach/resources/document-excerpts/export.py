from pathlib import Path
from html import escape
from docx import Document
from reportlab.platypus import SimpleDocTemplate, Paragraph, PageBreak, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT

ROOT=Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic','C:/Windows/Fonts/ariali.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='Arial-Bold',italic='Arial-Italic',boldItalic='Arial-Bold')
styles={
'Normal':ParagraphStyle('Normal',fontName='Arial',fontSize=12,leading=17,spaceAfter=10,textColor=HexColor('#171717')),
'Title':ParagraphStyle('Title',fontName='Arial',fontSize=23,leading=29,spaceAfter=15),
'Heading 1':ParagraphStyle('H1',fontName='Arial-Bold',fontSize=17,leading=23,spaceBefore=12,spaceAfter=12,keepWithNext=True),
'Heading 2':ParagraphStyle('H2',fontName='Arial-Bold',fontSize=12,leading=17,spaceBefore=7,spaceAfter=5,keepWithNext=True),
}
doc=Document(ROOT/'pulsify-working-notes.docx')
story=[]; markdown=[]
for p in doc.paragraphs:
    if p._p.xpath('.//w:br[@w:type="page"]'):
        story.append(PageBreak()); markdown.append('\n---\n'); continue
    if not p.text.strip():continue
    fragments=[]
    for run in p.runs:
        text=escape(run.text).replace('\n','<br/>')
        if run.bold:text='<b>'+text+'</b>'
        if run.italic:text='<i>'+text+'</i>'
        if run.font.highlight_color:text='<font backColor="#fff2a8">'+text+'</font>'
        fragments.append(text)
    style=styles.get(p.style.name,styles['Normal'])
    if p.paragraph_format.left_indent:
        style=ParagraphStyle('indented',parent=style,leftIndent=14)
    story.append(Paragraph(''.join(fragments),style))
    prefix={'Title':'# ','Heading 1':'## ','Heading 2':'### '}.get(p.style.name,'')
    markdown.append(prefix+p.text+'\n')
SimpleDocTemplate(str(ROOT/'pulsify-working-notes.pdf'),pagesize=(595.44,841.68),
 leftMargin=50,rightMargin=50,topMargin=40,bottomMargin=40,
 title='Content profile and VSL working notes',author='Pulsify').build(story)
(ROOT/'pulsify-working-notes.md').write_text('\n'.join(markdown),encoding='utf-8')
print('PDF and editable Markdown exported')
