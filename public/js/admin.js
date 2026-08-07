// ============================================
// 💡 사이드바 메뉴 전환 로직
// ============================================
function switchPanel(tabId, btnElement) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if(btnElement) {
        btnElement.classList.add('active');
    }
}

function toggleNav(navId) {
    const navItemsBox = document.getElementById(navId);
    if (navItemsBox.style.display === 'none') {
        navItemsBox.style.display = 'flex';
    } else {
        navItemsBox.style.display = 'none';
    }
}

// ============================================
// 💡 DB 통신 유틸 함수
// ============================================
async function fetchAdminDB() {
    try {
        const res = await fetch('/api/db');
        return await res.json();
    } catch (err) {
        console.error('DB 연동 에러:', err);
        return {};
    }
}

async function saveAdminDB(key, value) {
    await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: value ? JSON.stringify(value) : null })
    });
}

document.getElementById('driDate').value = new Date().toISOString().split('T')[0];

const defaultMenus = {
    '안전': [
        { title: '안전보건 경영방침', desc: '대표이사 경영방침 및 목표', icon: '📜' },
        { title: '산안법령 요지', desc: '산업안전보건법 핵심 지침', icon: '⚖️' },
        { title: '안전보건 조직도', desc: '사내 안전관리 추진 체계', icon: '👥' },
        { title: '산업안전보건위원회', desc: '안건 및 회의록(1회/분기)', icon: '💡' },
        { title: '비상대응 매뉴얼', desc: '사고 발생 시 행동요령', icon: '🚨' },
        { title: '위험성평가표', desc: '공정별 위험요인 평가 내역', icon: '⚠️' },
        { title: '비상연락망', desc: '사내/사외 비상 연락처', icon: '📞' },
        { title: "Today's DRI", desc: '위험작업 확인', icon: '🚧' },
        { title: 'TBM', desc: 'Tool Box Meeting', icon: '📄' }
    ],
    '보건': [
        { title: '화학물질 자료실', desc: '화학물질 관련 자료', icon: '🧪' },
        { title: '공정별 화학물질 관리요령', desc: '화학물질 관리요령', icon: '🧪' },
        { title: '작업환경 측정결과', desc: '유해인자 측정 보고서', icon: '📊' },
        { title: '근로자 건강관리', desc: '특수/일반 건강검진 안내', icon: '🏥' },
        { title: '보호구 관리', desc: '개인 보호구 지급 현황 및 수칙', icon: '🥽' }
    ],
    '환경': [
        { title: '환경경영방침', desc: '사내 환경 방침 및 목표', icon: '🌿' },
        { title: '온실가스 및 배출량', desc: '탄소 배출 및 에너지 관리', icon: '🏭' },
        { title: '대기·수질 오염관리', desc: '방지시설 모니터링 및 인허가', icon: '💧' },
        { title: '폐기물 성상별 관리', desc: '지정/일반 폐기물 처리 절차', icon: '♻️' }
    ],
    '교육': [
        { title: '안전보건 교육영상', desc: '작업 전 시청하는 교육 영상', icon: '🎬' },
        { title: '안전교육 자료실', desc: '정기/특별 교육 교안 및 자료', icon: '📚' }
    ],
    '기타': [
        { title: '기타 자료실', desc: '각종 서식 및 기타 자료', icon: '📁' },
        { title: '안전보건 제안/건의', desc: '위험요인 제안 및 아차사고 신고', icon: '💡' }
    ]
};

const defaultNotices = [
    { id: 1, tag: '필독', title: '2026년 상반기 작업환경측정 결과 공고의 건', content: '측정이 완료되었습니다.', writer: '환경안전팀', date: '2026-07-20' }
];

const defaultPpeGuides = [
    { process: '🧪 유해화학물질 취급공정', items: '보안경, 방독마스크, 내화학 장갑, 불침투성 보호복' },
    { process: '🔥 용접 / 절단 작업', items: '용접면, 방진마스크, 용접용 가죽장갑, 안전화' }
];

const defaultPpeOptions = ['안전모', '안전화', '보안경', '방진/방독마스크', '귀마개/귀덮개', '내화학장갑'];

function getAdminPassword() {
    return localStorage.getItem('esol_admin_password') || '1234';
}

function checkPassword() {
    const currentPass = getAdminPassword();
    const inputPass = document.getElementById('adminPw').value.trim();

    if (inputPass === currentPass) {
        document.getElementById('loginModal').style.display = 'none';
        loadAdminMenuList();
        loadAdminTextSettings();
        loadAdminNoticeList();
        loadAdminPpeSection();
        loadAdminUserList();
        loadAdminMsdsList();
        loadAdminDriList(1);
    } else {
        alert('비밀번호가 올바르지 않습니다.');
    }
}

function changeAdminPassword() {
    const newPw = document.getElementById('newAdminPwInput').value.trim();
    if (!newPw) return alert('새로운 비밀번호를 입력하세요.');
    localStorage.setItem('esol_admin_password', newPw);
    document.getElementById('newAdminPwInput').value = '';
    alert('비밀번호가 변경되었습니다.');
}

