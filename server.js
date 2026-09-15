const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfCache = require('./pdf-cache'); // 💡 다시 캐시 모듈을 완벽하게 연결!

const app = express();
const PORT = 3000;

// API Key 
const genAI = new GoogleGenerativeAI('AQ.Ab8RN6IXmEI-fFwRr61G9RjicODxochJmu-JFYC8k3OvcxuUdw');

const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.get('/', (req, res) => res.render('index'));
app.get('/admin', (req, res) => res.render('admin'));
app.get('/view', (req, res) => res.render('detail'));
app.get('/msds', (req, res) => res.render('msds'));
app.get('/dri', (req, res) => res.render('dri'));
app.get('/ppe', (req, res) => res.render('ppe'));
app.get('/notice', (req, res) => res.render('notice'));
app.get('/policy', (req, res) => res.render('policy'));
app.get('/law', (req, res) => res.render('law'));
app.get('/cert', (req, res) => res.render('cert'));
app.get('/health', (req, res) => res.render('health'));
app.get('/talktalk', (req, res) => res.render('talktalk'));
app.get('/workenv', (req, res) => res.render('workenv'));
app.get('/org', (req, res) => res.render('org'));
app.get('/committee', (req, res) => res.render('committee'));
app.get('/contact', (req, res) => res.render('contact'));
app.get('/emergency', (req, res) => res.render('emergency'));
app.get('/risk', (req, res) => res.render('risk'));

app.get('/api/db', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(JSON.parse(fs.readFileSync(dbPath, 'utf8')));
});

app.post('/api/db', (req, res) => {
    const { key, value } = req.body;
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (value === null) delete data[key];
    else data[key] = value;
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// 💡 업로드 시 자동으로 텍스트 캐싱
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    res.json({ fileUrl: '/uploads/' + req.file.filename, fileName: req.file.originalname });

    if (/\.pdf$/i.test(req.file.filename)) {
        pdfCache.parseFile(req.file.filename).catch(err =>
            console.error('❌ [PDF 캐시] 업로드 직후 파싱 실패:', err.message)
        );
    }
});

// 🤖 AI 챗봇 백엔드 API (초고속 캐시 읽기)
app.post('/api/chat', async (req, res) => {
    try {
        const { question, contextData } = req.body;
        if (!question) return res.status(400).json({ error: '질문 내용을 입력해 주세요.' });

        const contextString = JSON.stringify(contextData || {});

        console.log("\n====================================");
        console.log(`🤖 사용자 질문: ${question}`);

        const t0 = Date.now();
        const pdfNames = pdfCache.extractPdfNames(contextString);
        const pdfContents = await pdfCache.getPromptText(pdfNames);
        
        if (pdfNames.length) {
            console.log(`🔍 [PDF 캐시] ${pdfNames.length}개 문서 초고속 조회 완료 (${Date.now() - t0}ms)`);
        } else {
            console.log("⚠️ [PDF 캐시] 데이터 안에 PDF 링크가 없습니다.");
        }
        console.log("====================================\n");

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash-lite',
            generationConfig: { temperature: 0.2, topP: 0.8, topK: 40 }
        });

        const promptText = `
[사내 등록 데이터]
${contextString}

[업로드된 문서(PDF) 내용]
${pdfContents}

[사용자 질문]
${question}

=========================================
[AI 지식 비서 절대 규칙 - 반드시 지킬 것!]
너는 이솔(ESOL) 환경안전보건 플랫폼의 친절하고 전문적인 AI 지식 비서야.
위 제공된 데이터와 문서 내용, 질문을 바탕으로 아래 규칙을 엄격하게 지켜서 대답해.

1. 마크다운 기호(*, **, #, - 등)는 절대 사용하지 마. 무조건 일반 텍스트로 대답해.
2. 문단을 나눌 때는 기호 대신 🧪, ⚠️, 🛡️, 📌, 💡, 👉, ✅, 👋 등의 이모티콘을 활용해 가독성 좋게 꾸며줘.
3. 사내 규정, 공지사항 등 '회사와 관련된 질문'은 위 데이터들을 최우선으로 분석해. 내용이 없으면 "해당 내용은 현재 등록된 사내 데이터에서 찾을 수 없습니다."라고 안내해.
4. "안녕", "고마워" 등 가벼운 대화나 인사는 자연스럽고 친절하게 대답해줘.
=========================================
`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const result = await model.generateContentStream(promptText);
        for await (const chunk of result.stream) {
            let chunkText = chunk.text();
            chunkText = chunkText.replace(/[\*\#\`\~]/g, '').replace(/-{2,}/g, '\n\n');
            res.write(chunkText);
        }
        res.end();
    } catch (err) {
        console.error('Gemini API 통신 에러 상세:', err);
        res.write('⚠️ AI 답변 생성 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        res.end();
    }
});

pdfCache.init()
    .catch(err => console.error('⚠️ [PDF 캐시] 초기 동기화 중 오류:', err.message))
    .finally(() => {
        app.listen(PORT, () => {
            console.log(`ESOL 플랫폼 서버가 정상 실행되었습니다: http://localhost:${PORT}`);
        });
    });