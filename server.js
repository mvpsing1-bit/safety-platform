const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

// 사용자님의 API Key 적용
const genAI = new GoogleGenerativeAI('AQ.Ab8RN6IXmEI-fFwRr61G9RjicODxochJmu-JFYC8k3OvcxuUdw');

// 💡 [추가됨] 1. db.json 파일이 없으면 자동 생성 (미니 데이터베이스 역할)
const dbPath = path.join(__dirname, 'db.json');
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}));
}

// 💡 [수정됨] 2. 파일 용량 제한 해제 (PDF, 이미지 등 대용량 Base64 저장을 위함)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 라우터 설정
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
app.get('/org', (req, res) => res.render('org')); // 안전보건 조직도 전용 페이지
app.get('/committee', (req, res) => {
    res.render('committee'); 
});
app.get('/contact', (req, res) => {
    res.render('contact'); 
});
app.get('/emergency', (req, res) => {
    res.render('emergency'); 
});
app.get('/risk', (req, res) => {
    res.render('risk'); // views/risk.ejs 파일을 화면에 렌더링
});

// 💡 [수정됨] 3. 데이터 통신 API (데이터 불러오기) - 캐시 방지 적용
app.get('/api/db', (req, res) => {
    // 브라우저가 과거 데이터를 기억(캐시)하지 못하도록 강력하게 막는 주문입니다.
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(data);
});

// 💡 [추가됨] 4. 데이터 통신 API (데이터 저장 및 삭제)
app.post('/api/db', (req, res) => {
    const { key, value } = req.body;
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    if (value === null) {
        delete data[key]; // 삭제
    } else {
        data[key] = value; // 저장
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// 파일 업로드 API
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    res.json({ fileUrl: '/uploads/' + req.file.filename, fileName: req.file.originalname });
});

// AI 챗봇 백엔드 API (구버전 SDK 완벽 호환 및 성능 향상 버전)
app.post('/api/chat', async (req, res) => {
    try {
        const { question, contextData } = req.body;

        if (!question) {
            return res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
        }

        // 💡 1. 모델 및 온도 설정 (systemInstruction 옵션 제거하여 버전 충돌 방지!)
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-3.5-flash-lite',
            generationConfig: {
                temperature: 0.2, // 사실 기반 답변을 위해 낮게 유지
                topP: 0.8,
                topK: 40
            }
        });

        // 💡 2. 프롬프트 안에 시스템 지시사항, 사내 데이터, 사용자 질문을 한 번에 합쳐서 전달
        const promptText = `
너는 'ESOL 환경안전보건 플랫폼'의 친절하고 전문적인 AI 지식 비서야.
근로자의 안전과 생명이 달린 전문적인 답변부터, 가벼운 일상 대화까지 모두 자연스럽게 응대할 수 있어.

[절대 규칙 - 시스템 에러 방지용]
1. 마크다운 기호(*, **, #, - 등)는 절대 사용하지 마. 무조건 일반 텍스트로 대답해.
2. 문단을 나눌 때는 기호 대신 🧪, ⚠️, 🛡️, 📌, 💡, 👉, ✅, 👋 등의 이모티콘을 활용해 가독성 좋게 꾸며줘.

[대화 및 답변 가이드라인]
1. 사내 규정, 공지사항, MSDS, 보호구 등 '회사와 관련된 질문'은 반드시 제공된 [사업장 데이터]를 최우선으로 검색해서 정확하게 답변해.
2. 사내 업무 관련 질문인데 [사업장 데이터]에 내용이 없다면, "해당 내용은 현재 등록된 사내 데이터에서 찾을 수 없습니다."라고 안내한 뒤 너의 일반적인 안전보건 지식을 활용해 일반론적인 조언을 덧붙여줘.
3. "안녕", "오늘 힘드네", "점심 뭐 먹을까?" 같은 일상적인 대화나 사내 업무와 무관한 일반적인 질문에는 친절하고 센스 있게, 진짜 사람과 대화하듯 자연스럽게 대답해 줘.
4. 항상 사용자(임직원)를 존중하고 따뜻한 톤앤매너를 유지해.

[사업장 데이터]
${JSON.stringify(contextData || {})}

[사용자 질문]
${question}
`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 스트림 방식으로 답변 생성
        const result = await model.generateContentStream(promptText);
        for await (const chunk of result.stream) {
            let chunkText = chunk.text();
            // 프론트엔드 에러 방지를 위해 혹시라도 튀어나온 마크다운 강제 제거
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

app.listen(PORT, () => {
    console.log(`ESOL 플랫폼 서버가 정상 실행되었습니다: http://localhost:${PORT}`);
});