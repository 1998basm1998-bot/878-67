import { GoogleGenAI } from 'https://esm.run/@google/genai';

let sessions = {};
try {
    sessions = JSON.parse(localStorage.getItem('saved_sessions')) || {};
} catch(e) {
    sessions = {};
}

let currentSessionId = localStorage.getItem('current_session_id');

function createDefaultFiles() {
    return {
        'index.html': `<div class="welcome">\n  <h1>مرحباً بك!</h1>\n  <p>انا هنا للمساعدة في برمجة واجهتك وتطبيقك.</p>\n</div>`,
        'style.css': `body {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n  background: #f0f4f8;\n  font-family: sans-serif;\n}\n.welcome {\n  text-align: center;\n  background: white;\n  padding: 30px;\n  border-radius: 10px;\n  box-shadow: 0 4px 10px rgba(0,0,0,0.1);\n}\nh1 { color: #0056b3; }`,
        'script.js': `console.log("البيئة جاهزة للعمل!");`
    };
}

let projectFiles = {};
let chatMessagesData = [];
let chatName = '';

function saveSession() {
    sessions[currentSessionId] = {
        name: chatName,
        files: projectFiles,
        messages: chatMessagesData,
        lastModified: Date.now()
    };
    localStorage.setItem('saved_sessions', JSON.stringify(sessions));
    localStorage.setItem('current_session_id', currentSessionId);
}

function createNewSession() {
    currentSessionId = 'sess_' + Date.now();
    chatName = 'مشروع ' + new Date().toLocaleTimeString('ar-EG');
    projectFiles = createDefaultFiles();
    chatMessagesData = [
        {
            role: 'model',
            text: 'أهلاً بك! يمكنك الآن الاستيراد من GitHub (عبر الزر بجانب مربع النص)، وبإمكانك تعديل اسم المشروع أو حذفه والعودة للسجل من الشريط العلوي للدردشة.',
            thinking: null,
            id: 'msg-' + Date.now()
        }
    ];
    saveSession();
}

if (!currentSessionId || !sessions[currentSessionId]) {
    createNewSession();
} else {
    projectFiles = sessions[currentSessionId].files || createDefaultFiles();
    chatMessagesData = sessions[currentSessionId].messages || [];
    chatName = sessions[currentSessionId].name || 'مشروع جديد';
}


let activeTab = 'preview';

