const UI = {
    btnFbLogin: document.getElementById('btnFbLogin'),
    fbStatus: document.getElementById('fbStatus'),
    postId: document.getElementById('postId'),
    accessToken: document.getElementById('accessToken'),
    btnFetchData: document.getElementById('btnFetchData'),
    btnLoadMock: document.getElementById('btnLoadMock'),
    fetchStatus: document.getElementById('fetchStatus'),
    
    chkUnique: document.getElementById('chkUnique'),
    keywordFilter: document.getElementById('keywordFilter'),
    tagCountFilter: document.getElementById('tagCountFilter'),
    drawCount: document.getElementById('drawCount'),
    
    totalComments: document.getElementById('totalComments'),
    eligibleComments: document.getElementById('eligibleComments'),
    
    btnDraw: document.getElementById('btnDraw'),
    resultsSection: document.getElementById('resultsSection'),
    winnersContainer: document.getElementById('winnersContainer'),
    btnRedraw: document.getElementById('btnRedraw')
};

let rawComments = [];
let filteredComments = [];
let currentToken = '';

// Facebook App ID provided by the user
const FB_APP_ID = '1731035901202654';

/* =========================================
   FB SDK Initialization
========================================= */
window.fbAsyncInit = function() {
    FB.init({
      appId      : FB_APP_ID,
      cookie     : true,
      xfbml      : true,
      version    : 'v19.0'
    });
      
    console.log("FB SDK Initialized.");
    
    // Check if user is already logged in
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
};

