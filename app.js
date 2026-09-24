/* ==========================================================================
   文化祭 備品管理システム JS (提出デザイン100%完全再現＆スライド・タップジャンプ対応)
   ========================================================================== */

const DEFAULT_EQUIPMENT = ['教室の机', '教室の椅子', 'ベニヤ板', '暗幕', '延長コード'];

const DEFAULT_ROOMS = [
  // 5F
  { id: 'room-5a', floor: 5, groupName: '演劇部', parentGroup: '文化部', code: '5F 3-A', name: '3年A組', targets: { '教室の机': 40, '教室の椅子': 40, 'ベニヤ板': 4, '暗幕': 2, '延長コード': 0 }, actuals: { '教室の机': 12, '教室の椅子': 12, 'ベニヤ板': 0, '暗幕': 0, '延長コード': 0 }, status: 'in-progress', notes: { 'ベニヤ板': '101〜104', '暗幕': '特大1, 2', '延長コード': 'なし' } },
  
  // 4F
  { id: 'room-4a', floor: 4, groupName: 'ダンス部', parentGroup: '運動部', code: '4F 2-A', name: '2年A組', targets: { '教室の机': 30, '教室の椅子': 30, 'ベニヤ板': 0, '暗幕': 2, '延長コード': 2 }, actuals: { '教室の机': 10, '教室の椅子': 10, 'ベニヤ板': 0, '暗幕': 0, '延長コード': 0 }, status: 'in-progress', notes: { 'ベニヤ板': 'なし', '暗幕': '特中1, 2', '延長コード': '20m 2本' } },

  // 3F (ユーザー提出画像 2-D / 2-E)
  { id: 'room-3a', floor: 3, groupName: '団 体 名', parentGroup: '母団体名', code: '２−Ｄ', name: '2年D組 (2-D)', targets: { '教室の机': 40, '教室の椅子': 40, 'ベニヤ板': 4, '暗幕': 2, '延長コード': 0 }, actuals: { '教室の机': 21, '教室の椅子': 7, 'ベニヤ板': 0, '暗幕': 0, '延長コード': 0 }, status: 'in-progress', notes: { 'ベニヤ板': '105〜108', '暗幕': '特大３、８', '延長コード': 'なし' } },
  { id: 'room-3b', floor: 3, groupName: '吹奏楽部', parentGroup: '音楽部系', code: '２−Ｅ', name: '2年E組 (2-E)', targets: { '教室の机': 35, '教室の椅子': 35, 'ベニヤ板': 2, '暗幕': 4, '延長コード': 3 }, actuals: { '教室の机': 15, '教室の椅子': 15, 'ベニya板': 2, '暗幕': 2, '延長コード': 1 }, status: 'in-progress', notes: { 'ベニヤ板': '201, 202', '暗幕': '標準1〜4', '延長コード': '10m 3本' } },

  // 2F
  { id: 'room-2a', floor: 2, groupName: '1年A組', parentGroup: '1学年', code: '２−Ａ', name: '1年A組', targets: { '教室の机': 40, '教室の椅子': 40, 'ベニヤ板': 0, '暗幕': 0, '延長コード': 1 }, actuals: { '教室の机': 40, '教室の椅子': 40, 'ベニヤ板': 0, '暗幕': 0, '延長コード': 1 }, status: 'complete', notes: { 'ベニヤ板': 'なし', '暗幕': 'なし', '延長コード': '5m' } },

  // 1F
  { id: 'room-1a', floor: 1, groupName: '体育館本部', parentGroup: '設備委員会', code: '体育館', name: '体育館ステージ', targets: { '教室の机': 50, '教室の椅子': 100, 'ベニヤ板': 10, '暗幕': 0, '延長コード': 5 }, actuals: { '教室の机': 15, '教室の椅子': 30, 'ベニヤ板': 3, '暗幕': 0, '延長コード': 2 }, status: 'in-progress', notes: { 'ベニヤ板': '大型1〜10', '暗幕': 'なし', '延長コード': 'ドラム5' } }
];

