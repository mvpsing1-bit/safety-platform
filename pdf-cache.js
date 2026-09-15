const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
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

// 💡 실패한 파일 무한 재시도 버그 해결 (원상 복구)
function isFresh(entry, stat) {
    return !!entry && entry.size === stat.size && entry.mtimeMs === stat.mtimeMs;
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
                    // 💡 클로드의 버퍼 우회 기법 적용 + 1.1.1 버전 고정
                    data = await pdfParse(new Uint8Array(buf));
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

// 💡 contextData 객체를 훑어서 PDF 파일명 + 사람이 읽는 제목을 짝지어 반환
//    예) { name: 'He(헬륨)', fileUrl: '/uploads/xxx.pdf', guideUrl: '/uploads/yyy.pdf' }
//        → [{ name: 'xxx.pdf', title: 'He(헬륨)' }, { name: 'yyy.pdf', title: 'He(헬륨) (guide)' }]
function extractPdfRefs(contextData) {
    const refs = new Map();
    const visit = (node, parentTitle) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(n => visit(n, parentTitle)); return; }
        const title = node.title || node.name || parentTitle || '';
        for (const [key, val] of Object.entries(node)) {
            if (typeof val === 'string' && /\/uploads\/[^"'\s\\]+\.pdf$/i.test(val)) {
                let fileName;
                try { fileName = path.basename(decodeURIComponent(val.split('/').pop())); }
                catch { fileName = path.basename(val.split('/').pop()); }
                const suffix = /^fileUrl$/i.test(key) ? '' : (/^guideUrl$/i.test(key) ? ' 공정별 관리요령' : ` (${key.replace(/Url$/i, '')})`);
                const label = title + suffix;
                if (!refs.has(fileName)) refs.set(fileName, { name: fileName, title: label.trim() || fileName });
            } else if (val && typeof val === 'object') {
                visit(val, title);
            }
        }
    };
    visit(contextData, '');
    if (!refs.size) {
        for (const n of extractPdfNames(JSON.stringify(contextData || {}))) refs.set(n, { name: n, title: n });
    }
    return [...refs.values()];
}

// 💡 한국어 검색용 정규화: 소문자 + 공백/기호 제거 (PDF에서 띄어쓰기가 사라져도 매칭되게)
function normalize(s) {
    return String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

// 💡 두 글자씩 잘라서 집합으로 (조사 붙은 '질소의'도 '질소'로 매칭됨)
function bigrams(s) {
    const set = new Set();
    for (let i = 0; i + 2 <= s.length; i++) set.add(s.slice(i, i + 2));
    return set;
}

function countHits(queryGrams, text) {
    let hits = 0;
    for (const g of queryGrams) if (text.includes(g)) hits++;
    return hits;
}

// 💡 문단 경계를 살려서 약 size자 조각으로 자르기
function splitChunks(text, size = 1200) {
    const chunks = [];
    let cur = '';
    for (const para of text.split(/\n{2,}|\n(?=\d+\.\s)/)) {
        if (cur.length + para.length + 1 > size && cur) { chunks.push(cur); cur = ''; }
        if (para.length > size) {
            for (let i = 0; i < para.length; i += size) chunks.push(para.slice(i, i + size));
        } else {
            cur += (cur ? '\n' : '') + para;
        }
    }
    if (cur) chunks.push(cur);
    return chunks;
}

// refs: [{ name, title }] 또는 파일명 문자열 배열 모두 허용
async function getPromptText(refs, question = '', budget = 60000, maxChunks = 40) {
    if (!refs || !refs.length) return '';
    refs = refs.map(r => (typeof r === 'string' ? { name: r, title: r } : r));
    const entries = await runLimited(refs.map(r => r.name), parseFile, 5);
    const queryGrams = bigrams(normalize(question));
    if (!queryGrams.size) return '';

    const scored = [];
    entries.forEach((entry, i) => {
        if (!entry || entry.error || !entry.text) return;
        const titleScore = countHits(queryGrams, normalize(refs[i].title));
        splitChunks(entry.text).forEach((chunk, idx) => {
            const score = countHits(queryGrams, normalize(chunk)) + titleScore * 3;
            if (score > 0) scored.push({ ref: refs[i], chunk, idx, score });
        });
    });
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

    let out = '', used = 0, n = 0;
    for (const s of scored) {
        if (n >= maxChunks || used + s.chunk.length > budget) break;
        out += `\n\n[첨부문서: ${s.ref.title} | 파일: ${s.ref.name} | ${s.idx + 1}번째 조각]\n${s.chunk}\n`;
        used += s.chunk.length;
        n++;
    }
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

module.exports = { init, parseFile, extractPdfNames, extractPdfRefs, getPromptText, status, rebuild };