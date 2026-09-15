const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
// 💡 호환성 최강 pdf-parse로 복귀!
const pdfParse = require('pdf-parse'); 

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CACHE_PATH = path.join(__dirname, 'pdf-cache.json');
const CONCURRENCY = 3;        
const MAX_CHARS_PER_PDF = 0;  
const PARSE_ATTEMPTS = 4;     

let cache = {};               
const inFlight = new Map();   
let saveTimer = null;

function load() {
    try {
        if (fs.existsSync(CACHE_PATH)) {
            cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) || {};
        }
    } catch (err) {
        cache = {};
    }
}

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), () => {});
    }, 500);
}

function isFresh(entry, stat) {
    return !!entry && !entry.error && entry.size === stat.size && entry.mtimeMs === stat.mtimeMs;
}

async function runLimited(items, worker, limit = CONCURRENCY) {
    const results = new Array(items.length);
    let next = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const idx = next++;
            results[idx] = await worker(items[idx]);
        }
    });
    await Promise.all(runners);
    return results;
}

async function parseFile(fileName) {
    fileName = path.basename(fileName); 
    if (inFlight.has(fileName)) return inFlight.get(fileName);

    const job = (async () => {
        const filePath = path.join(UPLOAD_DIR, fileName);
        let stat;
        try {
            stat = await fsp.stat(filePath);
        } catch {
            if (cache[fileName]) { delete cache[fileName]; scheduleSave(); }
            return null;
        }

        if (isFresh(cache[fileName], stat)) return cache[fileName];

        const t0 = Date.now();
        try {
            let data;
            for (let attempt = 1; ; attempt++) {
                try {
                    stat = await fsp.stat(filePath);
                    const buf = await fsp.readFile(filePath);
                    
                    const parseFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse.pdfParse);
                    if (!parseFunc) throw new Error("pdf-parse 모듈 에러");

                    // 💡 [클로드의 천재적인 트릭!] 에러가 나지 않도록 순수 배열로 감싸서 넘깁니다.
                    data = await parseFunc(new Uint8Array(buf));
                    break;
                } catch (err) {
                    if (attempt >= PARSE_ATTEMPTS) throw err;
                    await new Promise(r => setTimeout(r, 300 * attempt));
                }
            }
            
            let text = (data.text || '')
                .replace(/\r/g, '')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
                
            if (MAX_CHARS_PER_PDF > 0 && text.length > MAX_CHARS_PER_PDF) {
                text = text.slice(0, MAX_CHARS_PER_PDF) + '\n...(이하 생략)';
            }
            
            cache[fileName] = {
                text,
                pages: data.numpages || 1,
                size: stat.size,
                mtimeMs: stat.mtimeMs,
                parsedAt: new Date().toISOString(),
            };
            console.log(`✅ [PDF 캐시] ${fileName} 추출 완료!`);
        } catch (err) {
            cache[fileName] = {
                text: '',
                size: stat.size,
                mtimeMs: stat.mtimeMs,
                parsedAt: new Date().toISOString(),
                error: typeof err === 'object' ? err.message : String(err),
            };
            console.error(`❌ [PDF 캐시] ${fileName} 파싱 실패:`, err.message);
        }
        scheduleSave();
        return cache[fileName];
    })().finally(() => inFlight.delete(fileName));

    inFlight.set(fileName, job);
    return job;
}

async function syncAll() {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
    const files = (await fsp.readdir(UPLOAD_DIR)).filter(f => /\.pdf$/i.test(f));
    const fileSet = new Set(files);

    let removed = 0;
    for (const name of Object.keys(cache)) {
        if (!fileSet.has(name)) { delete cache[name]; removed++; }
    }
    if (removed) scheduleSave();

    await runLimited(files, parseFile);
    console.log(`📚 [PDF 캐시] ESOL 사내 문서 동기화가 모두 완료되었습니다!`);
}

async function waitUntilStable(filePath) {
    let last = -1;
    for (let i = 0; i < 60; i++) {
        let size;
        try { size = (await fsp.stat(filePath)).size; } catch { return; } 
        if (size === last) return;
        last = size;
        await new Promise(r => setTimeout(r, 500));
    }
}

function watchUploads() {
    try {
        const timers = new Map();
        fs.watch(UPLOAD_DIR, (event, fileName) => {
            if (!fileName || !/\.pdf$/i.test(fileName)) return;
            clearTimeout(timers.get(fileName));
            timers.set(fileName, setTimeout(async () => {
                timers.delete(fileName);
                await waitUntilStable(path.join(UPLOAD_DIR, fileName));
                parseFile(fileName).catch(() => {});
            }, 1000));
        });
    } catch (err) {}
}

function extractPdfNames(contextString) {
    const regex = /\/uploads\/[^"'\s\\]+\.pdf/gi;
    const matches = contextString.match(regex) || [];
    const names = new Set();
    for (const url of matches) {
        try {
            names.add(path.basename(decodeURIComponent(url.split('/').pop())));
        } catch {
            names.add(path.basename(url.split('/').pop()));
        }
    }
    return [...names];
}

async function getPromptText(fileNames) {
    if (!fileNames.length) return '';
    const entries = await runLimited(fileNames, parseFile, 5);
    let out = '';
    entries.forEach((entry, i) => {
        if (entry && !entry.error && entry.text) {
            out += `\n\n[첨부문서 내용: ${fileNames[i]}]\n${entry.text}\n`;
        }
    });
    return out;
}

function status() {
    const list = Object.entries(cache).map(([name, e]) => ({
        name, pages: e.pages, chars: e.text ? e.text.length : 0, parsedAt: e.parsedAt, error: e.error || null,
    }));
    return { total: list.length, inFlight: [...inFlight.keys()], files: list };
}

async function rebuild() {
    cache = {};
    await syncAll();
    return status();
}

async function init() {
    load();
    await syncAll();
    watchUploads();
}

module.exports = { init, parseFile, extractPdfNames, getPromptText, status, rebuild };