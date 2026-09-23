// Runs before product scripts, exclusively in the generated review artifact.
(() => {
    const storage = Object.freeze({length:0,getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{},key:()=>null});
    for (const name of ['localStorage','sessionStorage']) Object.defineProperty(window,name,{value:storage,writable:false,configurable:false});
    Object.defineProperty(window,'indexedDB',{value:Object.freeze({open:()=>{throw new DOMException('Persistent storage disabled in preview','SecurityError');},databases:async()=>[]}),writable:false,configurable:false});
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const method = String(init.method || input?.method || 'GET').toUpperCase();
        if (method === 'POST') return Promise.resolve(new Response(JSON.stringify({success:true,message:'Preview only: nothing was sent or saved.'}),{headers:{'Content-Type':'application/json'}}));
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        if (!['GET','HEAD'].includes(method) || url.origin !== location.origin) return Promise.reject(new TypeError('Request disabled in preview'));
        return nativeFetch(input,init);
    };
    window.open = () => null;
    document.addEventListener('click',event=>{
        const anchor=event.target.closest('a[href]');
        if (anchor && new URL(anchor.href,location.href).origin !== location.origin) {event.preventDefault();event.stopImmediatePropagation();}
    },true);
    document.addEventListener('DOMContentLoaded', async () => {
        // Inert descriptors make a missing/blocked bootstrap fail closed.
        for (const descriptor of document.querySelectorAll('script[type="application/x-preview-script"]')) {
            const src=descriptor.dataset.previewSrc;
            if (src && new URL(src,location.href).origin !== location.origin) continue;
            const script=document.createElement('script');
            script.type=descriptor.dataset.previewType;
            const done=new Promise(resolve=>{script.onload=script.onerror=resolve;});
            if(src) script.src=src; else script.textContent=descriptor.textContent;
            document.head.appendChild(script);
            if(src || script.type==='module') await done;
        }
        document.querySelectorAll('[data-preview-fields]').forEach(fieldset => {fieldset.disabled=false;});
        document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}));
    }, {once:true});
})();
