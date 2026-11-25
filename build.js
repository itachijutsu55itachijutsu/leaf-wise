// Zero-dependency static site builder. Run: node build.js  -> output in /dist
const fs=require('fs'),path=require('path');
const site=JSON.parse(fs.readFileSync('site.json','utf8'));
const OUT='dist';
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const attr=s=>esc(s).replace(/"/g,'&quot;');
const inline=s=>esc(s)
 .replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,src)=>`<img src="${src.replace(/"/g,'&quot;')}" alt="${alt.replace(/"/g,'&quot;')}" loading="lazy" decoding="async">`)
 .replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,href)=>`<a href="${href.replace(/"/g,'&quot;')}">${label}</a>`)
 .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
function imageFigure(img,caption){
 return `<figure>${img}${caption?`<figcaption>${inline(caption)}</figcaption>`:''}</figure>`;
}
function table(lines){
 const cells=line=>line.trim().slice(1,-1).split('|').map(cell=>inline(cell.trim()));
 const row=(line,tag)=>`<tr>${cells(line).map(cell=>`<${tag}>${cell}</${tag}>`).join('')}</tr>`;
 return `<div class="table-wrap"><table><thead>${row(lines[0],'th')}</thead><tbody>${lines.slice(2).map(line=>row(line,'td')).join('')}</tbody></table></div>`;
}
function md(t){return t.trim().split(/\n\s*\n/).map(b=>{b=b.trim();
 const ph=b.match(/^\[IMAGE: (.+)\]$/);if(ph)return '<div class="img-ph">Image placeholder: '+esc(ph[1])+'</div>';
 const lines=b.split('\n');
 if(lines.length>1&&lines[0].startsWith('|')&&/^\|[\s:|-]+\|$/.test(lines[1]))return table(lines);
 if(/^!\[[^\]]*\]\([^)]+\)$/.test(lines[0]))return imageFigure(inline(lines[0]),lines.slice(1).join(' '));
 if(b.startsWith('## '))return '<h2>'+inline(b.slice(3))+'</h2>';
 if(b.startsWith('### '))return '<h3>'+inline(b.slice(4))+'</h3>';
 if(/^\d+\. /.test(b))return '<ol>'+b.split('\n').map(l=>'<li>'+inline(l.replace(/^\d+\. /,''))+'</li>').join('')+'</ol>';
 if(/^- /.test(b))return '<ul>'+b.split('\n').map(l=>'<li>'+inline(l.replace(/^- /,''))+'</li>').join('')+'</ul>';
 return '<p>'+inline(b.replace(/\n/g,' '))+'</p>';}).join('\n');}
function read(file){let raw=fs.readFileSync(file,'utf8').replace(/\{\{email\}\}/g,site.email).replace(/\{\{name\}\}/g,site.name).replace(/\{\{author\}\}/g,site.author);
 const m=raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);const meta={};let body=raw;
 if(m){m[1].split('\n').forEach(l=>{const i=l.indexOf(':');if(i>0)meta[l.slice(0,i).trim()]=l.slice(i+1).trim()});body=m[2];}
 return {meta,body,slug:path.basename(file,'.md')};}
const list=d=>fs.existsSync(d)?fs.readdirSync(d).filter(f=>f.endsWith('.md')).map(f=>read(path.join(d,f))):[];
const articles=list('articles').sort((a,b)=>(b.meta.date||'').localeCompare(a.meta.date||''));
const pages=list('pages');
const css=fs.readFileSync('style.css','utf8');
const ad=site.adsenseId?`<meta name="google-adsense-account" content="${site.adsenseId}"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseId}" crossorigin="anonymous"></script>`:'';
function layout(title,desc,url,body,img){return `<!DOCTYPE html><html lang="en"><head><meta name="google-site-verification" content="LwADFSwRfga7rrNPcg9socw9BU0ovJne6EInjp_Wb3E" /><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index, follow, max-image-preview:large">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><link rel="canonical" href="${site.domain}${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${img?'article':'website'}">${img?`<meta property="og:image" content="${site.domain}${img}">`:''}<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🪴</text></svg>"><link rel="stylesheet" href="/style.css">${ad}</head><body><header><a class="logo" href="/">🪴 ${esc(site.name)}</a><nav><a href="/">Home</a><a href="/guides/">Guides</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav></header><main>${body}</main><footer><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><p>© ${new Date().getFullYear()} ${esc(site.name)}. Plant care information is general guidance only.</p></footer></body></html>`;}
function write(url,html){const p=path.join(OUT,url,'index.html');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,html);}
const thumb=a=>a.meta.image?`<a href="/${a.slug}/"><img class="thumb" src="${attr(a.meta.image)}" alt="${attr(a.meta.imageAlt||a.meta.title)}" width="640" height="360" loading="lazy" decoding="async"></a>`:'';
const card=a=>`<div class="card">${thumb(a)}<h3><a href="/${a.slug}/">${esc(a.meta.title)}</a></h3><p class="meta">${esc(a.meta.description||'')}</p></div>`;
write('',layout(`${site.name}: ${site.tagline}`,site.tagline,'/',`<h1>${esc(site.tagline)}</h1><p class="lead">${esc(site.name)} publishes plain-language guides on watering, light, soil and troubleshooting.</p><h2>Latest guides</h2>${articles.slice(0,6).map(card).join('')}<p><a href="/guides/">See all guides →</a></p>`));
write('guides',layout(`All guides | ${site.name}`,'All houseplant care guides','/guides/',`<h1>All guides</h1>${articles.map(card).join('')}`));
articles.forEach(a=>{const rel=articles.filter(x=>x!==a).slice(0,3).map(card).join('');
 const cover=a.meta.image?imageFigure(`<img class="hero" src="${attr(a.meta.image)}" alt="${attr(a.meta.imageAlt||a.meta.title)}" width="1200" height="675">`,a.meta.imageCredit):'';
 write(a.slug,layout(`${a.meta.title} | ${site.name}`,a.meta.description||'',`/${a.slug}/`,`<article><h1>${esc(a.meta.title)}</h1><p class="meta">By ${esc(site.author)} · Updated ${esc(a.meta.date||'')}</p>${cover}${md(a.body)}</article><h2>Keep reading</h2>${rel}`,a.meta.image));});
pages.forEach(p=>write(p.slug,layout(`${p.meta.title} | ${site.name}`,p.meta.description||p.meta.title,`/${p.slug}/`,`<h1>${esc(p.meta.title)}</h1>${md(p.body)}`)));
const urls=['/','/guides/',...articles.map(a=>`/${a.slug}/`),...pages.map(p=>`/${p.slug}/`)];
fs.writeFileSync(path.join(OUT,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${site.domain}${u}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync(path.join(OUT,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);
if(site.adsenseId)fs.writeFileSync(path.join(OUT,'ads.txt'),`google.com, ${site.adsenseId.replace('ca-','')}, DIRECT, f08c47fec0942fa0\n`);
fs.writeFileSync(path.join(OUT,'style.css'),css);
if(fs.existsSync('images'))fs.cpSync('images',path.join(OUT,'images'),{recursive:true});
console.log(`Built ${articles.length} articles, ${pages.length} pages.`);