const elements = {
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatMessages: document.getElementById('chatMessages'),
    previewIframe: document.getElementById('previewIframe'),
    runBtn: document.getElementById('runBtn'),
    engineerToggle: document.getElementById('engineerModeToggle'),
    dynamicTabs: document.getElementById('dynamicTabs'),
    dynamicContents: document.getElementById('dynamicContents'),
    deviceDesktopBtn: document.getElementById('deviceDesktopBtn'),
    deviceTabletBtn: document.getElementById('deviceTabletBtn'),
    deviceMobileBtn: document.getElementById('deviceMobileBtn'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    previewBtn: document.querySelector('.tab-btn[data-target="preview"]'),
    
    // New Elements
    currentChatName: document.getElementById('currentChatName'),
    editChatNameBtn: document.getElementById('editChatNameBtn'),
    deleteChatBtn: document.getElementById('deleteChatBtn'),
    historyChatsBtn: document.getElementById('historyChatsBtn'),
    importGithubBtn: document.getElementById('importGithubBtn'),
    
    // Modals
    githubModal: document.getElementById('githubModal'),
    githubUrlInput: document.getElementById('githubUrlInput'),
    githubImportConfirm: document.getElementById('githubImportConfirm'),
    githubImportCancel: document.getElementById('githubImportCancel'),
    
    historyModal: document.getElementById('historyModal'),
    historyList: document.getElementById('historyList'),
    historyCloseBtn: document.getElementById('historyCloseBtn'),
    newChatSessionBtn: document.getElementById('newChatSessionBtn')
};

// UI Initialization
function loadSessionUI() {
    elements.currentChatName.innerText = chatName;
    elements.chatMessages.innerHTML = '';
    chatMessagesData.forEach(msg => {
        renderMessageHtml(msg.role, msg.text, msg.thinking, msg.id);
    });
    renderTabs();
    updatePreview();
}

function renderMessageHtml(role, text, thinking, id) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.id = id;
    
    let contentHtml = `<div class="message-content">`;
    if (thinking) {
        contentHtml += `<button class="thinking-toggle-btn" onclick="toggleThinking(this)">🤔 أظهر/أخفِ التفكير العميق (المهندس)</button>`;
        contentHtml += `<div class="thinking-block" style="display:none;">${thinking.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    }
    contentHtml += `<div class="bubble">${text}</div></div>`;
    
    msgDiv.innerHTML = contentHtml;
    elements.chatMessages.appendChild(msgDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addMessage(role, text, thinking = null) {
    const id = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    chatMessagesData.push({ role, text, thinking, id });
    saveSession();
    renderMessageHtml(role, text, thinking, id);
    return id;
}

function updateMessage(id, text, thinking = null) {
    const msg = chatMessagesData.find(m => m.id === id);
    if (msg) {
        msg.text = text;
        msg.thinking = thinking;
        saveSession();
    }
    
    const msgDiv = document.getElementById(id);
    if (msgDiv) {
        let contentHtml = `<div class="message-content">`;
        if (thinking) {
            contentHtml += `<button class="thinking-toggle-btn" onclick="toggleThinking(this)">🤔 أظهر/أخفِ التفكير العميق (المهندس)</button>`;
            contentHtml += `<div class="thinking-block" style="display:none;">${thinking.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
        }
        contentHtml += `<div class="bubble">${text}</div></div>`;
        
        msgDiv.innerHTML = contentHtml;
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
}

// Initialize User Interface
function renderTabs() {
    elements.dynamicTabs.innerHTML = '';
    elements.dynamicContents.innerHTML = '';

    for (const filename of Object.keys(projectFiles)) {
        // Tab Button
        const btn = document.createElement('button');
        btn.className = `tab-btn ${activeTab === filename ? 'active' : ''}`;
        btn.setAttribute('data-target', filename);
        btn.innerText = filename;
        btn.onclick = () => switchTab(filename);
        elements.dynamicTabs.appendChild(btn);

        // Content Area 
        const contentDiv = document.createElement('div');
        contentDiv.className = `tab-content ${activeTab === filename ? 'active' : ''}`;
        contentDiv.id = `${filename}-content`;
        
        const textarea = document.createElement('textarea');
        textarea.className = 'code-editor';
        textarea.id = `editor-${filename}`;
        textarea.spellcheck = false;
        textarea.value = projectFiles[filename];
        textarea.oninput = (e) => { 
            projectFiles[filename] = e.target.value; 
            saveSession();
        };
        
        contentDiv.appendChild(textarea);
        elements.dynamicContents.appendChild(contentDiv);
    }
}

function switchTab(target) {
    activeTab = target;
    
    // Update preview button state
    if(target === 'preview') {
        elements.previewBtn.classList.add('active');
        document.getElementById('preview-content').classList.add('active');
        elements.copyBtn.style.display = 'none';
    } else {
        elements.previewBtn.classList.remove('active');
        document.getElementById('preview-content').classList.remove('active');
        elements.copyBtn.style.display = 'inline-block';
    }

    // Update dynamic tabs and contents
    document.querySelectorAll('#dynamicTabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-target') === target);
    });
    document.querySelectorAll('#dynamicContents .tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${target}-content`);
    });
}

