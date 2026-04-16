import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ 본인의 파이어베이스 설정값으로 반드시 교체하세요!
const firebaseConfig = {
  apiKey: "AIzaSyC8GQu099KDTDdL2MKWxQCsPspfp0UQndM",
  authDomain: "ncs-visualgraphics.firebaseapp.com",
  projectId: "ncs-visualgraphics",
  storageBucket: "ncs-visualgraphics.firebasestorage.app",
  messagingSenderId: "146266383216",
  appId: "1:146266383216:web:fa12bbae1b30d5097665b5",
  measurementId: "G-2Z0FGNND41"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 1. 데이터 정의 (10과목, 17단계 일정)
const modules = [
    "1. 제작기획", "2. 사전제작", "3. 슈퍼바이징", "4. 모델링", "5. 애니메이션", 
    "6. 앨리먼트+디자인", "7. 이펙트", "8. 라이팅", "9. 컴포지팅", "10. 제작 후 관리"
];

const dates = [
    "5월", "5월", "6월", "7월 3일(금)", "7월 중순~8월 중순", "", "", "8월 14일(금)", 
    "8월 중순~9월 중순", "", "", "10월 16일(금)", "10월", "", "", "", "~11/12(목) 계약 종료"
];

const stages = [
    "개발 계획서 제출", "원고집필 시작", "초고본 집필", "초고본 제출", "초고본 검토", 
    "1차 검토 회의", "완성본 집필", "완성본 제출", "완성본 검토", "2차 회의", 
    "최종본 집필/완성도", "최종본 제출", "최종 윤문 및 편집", "최종본 검수", 
    "학습모듈 처리", "용역 결과물 제출", "사업계약 마무리"
];

const totalRows = modules.length;
const totalCols = stages.length;

// 2. 표 뼈대 그리기
function renderTable() {
    const dateRow = document.getElementById("date-row");
    const stageRow = document.getElementById("stage-row");
    const tbody = document.getElementById("table-body");
    const footerRow = document.getElementById("footer-row");
    
    // 상단 1줄 (날짜)
    dateRow.innerHTML = `<th rowspan="2" style="z-index: 5;">NO</th><th rowspan="2" style="z-index: 5;">과목</th><th rowspan="2" style="z-index: 5;">담당자</th>` 
        + dates.map(d => `<th>${d}</th>`).join('') + `<th rowspan="2" class="progress-col" style="z-index: 5;">과목별<br>진행률</th>`;
    
    // 상단 2줄 (단계)
    stageRow.innerHTML = stages.map(s => `<th>${s}</th>`).join('');

    // 본문 (과목 10개)
    let html = '';
    modules.forEach((mod, r) => {
        html += `<tr>`;
        html += `<td>${r + 1}</td>`;
        html += `<td>${mod}</td>`;
        html += `<td><input type="text" id="user-${r}" placeholder="입력" onblur="updateUser(${r}, this.value)"></td>`;
        
        for(let c = 0; c < totalCols; c++) {
            html += `<td id="td-${r}-${c}"><input type="checkbox" id="chk-${r}-${c}" onclick="toggleCheck(${r}, ${c}, this.checked)"></td>`;
        }
        html += `<td id="prog-${r}" class="progress-col">0%</td>`;
        html += `</tr>`;
    });
    tbody.innerHTML = html;

    // 하단 (단계별 진행률)
    let footerHtml = `<td colspan="3">단계별 진행률</td>`;
    for(let c = 0; c < totalCols; c++) {
        footerHtml += `<td id="col-prog-${c}">0%</td>`;
    }
    footerHtml += `<td id="footer-grand-total">0%</td>`;
    footerRow.innerHTML = footerHtml;
}

// 3. 파이어베이스 연동 및 로직
window.updateUser = function(row, name) {
    set(ref(db, `users/${row}`), name);
}

window.toggleCheck = function(row, col, isChecked) {
    let updates = {};
    
    // 체크를 해제할 경우: 뒤에 있는 모든 단계를 자동으로 해제 (롤백 로직)
    if (!isChecked) {
        for (let i = col; i < totalCols; i++) {
            updates[`${row}_${i}`] = false;
        }
    } else {
        // 체크할 경우: 해당 칸만 체크
        updates[`${row}_${col}`] = true;
    }

    // 변경된 내용들을 한 번에 데이터베이스에 덮어쓰기
    onValue(ref(db, 'checkboxes'), (snapshot) => {
        let currentData = snapshot.val() || {};
        let mergedData = { ...currentData, ...updates };
        set(ref(db, 'checkboxes'), mergedData);
    }, { onlyOnce: true });
}

function listenForUpdates() {
    onValue(ref(db, 'checkboxes'), (snapshot) => {
        const data = snapshot.val() || {};
        let totalChecked = 0;
        let colCheckedCount = new Array(totalCols).fill(0);

        modules.forEach((_, r) => {
            let rowChecked = 0;
            let previousChecked = true; // 첫 번째 칸(col 0)은 항상 열려있음

            stages.forEach((_, c) => {
                const isChecked = data[`${r}_${c}`] || false;
                const chkBox = document.getElementById(`chk-${r}-${c}`);
                const tdCell = document.getElementById(`td-${r}-${c}`);
                
                chkBox.checked = isChecked;
                
                // 순차적 활성화 로직: 이전 단계가 체크되어 있어야만 현재 칸 활성화
                if (previousChecked) {
                    chkBox.disabled = false;
                    tdCell.classList.remove('disabled-cell');
                } else {
                    chkBox.disabled = true;
                    tdCell.classList.add('disabled-cell');
                }
                
                if (isChecked) {
                    rowChecked++;
                    colCheckedCount[c]++;
                    totalChecked++;
                    previousChecked = true;
                } else {
                    previousChecked = false; // 체크 안되어 있으면 다음 칸 차단
                }
            });

            // 과목별 행(Row) 진행률 계산
            const rowProgress = Math.round((rowChecked / totalCols) * 100);
            document.getElementById(`prog-${r}`).innerText = `${rowProgress}%`;
        });

        // 단계별 열(Col) 진행률 계산
        stages.forEach((_, c) => {
            const colProgress = Math.round((colCheckedCount[c] / totalRows) * 100);
            document.getElementById(`col-prog-${c}`).innerText = `${colProgress}%`;
        });

        // 전체 진행률 업데이트
        const grandTotal = Math.round((totalChecked / (totalRows * totalCols)) * 100);
        document.getElementById(`grand-total`).innerText = grandTotal;
        document.getElementById(`footer-grand-total`).innerText = `${grandTotal}%`;
    });

    // 사용자 이름 동기화
    onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val() || {};
        modules.forEach((_, r) => {
            if(data[r]) document.getElementById(`user-${r}`).value = data[r];
        });
    });
}

// 실행
renderTable();
listenForUpdates();