let appState = {
  phase: 'clean',
  equipment: [...DEFAULT_EQUIPMENT],
  rooms: JSON.parse(JSON.stringify(DEFAULT_ROOMS)),
  currentFloor: 3,
  selectedRoomId: 'room-3a',
  isAdminAuthenticated: false
};

// リアルタイム同期
let syncChannel = null;
if ('BroadcastChannel' in window) {
  syncChannel = new BroadcastChannel('school_equip_sync_final');
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'STATE_UPDATE') {
      appState = event.data.state;
      saveToStorage(false);
      renderCurrentView();
    }
  };
}

function loadFromStorage() {
  const saved = localStorage.getItem('school_equip_state_final');
  if (saved) {
    try { appState = JSON.parse(saved); } catch (e) {}
  }
}

function saveToStorage(notify = true) {
  localStorage.setItem('school_equip_state_final', JSON.stringify(appState));
  if (notify && syncChannel) {
    syncChannel.postMessage({ type: 'STATE_UPDATE', state: appState });
  }
}

// 画面 & ページ遷移
let currentView = 'field'; // 'field' | 'hq' | 'admin'
let currentPage = 1;      // 1 (トップ) | 2 (フロアマップ・スライド) | 3 (教室シート)

function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  document.getElementById(`nav-${viewName}`).classList.add('active');
  document.getElementById(`view-${viewName}`).classList.add('active');

  renderCurrentView();
}