function updatePreview() {
    let combinedCss = '';
    let combinedJs = '';
    let htmlContent = projectFiles['index.html'] || '';
    
    for (const [filename, content] of Object.entries(projectFiles)) {
        if (filename.endsWith('.css')) combinedCss += content + '\n';
        if (filename.endsWith('.js') && filename !== 'sw.js') combinedJs += content + '\n';
    }

    const srcDoc = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${combinedCss}</style>
</head>
<body>
    ${htmlContent}
    <script>${combinedJs}<\/script>
</body>
</html>`;
    elements.previewIframe.srcdoc = srcDoc;
}

// Event Listeners
elements.previewBtn.onclick = () => switchTab('preview');
elements.runBtn.addEventListener('click', () => {
    // تحديث المحتويات من مربعات النصوص قبل التشغيل
    for (const filename of Object.keys(projectFiles)) {
        const editorEl = document.getElementById(`editor-${filename}`);
        if (editorEl) projectFiles[filename] = editorEl.value;
    }
    updatePreview();
    switchTab('preview');
});

// Devices Toggle
function updateDeviceBtnStyle(activeBtn) {
    [elements.deviceDesktopBtn, elements.deviceTabletBtn, elements.deviceMobileBtn].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}
elements.deviceDesktopBtn.addEventListener('click', () => {
    elements.previewIframe.className = 'device-desktop';
    updateDeviceBtnStyle(elements.deviceDesktopBtn);
});
elements.deviceTabletBtn.addEventListener('click', () => {
    elements.previewIframe.className = 'device-tablet';
    updateDeviceBtnStyle(elements.deviceTabletBtn);
});
elements.deviceMobileBtn.addEventListener('click', () => {
    elements.previewIframe.className = 'device-mobile';
    updateDeviceBtnStyle(elements.deviceMobileBtn);
});

// Copy Code
elements.copyBtn.addEventListener('click', () => {
    if (activeTab && activeTab !== 'preview') {
        const editorEl = document.getElementById(`editor-${activeTab}`);
        if (editorEl) {
            navigator.clipboard.writeText(editorEl.value).then(() => {
                const originalText = elements.copyBtn.innerHTML;
                elements.copyBtn.innerHTML = '✅ تم النسخ';
                setTimeout(() => { elements.copyBtn.innerHTML = originalText; }, 2000);
            });
        }
    }
});

// Download Project Source Code
elements.downloadBtn.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
        alert("جار تحميل مكتبة الضغط، يرجى الانتظار والمحاولة مرة أخرى.");
        return;
    }
    const zip = new JSZip();
    
    // Create base full HTML file tying the resources together
    let finalHtmlString = `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>مشروعي</title>\n`;
    
    for (const filename of Object.keys(projectFiles)) {
        if (filename.endsWith('.css')) finalHtmlString += `    <link rel="stylesheet" href="./${filename}">\n`;
    }
    finalHtmlString += `</head>\n<body>\n    ${projectFiles['index.html'] || ''}\n`;
    for (const filename of Object.keys(projectFiles)) {
        if (filename.endsWith('.js')) finalHtmlString += `    <script src="./${filename}"><\/script>\n`;
    }
    finalHtmlString += `</body>\n</html>`;

    for (const [filename, content] of Object.entries(projectFiles)) {
        if (filename === 'index.html') {
            zip.file(filename, finalHtmlString);
        } else {
            zip.file(filename, content);
        }
    }
    
    try {
        const blob = await zip.generateAsync({type:"blob"});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Vanilla-Project.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error("فشل إنشاء الملف المضغوط", err);
    }
});


// Initialization Flow
loadSessionUI();

elements.engineerToggle.addEventListener('change', () => {
    if (elements.engineerToggle.checked) {
        addMessage('model', 'تم تفعيل <b>وضع المهندس (التفكير العميق) 🧠</b>. سأدقق الطلب وأفكر به قبل كتابة الأكواد.');
    } else {
        addMessage('model', 'تم التبديل إلى <b>الوضع السريع ⚡</b>. سأنفذ الأوامر بكفاءة.');
    }
});

// History & Chat Name Modals/Buttons Logic
elements.editChatNameBtn.addEventListener('click', () => {
    const newName = prompt('أدخل الاسم الجديد للمشروع:', chatName);
    if (newName && newName.trim()) {
        chatName = newName.trim();
        elements.currentChatName.innerText = chatName;
        saveSession();
    }
});

elements.deleteChatBtn.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من رغبتك بحذف هذا المشروع وهذه الدردشة نهائياً؟')) {
        delete sessions[currentSessionId];
        localStorage.setItem('saved_sessions', JSON.stringify(sessions));
        
        // Find another session or create new
        const keys = Object.keys(sessions);
        if (keys.length > 0) {
            currentSessionId = keys[keys.length - 1];
        } else {
            createNewSession();
        }
        localStorage.setItem('current_session_id', currentSessionId);
        window.location.reload();
    }
});

elements.historyChatsBtn.addEventListener('click', () => {
    elements.historyList.innerHTML = '';
    const sortedKeys = Object.keys(sessions).sort((a,b) => (sessions[b].lastModified || 0) - (sessions[a].lastModified || 0));
    
    sortedKeys.forEach(key => {
        const sess = sessions[key];
        const item = document.createElement('div');
        item.className = `history-item ${key === currentSessionId ? 'active' : ''}`;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'history-name';
        nameDiv.innerText = sess.name || 'بدون اسم';
        
        const d = new Date(sess.lastModified || parseInt(key.replace('sess_', '')));
        const dateDiv = document.createElement('div');
        dateDiv.className = 'history-date';
        dateDiv.innerText = d.toLocaleDateString('ar-EG', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        
        item.appendChild(nameDiv);
        item.appendChild(dateDiv);
        
        item.addEventListener('click', () => {
            currentSessionId = key;
            localStorage.setItem('current_session_id', currentSessionId);
            window.location.reload();
        });
        
        elements.historyList.appendChild(item);
    });
    
    elements.historyModal.classList.add('active');
});
elements.historyCloseBtn.addEventListener('click', () => elements.historyModal.classList.remove('active'));
elements.newChatSessionBtn.addEventListener('click', () => {
    createNewSession();
    window.location.reload();
});

// GitHub Integration
elements.importGithubBtn.addEventListener('click', () => {
    elements.githubUrlInput.value = '';
    elements.githubModal.classList.add('active');
});

elements.githubImportCancel.addEventListener('click', () => elements.githubModal.classList.remove('active'));

elements.githubImportConfirm.addEventListener('click', async () => {
    const url = elements.githubUrlInput.value.trim().replace('.git', '');
    elements.githubModal.classList.remove('active');
    
    if (!url) return;
    
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
        addMessage('model', 'عذراً، الرابط غير صحيح. الرجاء التأكد من أنه رابط مستودع GitHub صالح.');
        return;
    }
    
    const owner = match[1];
    const repo = match[2];
    
    addMessage('user', `جلب الملفات من المستودع: ${owner}/${repo}`);
    const loadingId = addMessage('model', `<span class="loading">جاري قراءة واستيراد ملفات المستودع، يرجى الانتظار...⏳</span>`);
    
    try {
        let treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);
        let treeData = await treeRes.json();
        
        if (treeData.message && (treeData.message.includes('empty') || treeData.message.includes('Not Found'))) {
            treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`);
            treeData = await treeRes.json();
        }
        
        if (!treeData.tree) {
             throw new Error('لم يتم العثور على ملفات أو أن المستودع خاص (Private).');
        }
        
        const filesToFetch = treeData.tree.filter(item => item.type === 'blob' && 
            (item.path.endsWith('.html') || item.path.endsWith('.css') || item.path.endsWith('.js') || item.path.endsWith('.json')));
        
        if (filesToFetch.length === 0) {
            throw new Error('لا توجد ملفات مدعومة (HTML, CSS, JS, JSON) في هذا المستودع.');
        }
        
        let fetchedCount = 0;
        let limit = Math.min(filesToFetch.length, 25); // Limit to avoid browser crash/rate limits.
        
        for (let i = 0; i < limit; i++) {
             const file = filesToFetch[i];
             // Try main, fallback to master
             let rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/main/${file.path}`);
             if (!rawRes.ok) {
                 rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/${file.path}`);
             }
             
             if (rawRes.ok) {
                 const content = await rawRes.text();
                 projectFiles[file.path] = content;
                 fetchedCount++;
             }
        }
        
        saveSession();
        renderTabs();
        updatePreview();
        switchTab('preview');
        
        updateMessage(loadingId, `✅ تم استيراد ${fetchedCount} ملف بنجاح من المستودع! يمكنك الآن معاينتها والتعديل عليها بحرية.`);
    } catch(err) {
        updateMessage(loadingId, `❌ فشل الاستيراد: ${err.message}`);
    }
});

