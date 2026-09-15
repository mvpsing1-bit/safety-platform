const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfCache = require('./pdf-cache'); 

const app = express();
const PORT = 3000;

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

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    res.json({ fileUrl: '/uploads/' + req.file.filename, fileName: req.file.originalname });

    if (/\.pdf$/i.test(req.file.filename)) {
        pdfCache.parseFile(req.file.filename).catch(err =>
            console.error('❌ [PDF 캐시] 업로드 직후 파싱 실패:', err.message)
        );
    }
});

// 💡 관리용 라우트 복구
app.get('/api/pdf-cache/status', (req, res) => res.json(pdfCache.status()));
app.post('/api/pdf-cache/rebuild', async (req, res) => {
    try { res.json(await pdfCache.rebuild()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { question, contextData } = req.body;
        if (!question) return res.status(400).json({ error: '질문 내용을 입력해 주세요.' });

        const contextString = JSON.stringify(contextData || {});
        // 💡 대용량 Base64 이미지 걷어내기 (속도 대폭 향상)
        const contextForPrompt = contextString.replace(/data:[a-z\/+.-]+;base64,[A-Za-z0-9+\/=]+/gi, '[이미지]');

        const pdfRefs = pdfCache.extractPdfRefs(contextData);
        const pdfContents = await pdfCache.getPromptText(pdfRefs, question);
        
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash-lite',
            generationConfig: { temperature: 0.2, topP: 0.8, topK: 40 }
        });

        const promptText = `
[사내 등록 데이터]
${contextForPrompt}

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
3. 답변 우선순위를 반드시 지켜.
   1순위: [사내 등록 데이터]와 [업로드된 문서(PDF) 내용]. 여기서 찾은 내용은 어느 문서에서 나왔는지 문서 이름을 함께 알려줘.
   [업로드된 문서(PDF) 내용]에 질문과 관련된 본문이 있으면, 문서 목록만 나열하지 말고 그 본문의 실제 내용을 구체적으로 정리해서 답해. PDF 본문은 띄어쓰기가 뭉개져 있을 수 있으니 의미 단위로 읽어.
   2순위: 사내 자료에 없거나 부족한 부분만, "📌 사내 자료에는 없는 내용이라 일반적인 정보로 보충드립니다"라고 먼저 밝힌 뒤 네가 아는 일반 지식으로 답해.
   두 내용을 섞지 말고, 사내 자료 답변을 먼저 쓰고 일반 지식은 뒤에 따로 써.
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

// 💡 서버를 즉시 먼저 실행하고 백그라운드에서 캐시 초기화
app.listen(PORT, () => {
    console.log(`ESOL 플랫폼 서버가 정상 실행되었습니다: http://localhost:${PORT}`);
});

pdfCache.init().catch(err => console.error('⚠️ [PDF 캐시] 초기 동기화 중 오류:', err.message));