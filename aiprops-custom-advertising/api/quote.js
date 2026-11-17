// Vercel Serverless Function. Set RESEND_API_KEY, QUOTE_TO_EMAIL, QUOTE_FROM_EMAIL
// in Vercel > Project > Settings > Environment Variables.
const CATALOG_RE = /^P\d{3}$/;
const ALLOWED_EXT = /\.(png|jpe?g|pdf|svg|ai|eps|zip)$/i;
const validEmail = v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
const clean = (v,n=2000) => String(v??'').trim().slice(0,n);
const escapeHTML = v => clean(v,5000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line = (key,value) => `<tr><td style="padding:9px;border-bottom:1px solid #e5e7eb;font-weight:bold">${escapeHTML(key)}</td><td style="padding:9px;border-bottom:1px solid #e5e7eb">${escapeHTML(value)}</td></tr>`;
function ipAddress(req){return clean(req.headers['x-forwarded-for']||'unknown',80).split(',')[0]}
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Método no permitido.'})}
 const key=process.env.RESEND_API_KEY,to=process.env.QUOTE_TO_EMAIL,from=process.env.QUOTE_FROM_EMAIL;
 if(!key||!to||!from)return res.status(503).json({ok:false,error:'El formulario aún no está configurado por el administrador. Inténtalo más tarde.'});
 try{
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   const c=body.contact||{},items=body.items,attachments=body.attachments||[];
   // Honeypot field. Real visitors do not fill contact.fax.
   if(c.fax)return res.status(200).json({ok:true,reference:'RECEIVED'});
   if(!clean(c.name,120)||!validEmail(c.email)||clean(c.phone,25).length<7||!c.consent||!['Email','WhatsApp','SMS','Llamada'].includes(c.channel))return res.status(400).json({ok:false,error:'Verifica tus datos de contacto y autorización.'});
   if(!Array.isArray(items)||items.length===0||items.length>60)return res.status(400).json({ok:false,error:'Debes incluir entre 1 y 60 artículos.'});
   const normalized=items.map(it=>({id:clean(it.id,20),name:clean(it.name,120),qty:Number(it.qty),color:clean(it.color,100),size:clean(it.size,100),method:clean(it.method,100),notes:clean(it.notes,1500)}));
   if(normalized.some(it=>!(CATALOG_RE.test(it.id)||it.id==='CUSTOM')||!it.name||!Number.isInteger(it.qty)||it.qty<1||it.qty>1000000))return res.status(400).json({ok:false,error:'Hay artículos con información inválida.'});
   if(!Array.isArray(attachments)||attachments.length>2)return res.status(400).json({ok:false,error:'Máximo dos archivos.'});
   let fileSize=0;const safeAttachments=[];
   for(const a of attachments){const filename=clean(a.filename,120),content=a.content;if(!ALLOWED_EXT.test(filename)||typeof content!=='string'||!/^[a-zA-Z0-9+/]*={0,2}$/.test(content))return res.status(400).json({ok:false,error:'Formato de archivo no permitido.'});const size=Buffer.byteLength(content,'base64');fileSize+=size;if(size>1024*1024||fileSize>2*1024*1024)return res.status(413).json({ok:false,error:'Los archivos exceden el límite de 2 MB.'});safeAttachments.push({filename,content})}
   const reference='AI-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,8).toUpperCase();
   const itemHTML=normalized.map((it,i)=>`<h3 style="color:#233fd1">${i+1}. ${escapeHTML(it.name)} (${escapeHTML(it.id)})</h3><table style="border-collapse:collapse;width:100%">${line('Cantidad',it.qty)}${line('Color',it.color)}${line('Modelo / talla',it.size)}${line('Técnica',it.method)}${line('Arte / instrucciones',it.notes)}</table>`).join('');
   const html=`<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#1b2842"><h1 style="color:#263aff">AIPROPS Custom Advertising</h1><p>Nueva solicitud de cotización: <strong>${reference}</strong></p><h2>Datos del cliente</h2><table style="border-collapse:collapse;width:100%">${line('Nombre',c.name)}${line('Empresa',c.company)}${line('Email',c.email)}${line('Teléfono',c.phone)}${line('Canal preferido',c.channel)}${line('Fecha deseada',c.needBy)}${line('Lugar de entrega',c.deliveryLocation)}${line('Notas',c.generalNotes)}</table><h2>Productos (${normalized.length})</h2>${itemHTML}<p style="color:#69788f;font-size:12px">La cotización, precio y disponibilidad deben confirmarse. Enviado desde AIPROPS Custom Advertising.</p></div>`;
   const payload={from:`AIPROPS Custom Advertising <${from}>`,to:[to],reply_to:clean(c.email,200),subject:`Nueva cotización ${reference} | ${clean(c.name,80)}`,html,attachments:safeAttachments};
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(!response.ok){console.error('Resend failure',response.status,(await response.text()).slice(0,800));return res.status(502).json({ok:false,error:'No se pudo enviar el correo de cotización. Inténtalo nuevamente.'})}
   // Optional customer acknowledgement if sender domain is verified by Resend.
   if(process.env.SEND_CUSTOMER_CONFIRMATION==='true'){
     const confirm={from:`AIPROPS Custom Advertising <${from}>`,to:[clean(c.email,200)],subject:`Recibimos tu solicitud ${reference}`,html:`<div style="font-family:Arial,sans-serif"><h2>¡Gracias por contactar a AIPROPS!</h2><p>Hemos recibido tu solicitud <strong>${reference}</strong> con ${normalized.length} artículo(s).</p><p>Revisaremos los detalles y coordinaremos la cotización formal por tu canal preferido: ${escapeHTML(c.channel)}.</p><p>El precio, existencias, mínimos de producción y tiempos de entrega se confirmarán posteriormente. La propuesta formal será emitida por la empresa suplidora correspondiente.</p></div>`};
     try { const confirmResponse=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(confirm)}); if(!confirmResponse.ok)console.error('Confirmation email failure',confirmResponse.status); } catch(err) { console.error('Confirmation email error',err.message); }
   }
   return res.status(200).json({ok:true,reference});
 }catch(err){console.error('Quote server error',err);return res.status(500).json({ok:false,error:'Ocurrió un error al procesar la solicitud.'})}
};