window.toggleThinking = function(button) {
    const block = button.nextElementSibling;
    if (block.style.display === 'none') {
        block.style.display = 'block';
    } else {
        block.style.display = 'none';
    }
};

let isThinking = false;

// AI Logic
async function askAI() {
    if (isThinking) return;

    const query = elements.chatInput.value.trim();
    if (!query) return;

    addMessage('user', query);
    elements.chatInput.value = '';
    
    const isEngineerMode = elements.engineerToggle.checked;
    const loadingId = addMessage('model', `<span class="loading">${isEngineerMode ? 'يتم التفكير والتدقيق العميق قبل الرد...' : 'جاري الفهم والتنفيذ السريع...'}</span>`);

    isThinking = true;

    try {
        let apiKey;
        try {
            apiKey = process.env.GEMINI_API_KEY;
        } catch(e) {
            apiKey = null;
        }
        
        if (!apiKey) {
            apiKey = localStorage.getItem('GEMINI_API_KEY');
            if (!apiKey) {
                apiKey = prompt("إصدار GitHub/Vanilla: يرجى إدخال مفتاح Gemini API Key الخاص بك (سيتم حفظه محلياً في متصفحك):");
                if (apiKey) {
                    localStorage.setItem('GEMINI_API_KEY', apiKey);
                }
            }
        }

        if (!apiKey) throw new Error("مفتاح API غير متوفر.");

        const ai = new GoogleGenAI({ apiKey });
        
        const baseRule = `
قاعدة هامة جداً وثابتة: إذا سألك المستخدم في أي وقت وبأي صيغة من برمجك، أو من الذي صممك، أو من صنعك، يجب أن تجيب حرفياً: "تم تصميمي بواسطة شركة فن التقنية الحديثة المبرمج أبو أمير" دون إضافة أي نصوص أخرى في الإجابة على سؤاله. 
تحذير هام: أنت تبني تطبيقاً / موقعاً مستقلاً سيتم عرضه في نافذة المعاينة (iframe). لا تقم أبداً بإرجاع أكواد تخص نظام الدردشة أو لوحة المحرر نفسه. ركز فقط على طلب المستخدم في إطار مشروعه الشخصي المعزول.`;

        const jsonStructurePrompt = `{
  ${isEngineerMode ? '"thinking": "اكتب تحليلك العميق، والتفكير المنطقي، وتجنب الأخطاء هنا",\n  ' : ''}"message": "رسالة توضيحية لما تم إنجازه للرد على المستخدم بشكل لطيف وسريع وملخص",
  "files": {
    "index.html": "كود الـHTML حصراً ما بداخل الـ body، ولا تكتب وسم body، ولا html ولا head",
    "style.css": "كود CSS الخاص بالمشروع",
    "script.js": "كود JavaScript الخاص بالمشروع"
    // يمكنك إضافة عدة ملفات أخرى للقاموس إذا تطلب الأمر (مثل manifest.json أو ملفات إضافية حسب الطلب)
  }
}`;

        let systemInstruction = '';
        if (isEngineerMode) {
            systemInstruction = `أنت المهندس الذكي، مطور ويب ومدقق برمجي صارم.
تقوم ببرمجة الواجهات عبر (HTML, CSS, Vanilla JS) حصراً بدقة متناهية وبدون أخطاء.
يمكنك دعم إنشاء ملفات إضافية بناء على طلب العميل مثلا manifest.json أو غيره من الملفات وإرجاعها في حقل files كزوج (اسم الملف: محتواه).
${baseRule}
يجب أن يكون الرد بتنسيق JSON حصراً بدون أي نص خارجي.
هيكل JSON الإلزامي:
${jsonStructurePrompt}`;
        } else {
            systemInstruction = `أنت مطور ويب سريع وممتاز، ردودك فوريّة (Vanilla HTML, CSS, JS).
ردودك لطيفة وسريعة. يمكنك إنشاء ملفات إضافية إذا احتاجها المشروع عبر حقل files.
${baseRule}
يجب أن يكون الرد بتنسيق JSON حصراً بدون أي نص خارجي.
هيكل JSON الإلزامي:
${jsonStructurePrompt}`;
        }

        // Build prompt string of current files state
        let currentStateStr = "";
        for (const [filename, content] of Object.entries(projectFiles)) {
            const editorEl = document.getElementById(`editor-${filename}`);
            const textValue = editorEl ? editorEl.value : content;
            currentStateStr += `\n[${filename}]:\n${textValue}\n`;
        }

        const prompt = `طلب المستخدم: ${query}\n\n=== ملفات المشروع الحالية ===${currentStateStr}`;

        const selectedModel = isEngineerMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

        const response = await ai.models.generateContent({
            model: selectedModel,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: isEngineerMode ? 0.2 : 0.7
            }
        });

        let textResponse = response.text || '';
        const match = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            textResponse = match[1];
        }

        const data = JSON.parse(textResponse);
        let filesUpdated = false;

        // Support backward compatibility or new files dictionary structure
        if (data.files && typeof data.files === 'object') {
            for (const [filename, content] of Object.entries(data.files)) {
                projectFiles[filename] = content;
                filesUpdated = true;
            }
        } else {
            // legacy fallback just in case
            if (data.html !== undefined) { projectFiles['index.html'] = data.html; filesUpdated = true; }
            if (data.css !== undefined) { projectFiles['style.css'] = data.css; filesUpdated = true; }
            if (data.js !== undefined || data.javascript !== undefined) { 
                projectFiles['script.js'] = data.js || data.javascript; 
                filesUpdated = true; 
            }
        }

        if (filesUpdated) {
            saveSession();
            renderTabs();
            updatePreview();
            // Automatically switch to preview
            switchTab('preview');
        }

        const thinkingText = data.thinking !== undefined && data.thinking !== null ? String(data.thinking) : null;
        updateMessage(loadingId, data.message || 'تم التحديث بنجاح.', thinkingText);

    } catch (error) {
        console.error(error);
        try {
            const errorStr = (error.message || String(error)).toLowerCase();
            let displayMessage = 'عذراً حدث خطأ. (يرجى المحاولة مجدداً أو تبسيط الطلب)';
            
            if (errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('resource_exhausted')) {
                displayMessage = 'عذراً، لقد استهلكت الحد الأقصى المسموح به من الطلبات (Quota Exceeded). يرجى الانتظار والمحاولة لاحقاً أو التحقق من خطة اشتراكك في حسابك على Google.';
            } else if (errorStr.includes('parse') || errorStr.includes('json') || errorStr.includes('token') || errorStr.includes('syntax')) {
                displayMessage = 'حدث خطأ في فهم المطلوب أدى إلى انقطاع الاستجابة. يرجى المحاولة بصيغة مختلفة.';
            } else {
                displayMessage = 'عذراً حدث خطأ: ' + (error.message || error);
            }
            
            updateMessage(loadingId, displayMessage);
        } catch(e) {
            updateMessage(loadingId, 'عذراً حدث خطأ غير متوقع.');
        }
    } finally {
        isThinking = false;
    }
}

elements.sendBtn.addEventListener('click', askAI);
elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        askAI();
    }
});

addMessage('model', 'أهلاً بك! لقد تم تحديث واجهة المحرر بالخصائص الجديدة: (أجهزة للمعاينة، أزرار النسخ، إنشاء ملفات متعددة كـ manifest.json، وتحميل المشروع كامل كملف مضغوط ZIP). كيف يمكنني مساعدتك اليوم؟');
