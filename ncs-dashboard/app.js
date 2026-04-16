import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚠️ 2단계에서 복사한 본인의 설정값으로 반드시 교체하세요!
const firebaseConfig = {
  apiKey: "AIzaSyC94GcrggzA6Hf1sHiJrvuVQEI56QzN0d0",
  authDomain: "ncs-tracker.firebaseapp.com",
  projectId: "ncs-tracker",
  storageBucket: "ncs-tracker.firebasestorage.app",
  messagingSenderId: "322466284693",
  appId: "1:322466284693:web:e2bb4d78b32f08875c079c",
  measurementId: "G-QR84850D8D"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 데이터 구조 (10과목, 17단계 중 테스트를 위해 3과목, 5단계만 우선 세팅. 직접 추가하시면 됩니다!)
const modules = ["1. 제작기획", "2. 사전제작", "3. 슈퍼바이징"];
const stages = ["개발 계획서 제출", "원고집필 시작", "초고본 집필", "초고본 제출", "초고본 검토"];
const totalRows = modules.length;
const totalCols = stages.length;

// 표 그리기 로직
function renderTable() {
    const stageRow = document.getElementById("stage-row");
    const tbody = document.getElementById("table-body");
    
    // 헤더 그리기
    stageRow.innerHTML = `<th>과목명</th><th>담당자</th>` + stages.map(s => `<th>${s}</th>`).join('') + `<th class="progress-cell">진행률</th>`;

    // 본문 그리기
    let html = '';
    modules.forEach((mod, rowIndex) => {
        html += `<tr>`;
        html += `<td>${mod}</td>`;
        html += `<td><input type="text" id="user-${rowIndex}" placeholder="이름 입력" onblur="updateUser(${rowIndex}, this.value)"></td>`;
        
        for(let colIndex = 0; colIndex < totalCols; colIndex++) {
            // 체크박스 클릭 시 파이어베이스로 데이터 전송 함수(toggleCheck) 실행
            html += `<td><input type="checkbox" id="chk-${rowIndex}-${colIndex}" onclick="toggleCheck(${rowIndex}, ${colIndex}, this.checked)"></td>`;
        }
        html += `<td id="prog-${rowIndex}" class="progress-cell">0%</td>`;
        html += `</tr>`;
    });
    tbody.innerHTML = html;
}

// 브라우저 전역에서 함수를 호출할 수 있도록 설정
window.toggleCheck = function(row, col, isChecked) {
    // Firebase 데이터베이스에 해당 체크박스의 상태 저장
    set(ref(db, `checkboxes/${row}_${col}`), isChecked);
}

window.updateUser = function(row, name) {
    // 담당자 이름 저장
    set(ref(db, `users/${row}`), name);
}

// 실시간 데이터 수신 (Firebase에서 값이 바뀌면 내 화면도 바뀜)
function listenForUpdates() {
    // 체크박스 상태 동기화 및 진행률 계산
    onValue(ref(db, 'checkboxes'), (snapshot) => {
        const data = snapshot.val() || {};
        let totalChecked = 0;

        modules.forEach((_, r) => {
            let rowChecked = 0;
            stages.forEach((_, c) => {
                const isChecked = data[`${r}_${c}`] || false;
                document.getElementById(`chk-${r}-${c}`).checked = isChecked;
                if(isChecked) {
                    rowChecked++;
                    totalChecked++;
                }
            });
            // 과목별 진행률 업데이트
            const rowProgress = Math.round((rowChecked / totalCols) * 100);
            document.getElementById(`prog-${r}`).innerText = `${rowProgress}%`;
        });

        // 전체 진행률 업데이트
        const grandTotal = Math.round((totalChecked / (totalRows * totalCols)) * 100);
        document.getElementById(`grand-total`).innerText = grandTotal;
    });

    // 담당자 이름 동기화
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