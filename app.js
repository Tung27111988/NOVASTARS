// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCIhfV7xlZ_00gIMpNIp7htWaL8zpoRpS8",
  authDomain: "acceptance-and-payment-records.firebaseapp.com",
  projectId: "acceptance-and-payment-records",
  storageBucket: "acceptance-and-payment-records.firebasestorage.app",
  messagingSenderId: "761078844576",
  appId: "1:761078844576:web:60e8f4f04401a012e58dc5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Application State
let appUsers = {};
let currentUser = null;
let schools = [];
let records = []; 
let currentYear = 2024;
let activeCell = null; 
let appInitialized = false;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loginUsernameInput = document.getElementById('loginUsername');
const loginPasswordInput = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const displayUsername = document.getElementById('displayUsername');
const displayRole = document.getElementById('displayRole');

const yearSelect = document.getElementById('yearSelect');
const branchFilter = document.getElementById('branchFilter');
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('tableBody');
const addSchoolBtn = document.getElementById('addSchoolBtn');

const schoolModal = document.getElementById('schoolModal');
const closeSchoolModal = document.getElementById('closeSchoolModal');
const cancelSchoolBtn = document.getElementById('cancelSchoolBtn');
const saveSchoolBtn = document.getElementById('saveSchoolBtn');

const recordModal = document.getElementById('recordModal');
const closeRecordModal = document.getElementById('closeRecordModal');
const cancelRecordBtn = document.getElementById('cancelRecordBtn');
const saveRecordBtn = document.getElementById('saveRecordBtn');

const checkBBNT = document.getElementById('checkBBNT');
const check08a = document.getElementById('check08a');
const checkDNTT = document.getElementById('checkDNTT');
const recordNote = document.getElementById('recordNote');

const accountModal = document.getElementById('accountModal');
const closeAccountModal = document.getElementById('closeAccountModal');
const cancelAccountBtn = document.getElementById('cancelAccountBtn');
const saveAccountBtn = document.getElementById('saveAccountBtn');
const btnManageAccounts = document.getElementById('btnManageAccounts');
const userTableBody = document.getElementById('userTableBody');

// Real-time Sync
function initRealtimeSync() {
    db.collection('users').onSnapshot(snapshot => {
        appUsers = {};
        snapshot.forEach(doc => {
            appUsers[doc.id] = doc.data();
        });
        
        // Seed default admin if empty
        if (snapshot.empty) {
            db.collection('users').doc('admin').set({ username: 'admin', password: '123', name: 'Admin', role: 'admin' });
            db.collection('users').doc('sale1').set({ username: 'sale1', password: '123', name: 'Sale 1', role: 'sales' });
        }
        
        // Check if current user still exists
        if (currentUser && !appUsers[currentUser.username]) {
            handleLogout();
        }
        
        if (accountModal && accountModal.classList.contains('active')) {
            renderUserTable();
        }
    });

    db.collection('schools').onSnapshot(snapshot => {
        schools = [];
        snapshot.forEach(doc => {
            schools.push(doc.data());
        });
        if (currentUser) renderTable();
    });

    db.collection('records').onSnapshot(snapshot => {
        records = [];
        snapshot.forEach(doc => {
            records.push(doc.data());
        });
        if (currentUser) renderTable();
    });
}

// Auth Logic
function checkAuth() {
    const savedUser = localStorage.getItem('edupay_currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showLogin();
    }
}