// ============================================
// 🚨 DRI 관리 연동 (날짜는 최신순, 같은 날짜 안에서는 처음 등록한 순서대로 위에서부터!)
// ============================================
async function submitDri() {
    const date = document.getElementById('driDate').value;
    const dept = document.getElementById('driDept').value.trim();
    const location = document.getElementById('driLocation').value.trim();
    const time = document.getElementById('driTime').value.trim();
    const task = document.getElementById('driTask').value.trim();
    const risk = document.getElementById('driRisk').value.trim();
    const measure = document.getElementById('driMeasure').value.trim();

    if (!date || !dept || !location || !task || !risk || !measure) {
        return alert('모든 DRI 항목을 빠짐없이 입력해 주세요.');
    }

    const db = await fetchAdminDB();
    let list = db['esol_dri_data'] ? JSON.parse(db['esol_dri_data']) : [];
    
    // 데이터를 배열에 넣습니다. (어차피 정렬할 거라서 push 사용)
    list.push({ id: Date.now(), date, dept, location, time, task, risk, measure });
    
    // 💡 핵심 정렬 로직 (이것 때문에 순서가 완벽해집니다)
    list.sort((a, b) => {
        if (a.date === b.date) {
            return a.id - b.id; // 같은 날짜인 경우: 먼저 등록한 것(id가 작은 것)이 위로 오게 고정 (오름차순)
        }
        return new Date(b.date) - new Date(a.date); // 날짜가 다를 경우: 최신 날짜가 무조건 위로 오게 (내림차순)
    });
    
    await saveAdminDB('esol_dri_data', list);
    
    document.getElementById('driLocation').value = '';
    document.getElementById('driTime').value = '';
    document.getElementById('driTask').value = '';
    document.getElementById('driRisk').value = '';
    document.getElementById('driMeasure').value = '';
    
    alert('위험작업(DRI)이 등록되었습니다!');
    document.getElementById('driLocation').focus();
    loadAdminDriList(1);
}

let adminDriCurrentPage = 1;
const adminDriPerPage = 5;

async function loadAdminDriList(page = 1) {
    adminDriCurrentPage = page;
    const db = await fetchAdminDB();
    let list = db['esol_dri_data'] ? JSON.parse(db['esol_dri_data']) : [];
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    list = list.filter(d => new Date(d.date) >= oneYearAgo);

    // 💡 화면에 렌더링할 때도 동일한 정렬 규칙을 강제로 먹여서 그립니다.
    list.sort((a, b) => {
        if (a.date === b.date) {
            return a.id - b.id; 
        }
        return new Date(b.date) - new Date(a.date); 
    });

    const container = document.getElementById('adminDriAccordionContainer');
    const paginationContainer = document.getElementById('adminDriPagination');
    
    if (list.length === 0) { 
        container.innerHTML = `<div style="text-align:center; color:#999; padding:25px; background:#fff; border-radius:8px; border:1px solid #ddd;">최근 1년간 등록된 DRI가 없습니다.</div>`; 
        paginationContainer.innerHTML = '';
        return; 
    }

    const grouped = {};
    list.forEach(d => {
        if(!grouped[d.date]) grouped[d.date] = [];
        grouped[d.date].push(d); // 여기서 쏙쏙 담길 때 이미 정렬된 순서대로 담깁니다.
    });

    const sortedDates = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a));
    const totalPages = Math.ceil(sortedDates.length / adminDriPerPage);
    
    if (adminDriCurrentPage > totalPages) adminDriCurrentPage = totalPages;
    if (adminDriCurrentPage < 1) adminDriCurrentPage = 1;

    const startIndex = (adminDriCurrentPage - 1) * adminDriPerPage;
    const currentDates = sortedDates.slice(startIndex, startIndex + adminDriPerPage);

    container.innerHTML = currentDates.map((date, index) => {
        const isExpanded = (index === 0 && adminDriCurrentPage === 1);
        const items = grouped[date];
        const activeItems = items.filter(d => d.task && d.task.trim() !== '없음');
        const noneItems = items.filter(d => !d.task || d.task.trim() === '없음');

        return `
            <div style="margin-bottom:12px; border:2px solid ${isExpanded ? '#b0268d' : '#eae2f0'}; border-radius:12px; overflow:hidden; background:#fff;">
                <div style="background:${isExpanded ? '#f8f5fc' : '#faf8fc'}; padding:16px 20px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="toggleAdminDriDate('${date}')">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h4 style="color:${isExpanded ? '#b0268d' : '#4a0082'}; font-size:16px; margin:0;">📅 ${date} 등록 내역</h4>
                        <span style="background:#e0e0e0; color:#555; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold;">총 ${items.length}건</span>
                    </div>
                    <span id="admin-icon-${date}" style="font-size:14px; font-weight:bold; color:#888;">${isExpanded ? '▲ 접기' : '▼ 펴기'}</span>
                </div>
                
                <div id="admin-table-${date}" style="display:${isExpanded ? 'block' : 'none'}; padding:20px; border-top:1px solid #eae2f0;">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 10%;">부서</th>
                                <th style="width: 12%;">장소(설비)</th>
                                <th style="width: 10%;">작업시간</th>
                                <th style="width: 20%;">작업 내용</th>
                                <th style="width: 18%;">위험 요소</th>
                                <th style="width: 18%;">안전 대책</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeItems.map(d => {
                                const riskTags = d.risk ? d.risk.split(/[,\n]+/).map(t => t.trim()).filter(t => t && t !== '없음').map(t => `<div style="background:#ffebee; color:#c62828; padding:3px 6px; border-radius:4px; margin-bottom:3px; font-size:12px; display:inline-block; border:1px solid #ffcdd2; margin-right:3px;">${t}</div>`).join('') : '';
                                const measureTags = d.measure ? d.measure.split(/[,\n]+/).map(t => t.trim()).filter(t => t && t !== '없음').map(t => `<div style="background:#e3f2fd; color:#1565c0; padding:3px 6px; border-radius:4px; margin-bottom:3px; font-size:12px; display:inline-block; border:1px solid #bbdefb; margin-right:3px;">${t}</div>`).join('') : '';

                                return `
                                    <tr style="background-color: #fff; border-bottom: 1px solid #eee;">
                                        <td style="vertical-align:top;"><strong>${d.dept}</strong></td>
                                        <td style="vertical-align:top;">${d.location || '-'}</td>
                                        <td style="vertical-align:top; color:#555;">${d.time || '-'}</td>
                                        <td style="vertical-align:top; line-height:1.5;">${d.task.replace(/\n/g, '<br>')}</td>
                                        <td style="vertical-align:top;">${riskTags || '<span style="color:#999; font-style:italic;">N/A</span>'}</td>
                                        <td style="vertical-align:top;">${measureTags || '<span style="color:#999; font-style:italic;">N/A</span>'}</td>
                                        <td style="vertical-align:top;"><button class="btn-sm btn-del" onclick="deleteDri(${d.id})">🗑️ 삭제</button></td>
                                    </tr>
                                `;
                            }).join('')}
                            ${noneItems.length > 0 ? `
                                <tr>
                                    <td colspan="7" style="background:#fafafa; color:#777; padding:10px; font-size:13px; text-align:left;">
                                        💤 <strong>특이사항(작업) 없음 부서:</strong> ${noneItems.map(n => n.dept).join(', ')}
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    let pageHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        pageHtml += `
            <button onclick="loadAdminDriList(${i})" style="padding:6px 12px; border:1px solid #4a0082; background:${i === adminDriCurrentPage ? '#4a0082' : '#fff'}; color:${i === adminDriCurrentPage ? '#fff' : '#4a0082'}; border-radius:6px; cursor:pointer; font-weight:bold;">
                ${i}
            </button>
        `;
    }
    paginationContainer.innerHTML = pageHtml;
}