// Load the SDK asynchronously
(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/zh_TW/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function statusChangeCallback(response) {
    if (response.status === 'connected') {
        currentToken = response.authResponse.accessToken;
        UI.accessToken.value = currentToken;
        UI.fbStatus.innerHTML = `<span style="color: var(--secondary)">✅ 已授權登入 (使用您的權杖)</span>`;
        UI.btnFbLogin.style.display = 'none';
    } else {
        UI.btnFbLogin.style.display = 'inline-flex';
        UI.fbStatus.innerHTML = `尚未登入，請授權或手動填寫 Access Token`;
    }
}

/* =========================================
   Event Listeners
========================================= */

// FB Login Setup
UI.btnFbLogin.addEventListener('click', () => {
    FB.login(function(response) {
        statusChangeCallback(response);
    }, {scope: 'public_profile'});
});

// Update eligible count when filters change
UI.chkUnique.addEventListener('change', updateEligible);
UI.keywordFilter.addEventListener('input', updateEligible);
UI.tagCountFilter.addEventListener('input', updateEligible);

// Draw Buttons
UI.btnDraw.addEventListener('click', doDraw);
UI.btnRedraw.addEventListener('click', doDraw);

/* =========================================
   Data Fetching Logic
========================================= */

// Fetch Real Data from FB Graph API
UI.btnFetchData.addEventListener('click', async () => {
    const pId = UI.postId.value.trim();
    const token = UI.accessToken.value.trim();
    
    // Fallback: extracting post ID from URL if user pastes a full URL
    let actualPostId = pId;
    if(pId.includes('facebook.com') || pId.includes('fb.watch')) {
        const matches = pId.match(/(\d{10,})/g);
        if(matches && matches.length > 0) {
            actualPostId = matches[matches.length - 1]; // Assume the last long number is post id
            UI.postId.value = actualPostId;
        }
    }

    if(!actualPostId) return alert('請輸入 Facebook 貼文 ID');
    if(!token) return alert('請輸入 Access Token');
    
    UI.btnFetchData.disabled = true;
    UI.fetchStatus.textContent = "🔍 正在抓取留言中... (請耐心等候)";
    UI.fetchStatus.style.color = "var(--text-main)";
    rawComments = [];
    
    try {
        await fetchAllComments(actualPostId, token, `${actualPostId}/comments?limit=100&access_token=${token}`);
        UI.fetchStatus.textContent = `✅ 抓取完成！共取得 ${rawComments.length} 筆留言。`;
        UI.fetchStatus.style.color = "var(--secondary)";
        updateEligible();
    } catch (e) {
        UI.fetchStatus.textContent = "❌ 抓取失敗：" + e.message;
        UI.fetchStatus.style.color = "var(--danger)";
        console.error(e);
    } finally {
        UI.btnFetchData.disabled = false;
    }
});

async function fetchAllComments(pId, token, endpoint) {
    const url = `https://graph.facebook.com/v19.0/${endpoint}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if(data.error) {
        throw new Error(data.error.message);
    }
    
    if(data.data && data.data.length > 0) {
        data.data.forEach(c => {
            rawComments.push({
                id: c.id,
                name: c.from ? c.from.name : 'Unknown User',
                userId: c.from ? c.from.id : 'unknown_' + Math.random(),
                message: c.message || '',
                created_time: c.created_time
            });
        });
    }
    
    if(data.paging && data.paging.next) {
        UI.fetchStatus.textContent = `🔍 抓取中... 已取得 ${rawComments.length} 筆`;
        // recursively fetch next page
        const nextUrl = new URL(data.paging.next);
        const searchParms = new URLSearchParams(nextUrl.search);
        await fetchAllComments(pId, token, `${pId}/comments?${searchParms.toString()}`);
    }
}

// Load Mock Data
UI.btnLoadMock.addEventListener('click', () => {
    const mockNames = ['王小明', '李大華', '陳阿姨', '林強強', '張三', '李四', '王五', '陳阿姨', '林強強', '張同學', '郭主管'];
    const mockTexts = ['抽獎！', '讚讚讚', '想要抽獎 @某某', '卡', '抽獎 @A @B', '不錯喔', '路過', '讚讚讚', '抽獎 @朋友', '選我選我', '好想要！ @Z'];
    
    rawComments = [];
    // Generate 120 comments
    for(let i=0; i<120; i++) {
        const uIdx = Math.floor(Math.random() * mockNames.length); // will create duplicates
        const tIdx = Math.floor(Math.random() * mockTexts.length);
        rawComments.push({
            id: 'mock_'+i,
            name: mockNames[uIdx],
            userId: 'uid_'+uIdx, 
            message: mockTexts[tIdx] + (Math.random() > 0.4 ? ' 抽起來！' : ''),
            created_time: new Date().toISOString()
        });
    }
    
    UI.fetchStatus.textContent = `✅ 載入測試資料成功！產生了 ${rawComments.length} 筆虛擬留言。`;
    UI.fetchStatus.style.color = "var(--secondary)";
    updateEligible();
});

/* =========================================
   Filtering Logic
========================================= */
function updateEligible() {
    UI.totalComments.textContent = rawComments.length;
    
    if(rawComments.length === 0) {
        UI.eligibleComments.textContent = '0';
        UI.btnDraw.disabled = true;
        return;
    }
    
    const unique = UI.chkUnique.checked;
    const keyword = UI.keywordFilter.value.trim().toLowerCase();
    const tagReq = parseInt(UI.tagCountFilter.value) || 0;
    
    const seenUids = new Set();
    filteredComments = rawComments.filter(c => {
        // Unique Check
        if(unique) {
            if(seenUids.has(c.userId)) return false;
            seenUids.add(c.userId);
        }
        
        // Keyword Overlap
        if(keyword && !c.message.toLowerCase().includes(keyword)) {
            return false;
        }
        
        // Tags count (approximate by counting '@')
        if(tagReq > 0) {
            const matches = c.message.match(/@/g);
            const count = matches ? matches.length : 0;
            if(count < tagReq) return false;
        }
        
        return true;
    });
    
    UI.eligibleComments.textContent = filteredComments.length;
    
    if(filteredComments.length > 0) {
        UI.btnDraw.disabled = false;
        // Pulse effect on draw button to attract attention
        UI.btnDraw.style.animation = "pulse 1.5s infinite";
    } else {
        UI.btnDraw.disabled = true;
        UI.btnDraw.style.animation = "none";
    }
}

// Add simple pulse animation just in JS for quick style injection
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}`;
document.head.appendChild(style);

/* =========================================
   Drawing System
========================================= */
function doDraw() {
    const drawCount = parseInt(UI.drawCount.value) || 1;
    if(drawCount > filteredComments.length) {
        alert("⚠️ 抽獎人數大於符合資格的留言人數！請重新設定。");
        return;
    }
    
    // Stop the pulse animation on click
    UI.btnDraw.style.animation = "none";

    // Fisher-Yates shuffle
    const pool = [...filteredComments];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    const winners = pool.slice(0, drawCount);
    renderWinners(winners);
}

function renderWinners(winners) {
    UI.resultsSection.style.display = 'block';
    UI.winnersContainer.innerHTML = '';
    
    winners.forEach((w, index) => {
        const initial = w.name.charAt(0).toUpperCase();
        const delay = index * 0.15; // staggered fade in animation delay
        
        const card = document.createElement('div');
        card.className = 'winner-card';
        card.style.animationDelay = `${delay}s`;
        
        // Create random distinct gradient for avatar
        const hue = Math.floor(Math.random() * 360);
        const gradient = `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 60) % 360}, 80%, 60%))`;
        
        card.innerHTML = `
            <div class="winner-header">
                <div class="winner-avatar" style="background: ${gradient}">${initial}</div>
                <div class="winner-name">${w.name}</div>
            </div>
            <div class="winner-comment">
                "${w.message}"
            </div>
        `;
        UI.winnersContainer.appendChild(card);
    });
    
    // Smooth scroll down to results section
    setTimeout(() => {
        UI.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Initial state load
updateEligible();