function handleLogin() {
    const userKey = loginUsernameInput.value.trim().toLowerCase();
    const pass = loginPasswordInput.value;
    
    if (Object.keys(appUsers).length === 0) {
        alert("Đang tải dữ liệu từ máy chủ đám mây (Cloud), vui lòng đợi 2-3 giây và thử lại.");
        return;
    }
    
    if (appUsers[userKey]) {
        if (appUsers[userKey].password === pass) {
            currentUser = appUsers[userKey];
            localStorage.setItem('edupay_currentUser', JSON.stringify(currentUser));
            showApp();
        } else {
            alert("Mật khẩu không đúng! Vui lòng thử lại.");
        }
    } else {
        alert("Tên đăng nhập không tồn tại!");
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('edupay_currentUser');
    loginUsernameInput.value = '';
    loginPasswordInput.value = '';
    showLogin();
}

function showLogin() {
    loginScreen.style.display = 'flex';
    appContainer.style.display = 'none';
}

function showApp() {
    loginScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    
    displayUsername.innerText = currentUser.name;
    displayRole.innerText = currentUser.role === 'admin' ? 'Quản lý cấp cao' : 'Nhân viên Sales';
    
    const adminCols = document.querySelectorAll('.admin-only-col');
    if (currentUser.role === 'sales') {
        addSchoolBtn.style.display = 'none';
        document.getElementById('adminTools').style.display = 'none';
        adminCols.forEach(col => col.style.display = 'none');
    } else {
        addSchoolBtn.style.display = 'inline-flex';
        document.getElementById('adminTools').style.display = 'block';
        adminCols.forEach(col => col.style.display = 'table-cell');
    }
    
    initApp();
}

// Account Management Logic
function renderUserTable() {
    userTableBody.innerHTML = '';
    Object.values(appUsers).forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.password}</td>
            <td style="text-align:center;">
                ${user.role === 'admin' ? '<span style="font-size:12px; color:var(--text-muted)">Admin</span>' : `<button class="btn-icon delete-user-btn" data-username="${user.username}"><i data-lucide="trash-2"></i></button>`}
            </td>
        `;
        userTableBody.appendChild(tr);
    });
    lucide.createIcons();
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const u = e.currentTarget.getAttribute('data-username');
            if (confirm(`Xóa tài khoản ${u}?`)) {
                db.collection('users').doc(u).delete();
            }
        });
    });
}

function handleAddAccount() {
    const username = document.getElementById('newUsername').value.trim().toLowerCase();
    const name = document.getElementById('newName').value.trim();
    const pass = document.getElementById('newPassword').value.trim();
    
    if (!username || !name || !pass) return alert("Vui lòng nhập đủ thông tin!");
    if (appUsers[username]) return alert("Tên đăng nhập này đã tồn tại!");
    
    db.collection('users').doc(username).set({
        username: username,
        password: pass,
        name: name,
        role: 'sales'
    });
    
    document.getElementById('newUsername').value = '';
    document.getElementById('newName').value = '';
    document.getElementById('newPassword').value = '';
    alert("Thêm tài khoản thành công!");
}


function initApp() {
    yearSelect.value = currentYear;
    renderTable(); 
    
    if (!appInitialized) {
        lucide.createIcons();
        
        yearSelect.addEventListener('change', (e) => {
            currentYear = parseInt(e.target.value);
            renderTable();
        });
        
        branchFilter.addEventListener('change', renderTable);
        searchInput.addEventListener('input', renderTable);
        
        if (btnManageAccounts) {
            btnManageAccounts.addEventListener('click', () => {
                renderUserTable();
                accountModal.classList.add('active');
            });
            closeAccountModal.addEventListener('click', () => accountModal.classList.remove('active'));
            cancelAccountBtn.addEventListener('click', () => accountModal.classList.remove('active'));
            saveAccountBtn.addEventListener('click', handleAddAccount);
        }

        addSchoolBtn.addEventListener('click', () => schoolModal.classList.add('active'));
        closeSchoolModal.addEventListener('click', () => schoolModal.classList.remove('active'));
        cancelSchoolBtn.addEventListener('click', () => schoolModal.classList.remove('active'));
        saveSchoolBtn.addEventListener('click', handleAddSchool);
        
        closeRecordModal.addEventListener('click', () => recordModal.classList.remove('active'));
        cancelRecordBtn.addEventListener('click', () => recordModal.classList.remove('active'));
        saveRecordBtn.addEventListener('click', handleSaveRecord);
        
        document.getElementById('btnDownloadTemplate').addEventListener('click', downloadTemplate);
        document.getElementById('btnExportExcel').addEventListener('click', exportExcel);
        document.getElementById('btnImportExcelTrigger').addEventListener('click', () => {
            document.getElementById('fileImportExcel').click();
        });
        document.getElementById('fileImportExcel').addEventListener('change', importExcel);
        
        appInitialized = true;
    }
}

function renderTable() {
    tableBody.innerHTML = '';
    const filterText = searchInput.value.toLowerCase().trim();
    const filterBranch = branchFilter.value;
    
    const filteredSchools = schools.filter(school => {
        if (filterBranch !== 'all' && school.branch !== filterBranch) return false;
        if (!filterText) return true;
        return school.name.toLowerCase().includes(filterText) || 
               school.salesName.toLowerCase().includes(filterText);
    });
    
    filteredSchools.forEach(school => {
        const tr = document.createElement('tr');
        
        let html = `
            <td class="truncate" title="${school.branch}">${school.branch}</td>
            <td class="truncate" title="${school.salesName}">${school.salesName}</td>
            <td class="truncate" title="${school.name}"><strong>${school.name}</strong></td>
            <td class="truncate" title="${school.location}">${school.location}</td>
        `;
        
        if (currentUser && currentUser.role === 'admin') {
            html += `
                <td style="text-align: center;">
                    <button class="btn-icon delete-school-btn" data-id="${school.id}" title="Xóa trường này">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;
        } else {
            html += `<td style="display: none;"></td>`; 
        }
        
        tr.innerHTML = html;
        
        for (let m = 1; m <= 12; m++) {
            const td = document.createElement('td');
            td.className = 'cell-month';
            
            const record = getRecord(school.id, currentYear, m);
            
            if (record) {
                let docCount = (record.bbnt ? 1 : 0) + (record.mau08a ? 1 : 0) + (record.dntt ? 1 : 0);
                if (docCount === 3) {
                    td.classList.add('status-complete');
                    td.title = 'Đủ hồ sơ';
                } else if (docCount > 0) {
                    td.classList.add('status-missing');
                    let missing = [];
                    if (!record.bbnt) missing.push('BBNT');
                    if (!record.mau08a) missing.push('Mẫu 08a');
                    if (!record.dntt) missing.push('ĐNTT');
                    td.title = 'Thiếu: ' + missing.join(', ');
                } else {
                    td.classList.add('status-none');
                }
            } else {
                td.classList.add('status-none');
            }
            
            td.addEventListener('click', () => openRecordModal(school, m, record));
            tr.appendChild(td);
        }
        
        tableBody.appendChild(tr);
    });

    lucide.createIcons();
    
    document.querySelectorAll('.delete-school-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            handleDeleteSchool(id);
        });
    });
}

