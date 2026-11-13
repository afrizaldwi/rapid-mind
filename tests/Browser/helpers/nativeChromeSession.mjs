import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Native CDP transport, with a new profile supplied by the isolated test runner.
export async function nativeChromeSession({ executable, profile, proxyPort }) {
    await mkdir(profile, { recursive: true });
    const child = spawn(executable, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--proxy-server=http://127.0.0.1:${proxyPort}`, "--proxy-bypass-list=<-loopback>", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "about:blank"], { stdio:"ignore", windowsHide:true });
    child.on("error",()=>{});
    let port;
    for(let i=0;i<100;i++) {
        try { const [p]=(await readFile(join(profile,"DevToolsActivePort"),"utf8")).split(/\r?\n/); await fetch(`http://127.0.0.1:${p}/json/version`); port=p; break; }
        catch { await delay(100); }
    }
    assert.ok(port,"Isolated Chrome did not start");
    const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
    let next=0;
    const pending=new Map();
    const frames=[], requests=[], errors=[];
    let socketId;
    ws.addEventListener('message',event=>{
        const message=JSON.parse(String(event.data));
        const item=pending.get(message.id);
        if(item) {pending.delete(message.id);clearTimeout(item.timer);message.error?item.reject(new Error('CDP command failed')):item.resolve(message.result);}
        if(message.method==='Runtime.exceptionThrown')errors.push('Browser application exception');
        if(message.method==='Network.requestWillBeSent') {
            const request=message.params.request;
            requests.push({method:request.method,path:new URL(request.url).pathname,time:Date.now(),partial:request.headers['X-Inertia-Partial-Data']??null});
        }
        if(message.method==='Network.webSocketFrameReceived') {
            try {
                const frame=JSON.parse(message.params.response.payloadData);
                const data=typeof frame.data==='string'?JSON.parse(frame.data):frame.data;
                if(frame.event==='pusher:connection_established')socketId=data.socket_id;
                frames.push({event:frame.event,channel:frame.channel,data,time:Date.now()});
            } catch { /* Binary/non-JSON transport frames carry no scenario proof. */ }
        }
    });
    ws.addEventListener('close',()=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Browser transport closed'));}pending.clear();});
    function call(method,params={}) {
        const id=++next;
        return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP command timeout'));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});
    }
    async function evaluate(expression) {
        const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
        if(result.exceptionDetails)throw new Error('Browser evaluation failed');
        return result.result.value;
    }
    async function wait(expression,timeout=20000) {
        const deadline=Date.now()+timeout;
        while(Date.now()<deadline){if(await evaluate(expression))return;await delay(100);}
        throw new Error('Browser condition timeout');
    }
    async function text(value) {await wait(`document.body.innerText.toLocaleLowerCase().includes(${JSON.stringify(value.toLocaleLowerCase())})`);}
    async function fill(selector,value) {
        assert.equal(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;const prototype=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`),true,'Expected enabled form control');
    }
    async function click(value,{contains=false}={}) {
        await wait(`!![...document.querySelectorAll('button')].find(b=>!b.disabled && ( ${contains?`b.textContent.includes(${JSON.stringify(value)})`:`b.textContent.trim()===${JSON.stringify(value)}`} ))`);
        await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>!b.disabled && (${contains?`b.textContent.includes(${JSON.stringify(value)})`:`b.textContent.trim()===${JSON.stringify(value)}`}));b.click();})()`);
    }
    async function goto(path,condition="document.readyState==='complete'") {await call('Page.navigate',{url:'http://localhost:8080'+path});await wait(condition);}
    async function jsonRequest(path,payload) {
        return evaluate(`(async()=>{const r=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(payload===undefined?'GET':'POST')},credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest',...( ${payload===undefined?'false':'true'}?{'Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]').content}:{})},...( ${payload===undefined?'false':'true'}?{body:JSON.stringify(${JSON.stringify(payload??null)})}:{})});let data;const body=await r.text();try{data=JSON.parse(body);}catch{const doc=new DOMParser().parseFromString(body,'text/html');const script=doc.querySelector('script[data-page="app"]');const bootstrap=script?.textContent??doc.querySelector('[data-page]')?.getAttribute('data-page');if(bootstrap)data=JSON.parse(bootstrap);}return {status:r.status,data};})()`);
    }
    await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    return {call,evaluate,wait,text,fill,click,goto,jsonRequest,frames,requests,errors,get socketId(){return socketId;},
        async screenshot(path){assert.equal(await evaluate("!!document.querySelector('output')"),false);const shot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(shot.data,'base64'));},
        async close(){try{await call('Browser.close');}catch{}ws.close();if(child.exitCode===null){await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(3000)]);if(child.exitCode===null)child.kill();}}
    };
}