function toggleAdminDriDate(date) {
    const tableDiv = document.getElementById(`admin-table-${date}`);
    const icon = document.getElementById(`admin-icon-${date}`);
    if(tableDiv.style.display === 'none') {
        tableDiv.style.display = 'block';
        icon.innerText = '▲ 접기';
    } else {
        tableDiv.style.display = 'none';
        icon.innerText = '▼ 펴기';
    }
}

async function deleteDri(id) {
    if (!confirm('해당 위험작업 기록을 삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let list = db['esol_dri_data'] ? JSON.parse(db['esol_dri_data']) : [];
    list = list.filter(d => d.id !== id);
    await saveAdminDB('esol_dri_data', list);
    loadAdminDriList(1);
}

// ============================================
// 🛠️ 메뉴 관리 연동
// ============================================
async function loadAdminMenuList() {
    const db = await fetchAdminDB();
    let menus = db['esol_menu_structure'];
    menus = menus ? JSON.parse(menus) : defaultMenus;
    
    const tbody = document.getElementById('adminMenuListBody');
    let html = '';
    for (const catKey in menus) {
        const list = menus[catKey] || [];
        list.forEach((menu, index) => {
            html += `
            <tr>
                <td><strong>${catKey}</strong></td>
                <td style="text-align:center;"><span style="font-size:20px;">${menu.icon || '📄'}</span></td>
                <td><strong>${menu.title}</strong></td>
                <td><span style="color:#666; font-size:13px;">${menu.desc || '-'}</span></td>
                <td>
                    <button class="btn-sm btn-move" onclick="moveOrder('${catKey}', ${index}, -1)">▲</button>
                    <button class="btn-sm btn-move" onclick="moveOrder('${catKey}', ${index}, 1)">▼</button>
                </td>
                <td>
                    <select onchange="moveMenuCategory('${catKey}', ${index}, this.value)">
                        <option value="안전" ${catKey==='안전'?'selected':''}>안전</option>
                        <option value="보건" ${catKey==='보건'?'selected':''}>보건</option>
                        <option value="환경" ${catKey==='환경'?'selected':''}>환경</option>
                        <option value="교육" ${catKey==='교육'?'selected':''}>교육</option>
                        <option value="기타" ${catKey==='기타'?'selected':''}>기타</option>
                    </select>
                </td>
                <td>
                    <button class="btn-sm btn-edit" onclick="editMenuItem('${catKey}', ${index})">수정</button>
                    <button class="btn-sm btn-del" onclick="deleteMenu('${catKey}', ${index})">삭제</button>
                </td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;
}

async function editMenuItem(cat, index) {
    const db = await fetchAdminDB();
    const menus = db['esol_menu_structure'] ? JSON.parse(db['esol_menu_structure']) : defaultMenus;
    const target = menus[cat][index];
    
    document.getElementById('editMenuCat').value = cat;
    document.getElementById('editMenuIndex').value = index;
    
    document.getElementById('editMenuIcon').value = target.icon || '📄';
    document.getElementById('editMenuTitleInput').value = target.title;
    document.getElementById('editMenuDescInput').value = target.desc || '';
    
    document.getElementById('menuEditModal').style.display = 'flex';
}

function closeMenuEditModal() {
    document.getElementById('menuEditModal').style.display = 'none';
}

async function saveMenuEditModal() {
    const cat = document.getElementById('editMenuCat').value;
    const index = parseInt(document.getElementById('editMenuIndex').value, 10);
    
    const newIcon = document.getElementById('editMenuIcon').value;
    const newTitle = document.getElementById('editMenuTitleInput').value.trim();
    const newDesc = document.getElementById('editMenuDescInput').value.trim();
    
    if (!newTitle) return alert('메뉴 이름을 입력해 주세요.');
    
    const db = await fetchAdminDB();
    const menus = db['esol_menu_structure'] ? JSON.parse(db['esol_menu_structure']) : defaultMenus;
    
    menus[cat][index].icon = newIcon;
    menus[cat][index].title = newTitle;
    menus[cat][index].desc = newDesc;
    
    await saveAdminDB('esol_menu_structure', menus);
    closeMenuEditModal();
    alert('메뉴 정보가 성공적으로 수정되었습니다.');
    loadAdminMenuList();
}

async function moveOrder(cat, index, dir) {
    const db = await fetchAdminDB();
    const menus = db['esol_menu_structure'] ? JSON.parse(db['esol_menu_structure']) : defaultMenus;
    
    const t = index + dir;
    if (t >= 0 && t < menus[cat].length) {
        const temp = menus[cat][index];
        menus[cat][index] = menus[cat][t];
        menus[cat][t] = temp;
        await saveAdminDB('esol_menu_structure', menus);
        loadAdminMenuList();
    }
}

async function addNewMenu() {
    const c = document.getElementById('addCategorySelect').value;
    const icon = document.getElementById('addMenuIcon').value; 
    const t = document.getElementById('addMenuTitle').value.trim();
    const desc = document.getElementById('addMenuDesc').value.trim();
    
    if (t) {
        const db = await fetchAdminDB();
        const menus = db['esol_menu_structure'] ? JSON.parse(db['esol_menu_structure']) : defaultMenus;
        
        if (!menus[c]) menus[c] = [];
        menus[c].push({title: t, desc: desc, icon: icon}); 
        
        await saveAdminDB('esol_menu_structure', menus);
        document.getElementById('addMenuTitle').value = '';
        document.getElementById('addMenuDesc').value = '';
        alert('새로운 메뉴가 추가되었습니다.');
        loadAdminMenuList();
    } else {
        alert('메뉴 이름을 입력해 주세요.');
    }
}

async function moveMenuCategory(f, i, t) {
    const db = await fetchAdminDB();
    const menus = db['esol_menu_structure'] ? JSON.parse(db['esol_menu_structure']) : defaultMenus;
    
    const item = menus[f].splice(i, 1)[0];
    if (!menus[t]) menus[t] = [];
    menus[t].push(item);
    
    await saveAdminDB('esol_menu_structure', menus);
    loadAdminMenuList();
}

async function deleteMenu(c, i) {
    if (confirm('삭제하시겠습니까?')) {
        const db = await fetchAdminDB();
        const menus = db['esol_menu_structure'] ? JSON.parse(db['esol_menu_structure']) : defaultMenus;
        menus[c].splice(i, 1);
        await saveAdminDB('esol_menu_structure', menus);
        loadAdminMenuList();
    }
}

// ============================================
// 📢 공지사항 관리 연동
// ============================================
async function adminSubmitNotice() {
    const tag = document.getElementById('adminNoticeTag').value;
    const title = document.getElementById('adminNoticeTitle').value.trim();
    const writer = document.getElementById('adminNoticeWriter').value.trim();
    const content = document.getElementById('adminNoticeContent').value.trim();

    if (!title || !content) return alert('제목과 본문을 작성해 주세요.');

    const db = await fetchAdminDB();
    const list = db['esol_notices'] ? JSON.parse(db['esol_notices']) : defaultNotices;
    
    const dateStr = new Date().toISOString().split('T')[0];
    list.unshift({ id: Date.now(), tag, title, writer: writer || '환경안전팀', content, date: dateStr });
    
    await saveAdminDB('esol_notices', list);
    
    document.getElementById('adminNoticeTitle').value = '';
    document.getElementById('adminNoticeWriter').value = '';
    document.getElementById('adminNoticeContent').value = '';
    alert('등록되었습니다.');
    loadAdminNoticeList();
}

async function loadAdminNoticeList() {
    const db = await fetchAdminDB();
    const list = db['esol_notices'] ? JSON.parse(db['esol_notices']) : defaultNotices;
    const tbody = document.getElementById('adminNoticeListBody');
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding:25px;">공지사항이 없습니다.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map(n => `
        <tr>
            <td><span style="background:#b0268d; color:#fff; padding:3px 8px; border-radius:10px; font-size:12px;">${n.tag || '공지'}</span></td>
            <td><strong>${n.title}</strong></td>
            <td>${n.writer || '관리자'}</td>
            <td>${n.date}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="editNotice(${n.id})">수정</button>
                <button class="btn-sm btn-del" onclick="deleteNotice(${n.id})">삭제</button>
            </td>
        </tr>
    `).join('');
}

async function editNotice(id) {
    const db = await fetchAdminDB();
    const list = db['esol_notices'] ? JSON.parse(db['esol_notices']) : defaultNotices;
    const target = list.find(n => n.id === id);
    if (!target) return;
    
    const newTitle = prompt('수정 제목:', target.title);
    if (!newTitle) return;
    
    const newContent = prompt('수정 본문:', target.content);
    if (!newContent) return;
    
    target.title = newTitle;
    target.content = newContent;
    await saveAdminDB('esol_notices', list);
    alert('수정되었습니다.');
    loadAdminNoticeList();
}

async function deleteNotice(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let list = db['esol_notices'] ? JSON.parse(db['esol_notices']) : defaultNotices;
    list = list.filter(n => n.id !== id);
    await saveAdminDB('esol_notices', list);
    loadAdminNoticeList();
}

// ============================================
// 🥽 보호구 설정 관리 연동
// ============================================
function loadAdminPpeSection() {
    loadPpeGuides();
    loadPpeOptions();
    loadAdminPpeList();
}

async function loadPpeGuides() {
    const db = await fetchAdminDB();
    const guides = db['esol_ppe_guides'] ? JSON.parse(db['esol_ppe_guides']) : defaultPpeGuides;
    const tbody = document.getElementById('adminPpeGuideBody');
    
    tbody.innerHTML = guides.map((g, idx) => `
        <tr>
            <td><strong>${g.process}</strong></td>
            <td>${g.items}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="openPpeGuideModal(${idx})">수정</button>
                <button class="btn-sm btn-del" onclick="deletePpeGuide(${idx})">삭제</button>
            </td>
        </tr>
    `).join('');
}

async function openPpeGuideModal(idx = -1) {
    const db = await fetchAdminDB();
    const guides = db['esol_ppe_guides'] ? JSON.parse(db['esol_ppe_guides']) : defaultPpeGuides;
    document.getElementById('editPpeGuideIndex').value = idx;
    
    if (idx === -1) {
        document.getElementById('ppeGuideModalTitle').innerText = '📌 신규 공정 지침 추가';
        document.getElementById('editPpeProcessInput').value = '';
        document.getElementById('editPpeItemsInput').value = '';
    } else {
        document.getElementById('ppeGuideModalTitle').innerText = '📌 공정 지침 편집';
        document.getElementById('editPpeProcessInput').value = guides[idx].process;
        document.getElementById('editPpeItemsInput').value = guides[idx].items;
    }
    document.getElementById('ppeGuideEditModal').style.display = 'flex';
}

function closePpeGuideModal() {
    document.getElementById('ppeGuideEditModal').style.display = 'none';
}

async function savePpeGuideModal() {
    const idx = parseInt(document.getElementById('editPpeGuideIndex').value, 10);
    const process = document.getElementById('editPpeProcessInput').value.trim();
    const items = document.getElementById('editPpeItemsInput').value.trim();
    
    if (!process || !items) return alert('입력해 주세요.');
    
    const db = await fetchAdminDB();
    let guides = db['esol_ppe_guides'] ? JSON.parse(db['esol_ppe_guides']) : defaultPpeGuides;
    
    if (idx === -1) {
        guides.push({ process, items });
    } else {
        guides[idx] = { process, items };
    }
    
    await saveAdminDB('esol_ppe_guides', guides);
    closePpeGuideModal();
    loadPpeGuides();
    alert('저장되었습니다.');
}

async function deletePpeGuide(idx) {
    if (!confirm('삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let guides = db['esol_ppe_guides'] ? JSON.parse(db['esol_ppe_guides']) : defaultPpeGuides;
    guides.splice(idx, 1);
    await saveAdminDB('esol_ppe_guides', guides);
    loadPpeGuides();
}

async function loadPpeOptions() {
    const db = await fetchAdminDB();
    const options = db['esol_ppe_options'] ? JSON.parse(db['esol_ppe_options']) : defaultPpeOptions;
    
    document.getElementById('adminPpeOptionTags').innerHTML = options.map((opt, idx) => `
        <span style="background:#f0e6f6; border:1px solid #b0268d; color:#4a0082; padding:6px 12px; border-radius:20px; font-size:13px;">
            ${opt} 
            <button onclick="removePpeOption(${idx})" style="border:none; background:none; color:#e53935; cursor:pointer;">✕</button>
        </span>
    `).join('');
}

async function addPpeOption() {
    const val = document.getElementById('newPpeOptionInput').value.trim();
    if (!val) return;
    
    const db = await fetchAdminDB();
    const options = db['esol_ppe_options'] ? JSON.parse(db['esol_ppe_options']) : defaultPpeOptions;
    options.push(val);
    
    await saveAdminDB('esol_ppe_options', options);
    document.getElementById('newPpeOptionInput').value = '';
    loadPpeOptions();
}

async function removePpeOption(idx) {
    const db = await fetchAdminDB();
    let options = db['esol_ppe_options'] ? JSON.parse(db['esol_ppe_options']) : defaultPpeOptions;
    options.splice(idx, 1);
    await saveAdminDB('esol_ppe_options', options);
    loadPpeOptions();
}

async function loadAdminPpeList() {
    const db = await fetchAdminDB();
    const requests = db['esol_ppe_requests'] ? JSON.parse(db['esol_ppe_requests']) : [];
    const tbody = document.getElementById('adminPpeListBody');
    
    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#999; padding:25px;">내역이 없습니다.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = requests.map(r => `
        <tr>
            <td>${r.date}</td>
            <td><strong>${r.dept} ${r.name}</strong></td>
            <td><span style="color:#b0268d;">${r.type}</span></td>
            <td>${r.purpose}</td>
            <td>${r.status}</td>
            <td>${r.signature ? '서명됨' : '미서명'}</td>
            <td>
                <button class="btn-sm btn-del" onclick="deletePpeRequest(${r.id})">삭제</button>
            </td>
        </tr>
    `).join('');
}

async function deletePpeRequest(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let requests = db['esol_ppe_requests'] ? JSON.parse(db['esol_ppe_requests']) : [];
    requests = requests.filter(r => r.id !== id);
    await saveAdminDB('esol_ppe_requests', requests);
    loadAdminPpeList();
}

// ============================================
// 👤 계정 관리 연동
// ============================================
async function registerUserAccount() {
    const dept = document.getElementById('newUserDept').value.trim();
    const name = document.getElementById('newUserName').value.trim();
    const empNo = document.getElementById('newUserEmpNo').value.trim();
    const pw = document.getElementById('newUserPw').value.trim();
    
    if (!dept || !name || !empNo || !pw) return alert('입력해 주세요.');
    
    const db = await fetchAdminDB();
    const users = db['esol_registered_users'] ? JSON.parse(db['esol_registered_users']) : [];
    if (users.find(u => u.name === name)) return alert('이미 등록된 성명입니다.');
    
    users.push({ id: Date.now(), dept, name, empNo, pw });
    await saveAdminDB('esol_registered_users', users);
    alert('등록되었습니다.');
    loadAdminUserList();
}

async function loadAdminUserList() {
    const db = await fetchAdminDB();
    const users = db['esol_registered_users'] ? JSON.parse(db['esol_registered_users']) : [];
    const tbody = document.getElementById('adminUserListBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding:25px;">계정이 없습니다.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.dept}</strong></td>
            <td>${u.name}</td>
            <td>${u.empNo}</td>
            <td><code>${u.pw}</code></td>
            <td>
                <button class="btn-sm btn-del" onclick="deleteUserAccount(${u.id})">삭제</button>
            </td>
        </tr>
    `).join('');
}

async function deleteUserAccount(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let users = db['esol_registered_users'] ? JSON.parse(db['esol_registered_users']) : [];
    users = users.filter(u => u.id !== id);
    await saveAdminDB('esol_registered_users', users);
    loadAdminUserList();
}

// ============================================
// 🧪 MSDS 관리 연동
// ============================================
async function uploadMsds() {
    const name = document.getElementById('msdsName').value.trim();
    const cas = document.getElementById('msdsCas').value.trim();
    const supplier = document.getElementById('msdsSupplier').value.trim();
    const tagsInput = document.getElementById('msdsTags').value.trim();
    const fileInput = document.getElementById('msdsFile');
    
    if (!name || !cas || fileInput.files.length === 0) return alert('필수 항목을 입력하세요.');
    
    const btn = document.getElementById('msdsSubmitBtn');
    btn.innerText = '업로드 중...';
    btn.disabled = true;
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        
        if (uploadData.error) throw new Error(uploadData.error);
        
        const tagsArray = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
        const newMsds = { id: Date.now(), name: name, cas: cas, supplier: supplier, tags: tagsArray, fileUrl: uploadData.fileUrl };
        
        const db = await fetchAdminDB();
        let existingData = db['esol_msds_data'] ? JSON.parse(db['esol_msds_data']) : [];
        existingData.push(newMsds);
        await saveAdminDB('esol_msds_data', existingData);
        
        // 일반 문서실에도 MSDS 추가
        let allDocs = db['esol_safety_docs_v2'] ? JSON.parse(db['esol_safety_docs_v2']) : {};
        if (!allDocs['MSDS 자료실']) allDocs['MSDS 자료실'] = []; 
        
        allDocs['MSDS 자료실'].unshift({
            id: newMsds.id,
            title: name + ' (' + cas + ') MSDS',
            fileUrl: uploadData.fileUrl,
            date: new Date().toISOString().split('T')[0]
        });
        await saveAdminDB('esol_safety_docs_v2', allDocs);
        
        alert('등록되었습니다!');
        loadAdminMsdsList();
    } catch (err) {
        alert('업로드 실패');
    } finally {
        btn.innerText = '+ MSDS 등록하기';
        btn.disabled = false;
        
        // 입력창 초기화
        document.getElementById('msdsName').value = '';
        document.getElementById('msdsCas').value = '';
        document.getElementById('msdsSupplier').value = '';
        document.getElementById('msdsTags').value = '';
        document.getElementById('msdsFile').value = '';
    }
}

async function loadAdminMsdsList() {
    const db = await fetchAdminDB();
    const list = db['esol_msds_data'] ? JSON.parse(db['esol_msds_data']) : [];
    const tbody = document.getElementById('adminMsdsListBody');
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding:25px;">등록된 MSDS 자료가 없습니다.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = list.map(m => `
        <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.cas}</td>
            <td>${m.supplier || '-'}</td>
            <td>${m.tags.join(', ')}</td>
            <td>
                <button class="btn-sm btn-del" onclick="deleteMsds(${m.id})">삭제</button>
            </td>
        </tr>
    `).join('');
}

async function deleteMsds(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let list = db['esol_msds_data'] ? JSON.parse(db['esol_msds_data']) : [];
    list = list.filter(m => m.id !== id);
    await saveAdminDB('esol_msds_data', list);
    loadAdminMsdsList();
}

// ============================================
// ✏️ 시스템 설정 관리 연동
// ============================================
async function loadAdminTextSettings() {
    const db = await fetchAdminDB();
    const savedText = db['esol_site_texts'];
    if (savedText) {
        const config = JSON.parse(savedText);
        if (config.title) document.getElementById('siteTitleInput').value = config.title;
        if (config.subText) document.getElementById('siteSubTextInput').value = config.subText;
    }
}

async function saveTextSettings() {
    const titleVal = document.getElementById('siteTitleInput').value.trim();
    const subTextVal = document.getElementById('siteSubTextInput').value.trim();
    if (!titleVal) return alert('대표 제목을 입력해 주세요.');
    const config = { title: titleVal, subText: subTextVal };
    await saveAdminDB('esol_site_texts', config);
    alert('저장되었습니다.');
}
// ============================================
// ⚖️ 6. 산안법령 요지 관리 DB 연동
// ============================================
async function renderAdminLaw() {
    const db = await fetchAdminDB();
    const savedText = db['esol_law_text'];
    if (savedText) {
        const textInfo = JSON.parse(savedText);
        document.getElementById('lawTitleInput').value = textInfo.title || ''; 
        document.getElementById('lawDescInput').value = textInfo.desc || '';
    }
    const list = db['esol_law_history'] ? JSON.parse(db['esol_law_history']) : [];
    const tbody = document.getElementById('adminLawHistoryBody');
    if (list.length === 0) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:#888;">등록된 산안법령 이력이 없습니다.</td></tr>`;
    tbody.innerHTML = list.map(m => `<tr><td style="font-weight:bold;">${m.title}</td><td>${m.date}</td><td style="color:#1976d2; font-size:12px;">${m.fileName}</td><td style="text-align:center;"><button class="submit-btn" style="background:#d32f2f; padding:5px 10px; font-size:12px;" onclick="deleteLawRevision('${m.id}')">삭제</button></td></tr>`).join('');
}
async function saveLawText() {
    const title = document.getElementById('lawTitleInput').value.trim();
    const desc = document.getElementById('lawDescInput').value.trim();
    await saveAdminDB('esol_law_text', { title, desc }); alert('저장 완료');
}
async function uploadLawRevision() {
    const title = document.getElementById('lawRevTitle').value.trim();
    const date = document.getElementById('lawRevDate').value;
    const fileInput = document.getElementById('lawRevFile');
    if (!title || !date || !fileInput.files.length) return alert('모두 입력해주세요.');
    const file = fileInput.files[0];
    try {
        const base64Data = await readAsDataURL(file);
        const db = await fetchAdminDB();
        const list = db['esol_law_history'] ? JSON.parse(db['esol_law_history']) : [];
        list.unshift({ id: Date.now().toString(), title, date, fileName: file.name, fileUrl: base64Data, type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image' });
        await saveAdminDB('esol_law_history', list); alert('✅ 등록 완료');
        document.getElementById('lawRevTitle').value = ''; document.getElementById('lawRevDate').value = ''; fileInput.value = ''; renderAdminLaw();
    } catch (err) { alert('업로드 에러 발생'); }
}
async function deleteLawRevision(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    const db = await fetchAdminDB();
    let list = db['esol_law_history'] ? JSON.parse(db['esol_law_history']) : [];
    list = list.filter(m => m.id !== id); await saveAdminDB('esol_law_history', list); renderAdminLaw();
}
// ==========================================
// ⚠️ 탭14: 위험성평가 관리 (부서 및 자료 연동)
// ==========================================

// 1. 위험성평가 화면 및 테이블 렌더링
async function renderAdminRisk() {
    const db = await fetchAdminDB(); // 외부 JS용 통신 함수
    
    // 부서 목록 로드 및 태그 생성
    const savedDepts = db['esol_risk_depts']; 
    let depts = savedDepts ? JSON.parse(savedDepts) : [];
    
    const tagsContainer = document.getElementById('adminRiskDeptTags');
    if (tagsContainer) {
        tagsContainer.innerHTML = depts.map(d => 
            `<span style="background:#ffe0b2; border:1px solid #f57c00; color:#e65100; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:bold;">
                ${d} <button onclick="deleteRiskDept('${d}')" style="border:none; background:none; color:#d32f2f; cursor:pointer;">✕</button>
            </span>`
        ).join('');
    }
    
    // Select 박스 옵션 채우기
    const deptSelect = document.getElementById('riskRevDept');
    if (deptSelect) {
        let deptOptions = depts.map(d => `<option value="${d}">${d}</option>`).join('');
        if(depts.length === 0) deptOptions = `<option value="">부서를 먼저 추가하세요</option>`;
        deptSelect.innerHTML = deptOptions;
    }

    // 등록된 자료 목록 로드
    const list = db['esol_risk_history'] ? JSON.parse(db['esol_risk_history']) : [];
    const tbody = document.getElementById('adminRiskHistoryBody');
    if (!tbody) return;
    
    if (list.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:15px; color:#888;">등록된 위험성평가 이력이 없습니다.</td></tr>`;
    }
    
    tbody.innerHTML = list.map(m => {
        let fileCount = 0; 
        if (m.files && m.files.length > 0) fileCount = m.files.length; 
        else if (m.fileUrl) fileCount = 1;

        const periodStr = (m.periodStart && m.periodEnd) ? `${m.periodStart} ~ ${m.periodEnd}` : '-';
        
        return `
            <tr>
                <td style="color:#e65100; font-weight:bold;">${m.dept}</td>
                <td style="font-weight:bold;">${m.title}</td>
                <td style="color:#555; font-size:13px;">${periodStr}</td>
                <td>${m.date}</td>
                <td style="color:#1976d2; font-size:12px;">첨부 ${fileCount}건</td>
                <td style="text-align:center;">
                    <button class="submit-btn" style="background:#d32f2f; padding:5px 10px; font-size:12px;" onclick="deleteRiskRevision('${m.id}')">삭제</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 2. 신규 부서 추가
async function addRiskDept() {
    const val = document.getElementById('newRiskDeptInput').value.trim(); 
    if (!val) return;

    const db = await fetchAdminDB(); 
    const depts = db['esol_risk_depts'] ? JSON.parse(db['esol_risk_depts']) : [];
    if(depts.includes(val)) return alert('이미 존재하는 부서입니다.');
    
    depts.push(val); 
    await saveAdminDB('esol_risk_depts', depts); 
    document.getElementById('newRiskDeptInput').value = ''; 
    renderAdminRisk();
}

// 3. 부서 삭제
async function deleteRiskDept(dept) {
    if (!confirm(`'${dept}' 부서를 삭제하시겠습니까? (기존에 업로드된 게시글은 삭제되지 않습니다)`)) return;
    
    const db = await fetchAdminDB(); 
    let depts = db['esol_risk_depts'] ? JSON.parse(db['esol_risk_depts']) : [];
    depts = depts.filter(d => d !== dept); 
    
    await saveAdminDB('esol_risk_depts', depts); 
    renderAdminRisk();
}

// 4. 신규 자료 업로드 (다중 파일 지원)
async function uploadRiskRevision() {
    const dept = document.getElementById('riskRevDept').value; 
    const title = document.getElementById('riskRevTitle').value.trim(); 
    const date = document.getElementById('riskRevDate').value; 
    const periodStart = document.getElementById('riskPeriodStart').value; 
    const periodEnd = document.getElementById('riskPeriodEnd').value; 
    const fileInput = document.getElementById('riskRevFile');
    
    if (!dept || !title || !date || !periodStart || !periodEnd || !fileInput.files.length) {
        return alert('부서, 제목, 일자, 평가기간 및 첨부파일을 모두 입력/선택해주세요.');
    }

    const readAsDataURL_multi = (file) => new Promise((resolve, reject) => { 
        const reader = new FileReader(); 
        reader.onload = (e) => resolve({ fileName: file.name, fileUrl: e.target.result }); 
        reader.onerror = (e) => reject(e); 
        reader.readAsDataURL(file); 
    });

    try { 
        const filesData = await Promise.all(Array.from(fileInput.files).map(f => readAsDataURL_multi(f))); 
        const db = await fetchAdminDB(); 
        const list = db['esol_risk_history'] ? JSON.parse(db['esol_risk_history']) : []; 
        
        list.unshift({ 
            id: Date.now().toString(), 
            dept, 
            title, 
            date, 
            periodStart, 
            periodEnd, 
            files: filesData 
        }); 
        
        await saveAdminDB('esol_risk_history', list); 
        alert('✅ 위험성평가 자료가 성공적으로 등록되었습니다.'); 
        
        document.getElementById('riskRevTitle').value = ''; 
        document.getElementById('riskRevDate').value = ''; 
        document.getElementById('riskPeriodStart').value = ''; 
        document.getElementById('riskPeriodEnd').value = ''; 
        fileInput.value = ''; 
        
        renderAdminRisk(); 
    } catch (err) { 
        alert('파일 업로드 중 에러가 발생했습니다.'); 
    }
}

// 5. 등록된 자료 삭제
async function deleteRiskRevision(id) {
    if (!confirm('해당 자료를 완전히 삭제하시겠습니까?')) return;
    
    const db = await fetchAdminDB(); 
    let list = db['esol_risk_history'] ? JSON.parse(db['esol_risk_history']) : [];
    list = list.filter(m => m.id !== id); 
    
    await saveAdminDB('esol_risk_history', list); 
    renderAdminRisk();
}
// ==========================================
// 🪪 탭15: 안전인증서 관리 연동
// ==========================================
async function renderAdminCert() {
    const db = typeof fetchAdminDB === 'function' ? await fetchAdminDB() : await fetchDB();
    
    // 1. 카테고리 렌더링
    const savedCats = db['esol_cert_categories']; 
    let cats = savedCats ? JSON.parse(savedCats) : ['보호구', '방호장치', '기타'];
    
    const tagsContainer = document.getElementById('adminCertCatTags');
    if (tagsContainer) {
        tagsContainer.innerHTML = cats.map(c => 
            `<span style="background:#e0f7fa; border:1px solid #00838f; color:#006064; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:bold;">
                ${c} <button onclick="deleteCertCategory('${c}')" style="border:none; background:none; color:#d32f2f; cursor:pointer;">✕</button>
            </span>`
        ).join('');
    }
    
    // 2. Select 박스 렌더링
    const catSelect = document.getElementById('certRevCat');
    if (catSelect) {
        let catOptions = cats.map(c => `<option value="${c}">${c}</option>`).join('');
        if(cats.length === 0) catOptions = `<option value="">분류를 먼저 추가하세요</option>`;
        catSelect.innerHTML = catOptions;
    }

    // 3. 목록 렌더링
    const list = db['esol_cert_history'] ? JSON.parse(db['esol_cert_history']) : [];
    const tbody = document.getElementById('adminCertHistoryBody');
    if (!tbody) return;
    
    if (list.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:#888;">등록된 인증서 자료가 없습니다.</td></tr>`;
    }
    
    tbody.innerHTML = list.map(m => {
        let fileCount = m.files && m.files.length > 0 ? m.files.length : (m.fileUrl ? 1 : 0);
        return `
            <tr>
                <td style="color:#00838f; font-weight:bold;">${m.category}</td>
                <td style="font-weight:bold;">${m.title}</td>
                <td>${m.date}</td>
                <td style="color:#1976d2; font-size:12px;">첨부 ${fileCount}건</td>
                <td style="text-align:center;">
                    <button class="submit-btn" style="background:#ff9800; padding:5px 10px; font-size:12px;" onclick="openHistoryEditModal('esol_cert_history', '${m.id}')">수정</button>
                    <button class="submit-btn" style="background:#d32f2f; padding:5px 10px; font-size:12px;" onclick="deleteCertRevision('${m.id}')">삭제</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function addCertCategory() {
    const val = document.getElementById('newCertCatInput').value.trim(); 
    if (!val) return;
    const db = typeof fetchAdminDB === 'function' ? await fetchAdminDB() : await fetchDB(); 
    let cats = db['esol_cert_categories'] ? JSON.parse(db['esol_cert_categories']) : ['보호구', '방호장치', '기타'];
    if(cats.includes(val)) return alert('이미 존재하는 분류입니다.');
    cats.push(val); 
    const saveFunc = typeof saveAdminDB === 'function' ? saveAdminDB : saveDB;
    await saveFunc('esol_cert_categories', cats); 
    document.getElementById('newCertCatInput').value = ''; 
    renderAdminCert();
}

async function deleteCertCategory(cat) {
    if (!confirm(`'${cat}' 분류를 삭제하시겠습니까? (기존 자료는 삭제되지 않습니다)`)) return;
    const db = typeof fetchAdminDB === 'function' ? await fetchAdminDB() : await fetchDB(); 
    let cats = db['esol_cert_categories'] ? JSON.parse(db['esol_cert_categories']) : ['보호구', '방호장치', '기타'];
    cats = cats.filter(c => c !== cat); 
    const saveFunc = typeof saveAdminDB === 'function' ? saveAdminDB : saveDB;
    await saveFunc('esol_cert_categories', cats); 
    renderAdminCert();
}

async function uploadCertRevision() {
    const category = document.getElementById('certRevCat').value; 
    const title = document.getElementById('certRevTitle').value.trim(); 
    const date = document.getElementById('certRevDate').value; 
    const fileInput = document.getElementById('certRevFile');
    
    if (!category || !title || !date || !fileInput.files.length) {
        return alert('분류, 제목, 일자 및 첨부파일을 모두 입력해주세요.');
    }

    const readAsDataURL_multi = (file) => new Promise((resolve, reject) => { 
        const reader = new FileReader(); 
        reader.onload = (e) => resolve({ fileName: file.name, fileUrl: e.target.result }); 
        reader.onerror = (e) => reject(e); 
        reader.readAsDataURL(file); 
    });

    try { 
        const filesData = await Promise.all(Array.from(fileInput.files).map(f => readAsDataURL_multi(f))); 
        const db = typeof fetchAdminDB === 'function' ? await fetchAdminDB() : await fetchDB(); 
        const list = db['esol_cert_history'] ? JSON.parse(db['esol_cert_history']) : []; 
        
        list.unshift({ 
            id: Date.now().toString(), 
            category, title, date, 
            files: filesData 
        }); 
        
        const saveFunc = typeof saveAdminDB === 'function' ? saveAdminDB : saveDB;
        await saveFunc('esol_cert_history', list); 
        alert('✅ 안전인증서가 성공적으로 등록되었습니다.'); 
        
        document.getElementById('certRevTitle').value = ''; 
        document.getElementById('certRevDate').value = ''; 
        fileInput.value = ''; 
        
        renderAdminCert(); 
    } catch (err) { 
        alert('에러가 발생했습니다.'); 
    }
}

async function deleteCertRevision(id) {
    if (!confirm('해당 인증서를 삭제하시겠습니까?')) return;
    const db = typeof fetchAdminDB === 'function' ? await fetchAdminDB() : await fetchDB(); 
    let list = db['esol_cert_history'] ? JSON.parse(db['esol_cert_history']) : [];
    list = list.filter(m => m.id !== id); 
    const saveFunc = typeof saveAdminDB === 'function' ? saveAdminDB : saveDB;
    await saveFunc('esol_cert_history', list); 
    renderAdminCert();
}