function getRecord(schoolId, year, month) {
    return records.find(r => r.schoolId == schoolId && r.year == year && r.month == month);
}

function handleAddSchool() {
    if (currentUser.role !== 'admin') return alert("Bạn không có quyền thêm trường mới!");

    const branch = document.getElementById('schoolBranch').value;
    const sales = document.getElementById('schoolSales').value.trim();
    const name = document.getElementById('schoolName').value.trim();
    const location = document.getElementById('schoolLocation').value.trim();
    
    if (!sales || !name) return alert("Vui lòng nhập Tên Sales và Tên Trường!");
    
    const newId = Date.now().toString();
    db.collection('schools').doc(newId).set({
        id: newId, branch, salesName: sales, name, location
    });
    
    document.getElementById('schoolSales').value = '';
    document.getElementById('schoolName').value = '';
    document.getElementById('schoolLocation').value = '';
    
    schoolModal.classList.remove('active');
}

function handleDeleteSchool(id) {
    if (currentUser.role !== 'admin') return;
    
    const school = schools.find(s => s.id == id);
    if (!school) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa trường "${school.name}" không? Toàn bộ hồ sơ của trường này sẽ bị xóa trên Máy chủ Cloud!`)) {
        db.collection('schools').doc(id.toString()).delete();
        
        records.filter(r => r.schoolId == id).forEach(r => {
            const docId = `${r.schoolId}_${r.year}_${r.month}`;
            db.collection('records').doc(docId).delete();
        });
    }
}

function openRecordModal(school, month, record) {
    activeCell = { schoolId: school.id, month: month };
    document.getElementById('modalSchoolName').innerText = school.name;
    document.getElementById('modalMonthLabel').innerText = `Tháng ${month} / ${currentYear}`;
    
    if (record) {
        checkBBNT.checked = record.bbnt;
        check08a.checked = record.mau08a;
        checkDNTT.checked = record.dntt;
        recordNote.value = record.note || '';
    } else {
        checkBBNT.checked = false;
        check08a.checked = false;
        checkDNTT.checked = false;
        recordNote.value = '';
    }
    
    recordModal.classList.add('active');
}

function handleSaveRecord() {
    if (!activeCell) return;
    
    const bbnt = checkBBNT.checked;
    const mau08a = check08a.checked;
    const dntt = checkDNTT.checked;
    const note = recordNote.value.trim();
    
    const docId = `${activeCell.schoolId}_${currentYear}_${activeCell.month}`;
    
    if (!bbnt && !mau08a && !dntt && note === '') {
        db.collection('records').doc(docId).delete().catch(() => {});
    } else {
        db.collection('records').doc(docId).set({
            schoolId: activeCell.schoolId,
            year: currentYear,
            month: activeCell.month,
            bbnt: bbnt,
            mau08a: mau08a,
            dntt: dntt,
            note: note
        });
    }
    
    recordModal.classList.remove('active');
}

// ==========================================
// Excel Import & Export Logic
// ==========================================

function downloadTemplate() {
    const ws_data = [
        ["Năm", "Chi nhánh", "Tên Sales", "Tên Trường", "Địa bàn", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
        ["2024", "Chi nhánh Công ty Cổ phần Giáo dục NOVASTARS", "Nguyễn Văn A", "THPT Lê Quý Đôn", "Quận 3", "BBNT, 08a", "Đủ", "", "", "", "", "", "", "", "", "", ""]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "EduPay_Template.xlsx");
}

function exportExcel() {
    const ws_data = [
        ["Năm", "Chi nhánh", "Tên Sales", "Tên Trường", "Địa bàn", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"]
    ];
    
    schools.forEach(s => {
        let row = [currentYear, s.branch, s.salesName, s.name, s.location];
        for (let m = 1; m <= 12; m++) {
            const r = getRecord(s.id, currentYear, m);
            if (!r) {
                row.push("");
            } else {
                let docs = [];
                if (r.bbnt) docs.push("BBNT");
                if (r.mau08a) docs.push("08a");
                if (r.dntt) docs.push("ĐNTT");
                
                if (docs.length === 3) row.push("Đủ");
                else if (docs.length > 0) row.push(docs.join(", "));
                else row.push("");
            }
        }
        ws_data.push(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Data_${currentYear}`);
    XLSX.writeFile(wb, `EduPay_Export_${currentYear}.xlsx`);
}

function importExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1}); 
            
            if (jsonData.length <= 1) {
                alert("File không có dữ liệu!");
                return;
            }
            
            if (!confirm("Hệ thống sẽ cập nhật thông tin và tiến độ hồ sơ từ file Excel. Việc này sẽ đẩy trực tiếp lên Cloud. Bạn có muốn tiếp tục?")) {
                document.getElementById('fileImportExcel').value = '';
                return;
            }

            for(let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[3]) continue; 
                
                let year = parseInt(row[0]) || currentYear;
                let branch = row[1] || 'Chi nhánh Công ty Cổ phần Giáo dục NOVASTARS';
                let salesName = row[2] || 'Không xác định';
                let name = row[3];
                let location = row[4] || '';
                
                let school = schools.find(s => s.name.toLowerCase() === name.toLowerCase());
                let sId = school ? school.id : Date.now().toString() + "_" + i;
                
                if (!school) {
                    db.collection('schools').doc(sId).set({
                        id: sId, branch, salesName, name, location
                    });
                } else {
                    db.collection('schools').doc(sId.toString()).update({
                        branch, salesName, location
                    });
                }
                
                for(let m = 1; m <= 12; m++) {
                    let cellVal = row[4 + m];
                    if (cellVal !== undefined && cellVal !== null) {
                        let strVal = cellVal.toString().toLowerCase().trim();
                        
                        let bbnt = false, mau08a = false, dntt = false;
                        
                        if (strVal.includes('đủ') || strVal === 'x' || strVal === 'v') {
                            bbnt = mau08a = dntt = true;
                        } else {
                            if (strVal.includes('bbnt') || strVal.includes('biên bản') || strVal.includes('bb')) bbnt = true;
                            if (strVal.includes('08a') || strVal.includes('8a') || strVal.includes('mẫu 08')) mau08a = true;
                            if (strVal.includes('đntt') || strVal.includes('đề nghị')) dntt = true;
                        }
                        
                        const docId = `${sId}_${year}_${m}`;
                        if (bbnt || mau08a || dntt) {
                            db.collection('records').doc(docId).set({
                                schoolId: sId, year: year, month: m,
                                bbnt: bbnt, mau08a: mau08a, dntt: dntt, note: ''
                            });
                        } 
                    }
                }
            }
            
            alert("Đã đẩy lệnh Import lên máy chủ đám mây! Bảng dữ liệu sẽ tự động cập nhật ngay khi xong.");
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi đọc file Excel. Vui lòng đảm bảo file đúng định dạng.");
        } finally {
            document.getElementById('fileImportExcel').value = ''; 
        }
    };
    reader.readAsArrayBuffer(file);
}

// Boot up
loginBtn.addEventListener('click', handleLogin); 
logoutBtn.addEventListener('click', handleLogout);
initRealtimeSync();
checkAuth();
