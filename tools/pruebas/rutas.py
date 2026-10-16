# Para las pruebas: el lector de PDF de cdnjs se sirve desde el disco (aqui no hay salida a cdnjs)
P='/tmp/claude-0/-home-claude/6d433802-e58b-5969-9da0-123626eea299/scratchpad/pdfjs/package/build/'
def rutas(pg):
    pg.route('**/cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',lambda r:r.fulfill(path=P+'pdf.min.js',content_type='application/javascript'))
    pg.route('**/cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',lambda r:r.fulfill(path=P+'pdf.worker.min.js',content_type='application/javascript'))
    pg.route('**/www.gstatic.com/**',lambda r:r.abort())
L='/tmp/claude-0/-home-claude/6d433802-e58b-5969-9da0-123626eea299/scratchpad/libs/'
def rutas_pdf(pg):
    rutas(pg)
    pg.route('**/cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',lambda r:r.fulfill(path=L+'html2canvas-1.4.1/package/dist/html2canvas.min.js',content_type='application/javascript'))
    pg.route('**/cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',lambda r:r.fulfill(path=L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js',content_type='application/javascript'))
    pg.route('**/fonts.googleapis.com/**',lambda r:r.abort());pg.route('**/fonts.gstatic.com/**',lambda r:r.abort())