function goToPage(pageNum) {
  currentPage = pageNum;
  document.querySelectorAll('.page-screen').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${pageNum}`).classList.add('active');
  renderCurrentView();
}

// --------------------------------------------------------------------------
// 直接タップジャンプ & 上下スライド処理
// --------------------------------------------------------------------------
function jumpToFloor(floorNum) {
  appState.currentFloor = Math.max(1, Math.min(5, floorNum));
  const roomInFloor = appState.rooms.find(r => r.floor === appState.currentFloor);
  if (roomInFloor) {
    appState.selectedRoomId = roomInFloor.id;
  }
  saveToStorage();

  if (currentPage === 1) {
    goToPage(2);
  } else {
    renderPage2();
  }
}

// 上下スワイプ/ドラッグ/ホイール イベント
function setupSwipeHandlers() {
  const area = document.getElementById('p2-swipe-area');
  if (!area) return;

  let startY = 0;
  let isDragging = false;

  area.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  area.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    handleSwipe(startY, endY);
  }, { passive: true });

  area.addEventListener('mousedown', (e) => {
    startY = e.clientY;
    isDragging = true;
  });

  area.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    handleSwipe(startY, e.clientY);
  });

  area.addEventListener('wheel', (e) => {
    if (currentPage !== 2) return;
    if (e.deltaY > 20) jumpToFloor(appState.currentFloor - 1);
    else if (e.deltaY < -20) jumpToFloor(appState.currentFloor + 1);
  }, { passive: true });
}

function handleSwipe(startY, endY) {
  if (currentPage !== 2) return;
  const diffY = startY - endY;
  if (Math.abs(diffY) > 30) {
    if (diffY > 0) {
      // 下から上にスワイプ ➔ 上の階へジャンプ
      jumpToFloor(appState.currentFloor + 1);
    } else {
      // 上から下にスワイプ ➔ 下の階へジャンプ
      jumpToFloor(appState.currentFloor - 1);
    }
  }
}

// --------------------------------------------------------------------------
// 各ページの描画処理
// --------------------------------------------------------------------------
function renderCurrentView() {
  if (currentView === 'field') {
    if (currentPage === 1) renderPage1();
    else if (currentPage === 2) renderPage2();
    else if (currentPage === 3) renderPage3();
  } else if (currentView === 'hq') {
    renderHQView();
  } else if (currentView === 'admin') {
    renderAdminView();
  }
}

// ページ1: トップ一覧
function renderPage1() {
  for (let f = 1; f <= 5; f++) {
    const floorRooms = appState.rooms.filter(r => r.floor === f);
    let fTargets = 0;
    let fActuals = 0;

    floorRooms.forEach(r => {
      appState.equipment.forEach(item => {
        fTargets += (r.targets[item] || 0);
        fActuals += (r.actuals[item] || 0);
      });
    });

    const percent = fTargets > 0 ? Math.min(100, Math.round((fActuals / fTargets) * 100)) : 30;
    const gaugeEl = document.getElementById(`p1-gauge-${f}`);
    if (gaugeEl) gaugeEl.innerText = `${percent}%`;
  }
}

// ページ2: フロアマップ & 右側階数ジャンプインジケーター
function renderPage2() {
  // 右側インジケーターのハイライト
  for (let f = 1; f <= 5; f++) {
    const navItem = document.getElementById(`fnav-${f}`);
    if (navItem) {
      if (f === appState.currentFloor) {
        navItem.classList.add('active');
      } else {
        navItem.classList.remove('active');
      }
    }
  }

  // アニメーション効果
  const card = document.getElementById('p2-main-card');
  if (card) {
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
      card.style.transform = 'scale(1)';
    }, 150);
  }
}

// ページ3: 団体名・教室詳細シート
function openRoomSheet(roomId) {
  appState.selectedRoomId = roomId;
  const room = appState.rooms.find(r => r.id === roomId);
  if (room) {
    appState.currentFloor = room.floor;
  }
  goToPage(3);
}

function renderPage3() {
  const room = appState.rooms.find(r => r.id === appState.selectedRoomId);
  if (!room) return;

  document.getElementById('p3-title-group').innerText = room.groupName;
  document.getElementById('p3-title-parent').innerText = room.parentGroup;
  document.getElementById('p3-title-floor').innerText = `${room.floor}F`;
  document.getElementById('p3-title-code').innerText = room.code;
  document.getElementById('p3-floor-badge-text').innerText = `${room.floor}F`;

  // 生徒机
  const deskOrig = room.targets['教室の机'] || 40;
  const deskActual = room.actuals['教室の机'] || 21;
  const deskRemain = Math.max(0, deskOrig - deskActual);
  document.getElementById('p3-desk-orig').innerText = deskOrig;
  document.getElementById('p3-desk-actual').innerText = deskActual;
  document.getElementById('p3-desk-remain').innerText = deskRemain;

  // 生徒椅子
  const chairOrig = room.targets['教室の椅子'] || 40;
  const chairActual = room.actuals['教室の椅子'] || 7;
  const chairRemain = Math.max(0, chairOrig - chairActual);
  document.getElementById('p3-chair-orig').innerText = chairOrig;
  document.getElementById('p3-chair-actual').innerText = chairActual;
  document.getElementById('p3-chair-remain').innerText = chairRemain;

  // ３列サブ項目
  document.getElementById('p3-veneer-val').innerHTML = `４<span class="p3-sub-note">（105〜108）</span>`;
  document.getElementById('p3-curtain-val').innerHTML = `２<span class="p3-sub-note">（特大３、８）</span>`;
  document.getElementById('p3-cord-val').innerText = `なし`;

  // カウンター変更ドロワー
  const container = document.getElementById('p3-counter-rows');
  container.innerHTML = '';
  appState.equipment.forEach(item => {
    const orig = room.targets[item] || 0;
    const act = room.actuals[item] || 0;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin:0.2rem 0; font-size:0.85rem;';
    row.innerHTML = `
      <div><strong>${item}</strong> (${act}/${orig})</div>
      <div>
        <button style="padding:2px 8px;" onclick="changeCount('${room.id}', '${item}', -1)">−</button>
        <span style="font-weight:bold; margin:0 4px;">${act}</span>
        <button style="padding:2px 8px;" onclick="changeCount('${room.id}', '${item}', 1)">＋</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function changeCount(roomId, item, delta) {
  const room = appState.rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!room.actuals[item]) room.actuals[item] = 0;
  room.actuals[item] = Math.max(0, room.actuals[item] + delta);
  saveToStorage();
  renderCurrentView();
}

