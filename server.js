const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

// 사용자님의 API Key 적용
const genAI = new GoogleGenerativeAI('AQ.Ab8RN6IXmEI-fFwRr61G9RjicODxochJmu-JFYC8k3OvcxuUdw');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// 💡 [라우터 설정] 분리될 각각의 페이지들에 대한 접속 경로를 만들어줍니다.
app.get('/', (req, res) => res.render('index'));
app.get('/admin', (req, res) => res.render('admin'));
app.get('/view', (req, res) => res.render('detail')); // 일반 자료실 전용
app.get('/msds', (req, res) => res.render('msds'));
app.get('/dri', (req, res) => res.render('dri'));       // 신규: DRI 전용
app.get('/ppe', (req, res) => res.render('ppe'));       // 신규: 보호구 전용 (예정)
app.get('/notice', (req, res) => res.render('notice')); // 신규: 공지사항 전용 (예정)

// 파일 업로드 API
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    res.json({ fileUrl: '/uploads/' + req.file.filename, fileName: req.file.originalname });
});

// 🤖 [초고속 스트리밍 적용 AI 챗봇 백엔드 API]
app.post('/api/chat', async (req, res) => {
    try {
        const { question, contextData } = req.body;

        if (!question) {
            return res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
        }

        const promptText = `
너는 'ESOL 환경안전보건 플랫폼'의 전문 AI 지식 비서야.

[응답 규칙 - 매우 중요]
1. 마크다운 기호(*, **, #, - 등)는 절대 사용 금지. 기호를 쓰면 시스템 에러가 발생하니 무조건 일반 텍스트로만 대답해.
2. 문단을 나눌 때는 기호 대신 🧪, ⚠️, 🛡️, 📌, 💡, 👉 등의 이모티콘만 사용하여 가독성 좋고 예쁘게 답변해.
3. 아래 [사업장 데이터]에 기반한 질문은 해당 정보를 바탕으로 답변해.

[사업장 데이터]:
${JSON.stringify(contextData || {})}

[사용자 질문]:
${question}
        `;

        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
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
        res.write('⚠️ AI 답변 생성 중 오류가 발생했습니다.');
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`ESOL 플랫폼 서버가 정상 실행되었습니다: http://localhost:${PORT}`);
});