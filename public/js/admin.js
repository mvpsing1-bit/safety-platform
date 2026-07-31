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
// 기존 로직 
// ============================================
document.getElementById('driDate').value = new Date().toISOString().split('T')[0];

const defaultMenus = {
    '안전': [
        { title: '안전보건 경영방침', desc: '대표이사 경영방침 및 목표', icon: '📜' },
        { title: '산안법령 요지', desc: '산업안전보건법 핵심 지침', icon: '⚖️' },
        { title: '안전보건 조직도', desc: '사내 안전관리 추진 체계', icon: '👥' },
        { title: '비상대응 매뉴얼', desc: '사고 발생 시 행동요령', icon: '🚨' },
        { title: '위험성평가표', desc: '공정별 위험요인 평가 내역', icon: '⚠️' },
        { title: '비상연락망', desc: '사내/사외 비상 연락처', icon: '📞' }
    ],
    '보건': [
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
        loadAdminDriList(1); // 페이지 1부터 로드
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

function getDriData() { 
    let list = JSON.parse(localStorage.getItem('esol_dri_data') || '[]'); 
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const filteredList = list.filter(d => new Date(d.date) >= oneYearAgo);
    if(filteredList.length !== list.length) {
        localStorage.setItem('esol_dri_data', JSON.stringify(filteredList));
    }
    return filteredList;
}

function saveDriData(data) { 
    localStorage.setItem('esol_dri_data', JSON.stringify(data)); 
    loadAdminDriList(1); 
}

function submitDri() {
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

    const list = getDriData();
    list.unshift({ id: Date.now(), date, dept, location, time, task, risk, measure });
    saveDriData(list);
    
    document.getElementById('driLocation').value = '';
    document.getElementById('driTime').value = '';
    document.getElementById('driTask').value = '';
    document.getElementById('driRisk').value = '';
    document.getElementById('driMeasure').value = '';
    
    alert('위험작업(DRI)이 등록되었습니다! \n(동일 부서 연속 등록을 위해 날짜와 부서는 지워지지 않습니다)');
    document.getElementById('driLocation').focus();
}

// 💡 [아코디언 및 페이지네이션 적용된 관리자 DRI 리스트]
let adminDriCurrentPage = 1;
const adminDriPerPage = 5; // 날짜 기준 5개씩 페이징

function loadAdminDriList(page = 1) {
    adminDriCurrentPage = page;
    const list = getDriData();
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
        grouped[d.date].push(d);
    });

    const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
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

    // 페이지네이션 버튼 렌더링
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

function deleteDri(id) {
    if (!confirm('해당 위험작업 기록을 삭제하시겠습니까?')) return;
    let list = getDriData();
    list = list.filter(d => d.id !== id);
    saveDriData(list);
}

function getMenus() {
    const saved = localStorage.getItem('esol_menu_structure');
    return saved ? JSON.parse(saved) : defaultMenus;
}

function saveMenus(menus) {
    localStorage.setItem('esol_menu_structure', JSON.stringify(menus));
    loadAdminMenuList();
}

function loadAdminMenuList() {
    const menus = getMenus();
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

function editMenuItem(cat, index) {
    const menus = getMenus();
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

function saveMenuEditModal() {
    const cat = document.getElementById('editMenuCat').value;
    const index = parseInt(document.getElementById('editMenuIndex').value, 10);
    
    const newIcon = document.getElementById('editMenuIcon').value;
    const newTitle = document.getElementById('editMenuTitleInput').value.trim();
    const newDesc = document.getElementById('editMenuDescInput').value.trim();
    
    if (!newTitle) return alert('메뉴 이름을 입력해 주세요.');
    
    const menus = getMenus();
    menus[cat][index].icon = newIcon;
    menus[cat][index].title = newTitle;
    menus[cat][index].desc = newDesc;
    
    saveMenus(menus);
    closeMenuEditModal();
    alert('메뉴 정보가 성공적으로 수정되었습니다.');
}

function moveOrder(cat, index, dir) {
    const m = getMenus();
    const t = index + dir;
    if (t >= 0 && t < m[cat].length) {
        const temp = m[cat][index];
        m[cat][index] = m[cat][t];
        m[cat][t] = temp;
        saveMenus(m);
    }
}

function addNewMenu() {
    const c = document.getElementById('addCategorySelect').value;
    const icon = document.getElementById('addMenuIcon').value; 
    const t = document.getElementById('addMenuTitle').value.trim();
    const desc = document.getElementById('addMenuDesc').value.trim();
    
    if (t) {
        const m = getMenus();
        if (!m[c]) m[c] = [];
        m[c].push({title: t, desc: desc, icon: icon}); 
        saveMenus(m);
        
        document.getElementById('addMenuTitle').value = '';
        document.getElementById('addMenuDesc').value = '';
        alert('새로운 메뉴가 추가되었습니다.');
    } else {
        alert('메뉴 이름을 입력해 주세요.');
    }
}

function moveMenuCategory(f, i, t) {
    const m = getMenus();
    const item = m[f].splice(i, 1)[0];
    if (!m[t]) m[t] = [];
    m[t].push(item);
    saveMenus(m);
}

function deleteMenu(c, i) {
    if (confirm('삭제하시겠습니까?')) {
        const m = getMenus();
        m[c].splice(i, 1);
        saveMenus(m);
    }
}

function getNotices() {
    const saved = localStorage.getItem('esol_notices');
    return saved ? JSON.parse(saved) : defaultNotices;
}

function saveNotices(list) {
    localStorage.setItem('esol_notices', JSON.stringify(list));
    loadAdminNoticeList();
}

function adminSubmitNotice() {
    const tag = document.getElementById('adminNoticeTag').value;
    const title = document.getElementById('adminNoticeTitle').value.trim();
    const writer = document.getElementById('adminNoticeWriter').value.trim();
    const content = document.getElementById('adminNoticeContent').value.trim();

    if (!title || !content) return alert('제목과 본문을 작성해 주세요.');

    const list = getNotices();
    const dateStr = new Date().toISOString().split('T')[0];
    list.unshift({ id: Date.now(), tag, title, writer: writer || '환경안전팀', content, date: dateStr });
    
    saveNotices(list);
    
    document.getElementById('adminNoticeTitle').value = '';
    document.getElementById('adminNoticeWriter').value = '';
    document.getElementById('adminNoticeContent').value = '';
    alert('등록되었습니다.');
}

function loadAdminNoticeList() {
    const list = getNotices();
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

function editNotice(id) {
    const list = getNotices();
    const target = list.find(n => n.id === id);
    if (!target) return;
    
    const newTitle = prompt('수정 제목:', target.title);
    if (!newTitle) return;
    
    const newContent = prompt('수정 본문:', target.content);
    if (!newContent) return;
    
    target.title = newTitle;
    target.content = newContent;
    saveNotices(list);
    alert('수정되었습니다.');
}

function deleteNotice(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    let list = getNotices();
    list = list.filter(n => n.id !== id);
    saveNotices(list);
}

function loadAdminPpeSection() {
    loadPpeGuides();
    loadPpeOptions();
    loadAdminPpeList();
}

function loadPpeGuides() {
    const saved = localStorage.getItem('esol_ppe_guides');
    const guides = saved ? JSON.parse(saved) : defaultPpeGuides;
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

function openPpeGuideModal(idx = -1) {
    const saved = localStorage.getItem('esol_ppe_guides');
    const guides = saved ? JSON.parse(saved) : defaultPpeGuides;
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

function savePpeGuideModal() {
    const idx = parseInt(document.getElementById('editPpeGuideIndex').value, 10);
    const process = document.getElementById('editPpeProcessInput').value.trim();
    const items = document.getElementById('editPpeItemsInput').value.trim();
    
    if (!process || !items) return alert('입력해 주세요.');
    
    const saved = localStorage.getItem('esol_ppe_guides');
    let guides = saved ? JSON.parse(saved) : defaultPpeGuides;
    
    if (idx === -1) {
        guides.push({ process, items });
    } else {
        guides[idx] = { process, items };
    }
    
    localStorage.setItem('esol_ppe_guides', JSON.stringify(guides));
    closePpeGuideModal();
    loadPpeGuides();
    alert('저장되었습니다.');
}

function deletePpeGuide(idx) {
    if (!confirm('삭제하시겠습니까?')) return;
    const saved = localStorage.getItem('esol_ppe_guides');
    let guides = saved ? JSON.parse(saved) : defaultPpeGuides;
    guides.splice(idx, 1);
    localStorage.setItem('esol_ppe_guides', JSON.stringify(guides));
    loadPpeGuides();
}

function loadPpeOptions() {
    const saved = localStorage.getItem('esol_ppe_options');
    const options = saved ? JSON.parse(saved) : defaultPpeOptions;
    
    document.getElementById('adminPpeOptionTags').innerHTML = options.map((opt, idx) => `
        <span style="background:#f0e6f6; border:1px solid #b0268d; color:#4a0082; padding:6px 12px; border-radius:20px; font-size:13px;">
            ${opt} 
            <button onclick="removePpeOption(${idx})" style="border:none; background:none; color:#e53935; cursor:pointer;">✕</button>
        </span>
    `).join('');
}

function addPpeOption() {
    const val = document.getElementById('newPpeOptionInput').value.trim();
    if (!val) return;
    
    const saved = localStorage.getItem('esol_ppe_options');
    const options = saved ? JSON.parse(saved) : defaultPpeOptions;
    options.push(val);
    
    localStorage.setItem('esol_ppe_options', JSON.stringify(options));
    document.getElementById('newPpeOptionInput').value = '';
    loadPpeOptions();
}

function removePpeOption(idx) {
    const saved = localStorage.getItem('esol_ppe_options');
    let options = saved ? JSON.parse(saved) : defaultPpeOptions;
    options.splice(idx, 1);
    localStorage.setItem('esol_ppe_options', JSON.stringify(options));
    loadPpeOptions();
}

function loadAdminPpeList() {
    const requests = JSON.parse(localStorage.getItem('esol_ppe_requests') || '[]');
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

function deletePpeRequest(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    let requests = JSON.parse(localStorage.getItem('esol_ppe_requests') || '[]');
    requests = requests.filter(r => r.id !== id);
    localStorage.setItem('esol_ppe_requests', JSON.stringify(requests));
    loadAdminPpeList();
}

function getRegisteredUsers() {
    return JSON.parse(localStorage.getItem('esol_registered_users') || '[]');
}

function saveRegisteredUsers(users) {
    localStorage.setItem('esol_registered_users', JSON.stringify(users));
    loadAdminUserList();
}

function registerUserAccount() {
    const dept = document.getElementById('newUserDept').value.trim();
    const name = document.getElementById('newUserName').value.trim();
    const empNo = document.getElementById('newUserEmpNo').value.trim();
    const pw = document.getElementById('newUserPw').value.trim();
    
    if (!dept || !name || !empNo || !pw) return alert('입력해 주세요.');
    
    const users = getRegisteredUsers();
    if (users.find(u => u.name === name)) return alert('이미 등록된 성명입니다.');
    
    users.push({ id: Date.now(), dept, name, empNo, pw });
    saveRegisteredUsers(users);
    alert('등록되었습니다.');
}

function loadAdminUserList() {
    const users = getRegisteredUsers();
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

function deleteUserAccount(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    let users = getRegisteredUsers();
    users = users.filter(u => u.id !== id);
    saveRegisteredUsers(users);
}

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
        
        let existingData = JSON.parse(localStorage.getItem('esol_msds_data') || '[]');
        existingData.push(newMsds);
        localStorage.setItem('esol_msds_data', JSON.stringify(existingData));
        
        let allDocs = JSON.parse(localStorage.getItem('esol_safety_docs_v2') || '{}');
        if (!allDocs['MSDS 자료실']) allDocs['MSDS 자료실'] = []; 
        
        allDocs['MSDS 자료실'].unshift({
            id: newMsds.id,
            title: name + ' (' + cas + ') MSDS',
            url: uploadData.fileUrl,
            uploader: supplier || '관리자',
            date: new Date().toISOString().split('T')[0]
        });
        localStorage.setItem('esol_safety_docs_v2', JSON.stringify(allDocs));
        
        alert('등록되었습니다!');
        loadAdminMsdsList();
    } catch (err) {
        alert('업로드 실패');
    } finally {
        btn.innerText = '+ MSDS 자료 등록하기';
        btn.disabled = false;
    }
}

function loadAdminMsdsList() {
    const list = JSON.parse(localStorage.getItem('esol_msds_data') || '[]');
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

function deleteMsds(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    let list = JSON.parse(localStorage.getItem('esol_msds_data') || '[]');
    list = list.filter(m => m.id !== id);
    localStorage.setItem('esol_msds_data', JSON.stringify(list));
    loadAdminMsdsList();
}

function loadAdminTextSettings() {
    const savedText = localStorage.getItem('esol_site_texts');
    if (savedText) {
        const config = JSON.parse(savedText);
        if (config.title) document.getElementById('siteTitleInput').value = config.title;
        if (config.subText) document.getElementById('siteSubTextInput').value = config.subText;
    }
}

function saveTextSettings() {
    const titleVal = document.getElementById('siteTitleInput').value.trim();
    const subTextVal = document.getElementById('siteSubTextInput').value.trim();
    if (!titleVal) return alert('대표 제목을 입력해 주세요.');
    const config = { title: titleVal, subText: subTextVal };
    localStorage.setItem('esol_site_texts', JSON.stringify(config));
    alert('저장되었습니다.');
}