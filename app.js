// =========================================================================
// 🟢 Google Apps Script (GAS) Web App URL
// =========================================================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxIjSqr8f7cs3cukSsxJFSQvU1VwaG9d_mTC0iBSTrK9U8OuHnEQ7tSe4agziJqLynd/exec"; 

const UNIT_PRICE = 4000;
let currentStep = 1;

// MULTI-SIZE QUANTITY STATE
const sizeQuantities = {
  'S': 0,
  'M': 1,
  'L': 0,
  'XL': 0,
  'XXL': 0,
  'XXXL': 0
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  updateCalculations();
});

// ACCORDION TOGGLE
function toggleAccordion(id) {
  const content = document.getElementById(id);
  if (!content) return;
  const isVisible = content.style.display === 'block';
  content.style.display = isVisible ? 'none' : 'block';
}

// MULTI-SIZE COUNTER ADJUSTMENT
function adjustSizeQty(sizeCode, delta) {
  let currentVal = sizeQuantities[sizeCode] || 0;
  let newVal = currentVal + delta;
  
  if (newVal < 0) newVal = 0;
  if (newVal > 20) newVal = 20;

  sizeQuantities[sizeCode] = newVal;

  // Update Input Element
  const inputEl = document.getElementById(`qty_${sizeCode}`);
  if (inputEl) inputEl.value = newVal;

  // Update Container Class for Highlight
  const rowEl = document.getElementById(`sizeRow_${sizeCode}`);
  if (rowEl) {
    if (newVal > 0) rowEl.classList.add('has-qty');
    else rowEl.classList.remove('has-qty');
  }

  updateCalculations();
}

// CALCULATE TOTALS AND BREAKDOWN
function getSelectedSizeSummary() {
  const selectedList = [];
  let totalQty = 0;

  for (const [size, qty] of Object.entries(sizeQuantities)) {
    if (qty > 0) {
      selectedList.push(`${size}×${qty}`);
      totalQty += qty;
    }
  }

  return {
    breakdownText: selectedList.length > 0 ? selectedList.join(', ') : '選択なし',
    totalQuantity: totalQty,
    totalPrice: totalQty * UNIT_PRICE
  };
}

function updateCalculations() {
  const summary = getSelectedSizeSummary();

  const summaryBreakdownEl = document.getElementById('summarySizeBreakdown');
  const summaryQtyEl = document.getElementById('summaryQty');
  const summaryTotalEl = document.getElementById('summaryTotalPrice');

  if (summaryBreakdownEl) summaryBreakdownEl.textContent = summary.breakdownText;
  if (summaryQtyEl) summaryQtyEl.textContent = `${summary.totalQuantity}枚`;
  if (summaryTotalEl) summaryTotalEl.textContent = `約 ¥${summary.totalPrice.toLocaleString()}`;
}

// STEP NAVIGATION
function switchStep(step) {
  currentStep = step;

  for (let i = 1; i <= 4; i++) {
    const sec = document.getElementById(`view${i}`);
    if (sec) sec.classList.remove('active');
    
    const ind = document.getElementById(`stepIndicator${i}`);
    if (ind) {
      ind.classList.remove('active', 'completed');
      if (i < step) ind.classList.add('completed');
      if (i === step) ind.classList.add('active');
    }
  }

  const targetView = document.getElementById(`view${step}`);
  if (targetView) targetView.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToFormStep() {
  switchStep(2);
}

// FORM SUBMISSION -> STEP 3 (CONFIRM)
function handleFormSubmit(e) {
  e.preventDefault();

  const summary = getSelectedSizeSummary();

  if (summary.totalQuantity === 0) {
    alert('少なくとも1つ以上のサイズで数量（1枚以上）を選択してください。');
    return;
  }

  const grade = document.getElementById('formGrade').value;
  const className = document.getElementById('formClass').value;
  const number = document.getElementById('formNumber').value;
  const name = document.getElementById('formName').value;

  document.getElementById('confirmClassFull').textContent = `${grade} ${className} ${number}番`;
  document.getElementById('confirmName').textContent = name;
  document.getElementById('confirmSizeQty').textContent = `${summary.breakdownText}（合計${summary.totalQuantity}枚）`;
  document.getElementById('confirmTotalPrice').textContent = `約 ¥${summary.totalPrice.toLocaleString()}`;

  switchStep(3);
}

// FINAL EXECUTION -> STEP 4 (SUCCESS & BACKGROUND SHEET SYNC)
async function executeOrderSubmission() {
  const summary = getSelectedSizeSummary();
  const orderId = `HOD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const grade = document.getElementById('formGrade').value;
  const className = document.getElementById('formClass').value;
  const number = document.getElementById('formNumber').value;
  const name = document.getElementById('formName').value;
  const notes = document.getElementById('formNotes') ? document.getElementById('formNotes').value : '';

  const now = new Date();
  const timestampStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  const newOrder = {
    timestamp: timestampStr,
    orderId: orderId,
    productName: '鳳櫻祭2026実行委員会オリジナルトレーナー',
    grade: grade,
    className: className,
    number: number,
    name: name,
    color: 'ネイビー',
    size: summary.breakdownText, // 例: S×1, L×2
    quantity: summary.totalQuantity,
    notes: notes,
    totalPrice: `約${summary.totalPrice}円`,
    status: '受付済'
  };

  // Local Storage バックアップ保存
  let localOrders = JSON.parse(localStorage.getItem('hoodie_orders') || '[]');
  localOrders.unshift(newOrder);
  localStorage.setItem('hoodie_orders', JSON.stringify(localOrders));

  // 完了画面へ切替
  document.getElementById('successOrderId').textContent = orderId;
  switchStep(4);

  // 紙ふぶき演出
  if (window.confetti) {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  }

  // Googleスプレッドシート(GAS)へのサイレント送信
  try {
    fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(newOrder)
    }).catch(err => console.log('Sheet Sync:', err));
  } catch (e) {
    console.log('Background sync initiated', e);
  }
}

function resetOrderForm() {
  document.getElementById('orderForm').reset();
  
  // Reset Quantities
  for (const key of Object.keys(sizeQuantities)) {
    sizeQuantities[key] = key === 'M' ? 1 : 0;
    const inputEl = document.getElementById(`qty_${key}`);
    if (inputEl) inputEl.value = sizeQuantities[key];

    const rowEl = document.getElementById(`sizeRow_${key}`);
    if (rowEl) {
      if (sizeQuantities[key] > 0) rowEl.classList.add('has-qty');
      else rowEl.classList.remove('has-qty');
    }
  }

  updateCalculations();
  switchStep(1);
}