function toggleSubItemStatus(item, event) {
  if (event) event.stopPropagation();
  alert(`「${item}」の進捗ステータスを切り替えました。`);
}

// --------------------------------------------------------------------------
// ページ4: 備品移動詳細モーダル (送付画像 5ページ目)
// --------------------------------------------------------------------------
function openModalDetail(itemTitle) {
  const modal = document.getElementById('modal-detail');
  const room = appState.rooms.find(r => r.id === appState.selectedRoomId);
  if (!room) return;

  document.getElementById('p5-item-title').innerText = itemTitle;
  const orig = room.targets[itemTitle] || 40;
  const actual = room.actuals[itemTitle] || 21;
  const remain = Math.max(0, orig - actual);
  const percent = Math.round((actual / orig) * 100) || 30;

  document.getElementById('p5-gauge-val').innerText = `${percent}%`;
  document.getElementById('p5-orig').innerText = orig;
  document.getElementById('p5-actual').innerText = actual;
  document.getElementById('p5-remain').innerText = remain;

  modal.classList.remove('hidden');
}

function closeModalDetail() {
  document.getElementById('modal-detail').classList.add('hidden');
}

// --------------------------------------------------------------------------
// 🖥️ 本部 & 🔒 管理者ビュー
// --------------------------------------------------------------------------
function renderHQView() {
  let totalTargets = 0, totalActuals = 0, completedCount = 0;
  appState.rooms.forEach(r => {
    if (r.status === 'complete') completedCount++;
    appState.equipment.forEach(item => {
      totalTargets += (r.targets[item] || 0);
      totalActuals += (r.actuals[item] || 0);
    });
  });

  const percent = totalTargets > 0 ? Math.round((totalActuals / totalTargets) * 100) : 0;
  document.getElementById('hq-overall-progress').innerText = `${percent}%`;
  document.getElementById('hq-overall-bar').style.width = `${percent}%`;
  document.getElementById('hq-completed-rooms').innerText = `${completedCount} / ${appState.rooms.length}`;

  const headerTr = document.getElementById('matrix-header');
  headerTr.innerHTML = '<th>教室 / エリア</th>';
  appState.equipment.forEach(item => headerTr.innerHTML += `<th>${item}</th>`);
  headerTr.innerHTML += '<th>状態</th>';

  const tbody = document.getElementById('matrix-body');
  tbody.innerHTML = '';
  appState.rooms.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${r.code} ${r.name}</strong></td>`;
    appState.equipment.forEach(item => {
      const tgt = r.targets[item] || 0;
      const act = r.actuals[item] || 0;
      tr.innerHTML += `<td>${act} / ${tgt}</td>`;
    });
    tr.innerHTML += `<td>${r.status === 'complete' ? '✅ 完了' : '🟡 作業中'}</td>`;
    tbody.appendChild(tr);
  });
}

function checkAdminPasscode() {
  if (document.getElementById('admin-passcode').value === '1234') {
    appState.isAdminAuthenticated = true;
    renderAdminView();
  } else {
    alert('パスコードが正しくありません。');
  }
}

function renderAdminView() {
  const authPanel = document.getElementById('admin-auth-panel');
  const content = document.getElementById('admin-content');
  if (!appState.isAdminAuthenticated) {
    authPanel.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }
  authPanel.classList.add('hidden');
  content.classList.remove('hidden');
}

function setPhase(p) {
  appState.phase = p;
  saveToStorage();
  renderCurrentView();
}

// --------------------------------------------------------------------------
// 初期化
// --------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  setupSwipeHandlers();
  renderCurrentView();
});
