document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const fileInfoArea = document.getElementById('fileInfoArea');
  const fileNameEl = document.getElementById('fileName');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  const accessCodeContainer = document.getElementById('accessCodeContainer');
  const accessCodeInput = document.getElementById('accessCodeInput');
  
  const loadingArea = document.getElementById('loadingArea');
  const errorBox = document.getElementById('errorBox');
  const errorMessage = document.getElementById('errorMessage');
  
  const resultArea = document.getElementById('resultArea');
  const copyAllBtn = document.getElementById('copyAllBtn');
  
  const card1Content = document.getElementById('card1Content');
  const card2Content = document.getElementById('card2Content');
  const card3Content = document.getElementById('card3Content');
  
  let selectedFile = null;
  let lastAnalysisResult = null;

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2';
    toast.textContent = message;
    
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });
    
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function handleFile(file) {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('PDF 파일만 업로드할 수 있습니다.');
      resetFile();
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      showToast('4MB 이하의 PDF만 업로드할 수 있습니다.');
      resetFile();
      return;
    }

    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileInfoArea.classList.remove('hidden');
    dropZone.classList.add('border-emerald-400', 'bg-emerald-50/60');
    submitBtn.removeAttribute('disabled');
    showToast('PDF 파일이 준비되었습니다.');
  }

  function resetFile() {
    selectedFile = null;
    fileInput.value = '';
    fileInfoArea.classList.add('hidden');
    fileNameEl.textContent = '';
    dropZone.classList.remove('border-emerald-400', 'bg-emerald-50/60');
    submitBtn.setAttribute('disabled', 'true');
  }

  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-emerald-500', 'bg-emerald-100/50');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-emerald-500', 'bg-emerald-100/50');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-emerald-500', 'bg-emerald-100/50');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile();
  });

  submitBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      showToast('먼저 PDF 파일을 업로드해 주세요.');
      return;
    }

    errorBox.classList.add('hidden');
    resultArea.classList.add('hidden');
    loadingArea.classList.remove('hidden');
    submitBtn.setAttribute('disabled', 'true');

    try {
      const headers = { 'Content-Type': 'application/octet-stream' };
      const accessCode = accessCodeInput.value.trim() || sessionStorage.getItem('accessCode');
      if (accessCode) {
        headers['x-access-code'] = accessCode;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: headers,
        body: selectedFile
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.code === 'ACCESS_CODE_REQUIRED') {
          sessionStorage.removeItem('accessCode');
          accessCodeContainer.classList.remove('hidden');
          accessCodeInput.focus();
        }
        throw new Error(data.error || `요청에 실패했습니다. (HTTP 상태코드: ${response.status})`);
      }

      if (accessCode) {
        sessionStorage.setItem('accessCode', accessCode);
        accessCodeContainer.classList.add('hidden');
      }

      lastAnalysisResult = data;
      renderResults(data);

    } catch (err) {
      errorMessage.textContent = err.message || '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      errorBox.classList.remove('hidden');
    } finally {
      loadingArea.classList.add('hidden');
      submitBtn.removeAttribute('disabled');
    }
  });

  function renderResults(data) {
    // 카드 1: 객관식 문제 렌더링
    card1Content.replaceChildren();
    const mcList = Array.isArray(data.card1_multiple_choice) ? data.card1_multiple_choice : [];
    mcList.forEach((text) => {
      const div = document.createElement('div');
      div.className = 'bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line';
      div.textContent = text;
      card1Content.appendChild(div);
    });

    // 카드 2: 서술형/단답형 문제 렌더링
    card2Content.replaceChildren();
    const essayList = Array.isArray(data.card2_essay) ? data.card2_essay : [];
    essayList.forEach((text) => {
      const div = document.createElement('div');
      div.className = 'bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line';
      div.textContent = text;
      card2Content.appendChild(div);
    });

    // 카드 3: 모둠 활동 퀴즈 렌더링
    card3Content.replaceChildren();
    const quizList = Array.isArray(data.card3_group_quiz) ? data.card3_group_quiz : [];
    quizList.forEach((text, index) => {
      const div = document.createElement('div');
      div.className = 'flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5';
      
      const badge = document.createElement('span');
      badge.className = 'flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center mt-0.5';
      badge.textContent = String(index + 1);

      const p = document.createElement('p');
      p.className = 'text-sm text-slate-700 leading-relaxed';
      p.textContent = text;

      div.appendChild(badge);
      div.appendChild(p);
      card3Content.appendChild(div);
    });

    resultArea.classList.remove('hidden');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  copyAllBtn.addEventListener('click', async () => {
    if (!lastAnalysisResult) return;

    const mcText = (lastAnalysisResult.card1_multiple_choice || []).join('\n\n');
    const essayText = (lastAnalysisResult.card2_essay || []).join('\n\n');
    const quizText = (lastAnalysisResult.card3_group_quiz || []).map((item, idx) => `퀴즈 ${idx + 1}: ${item}`).join('\n\n');

    const fullText = `[개념 확인용 객관식 문제]
${mcText}

[사고력을 키우는 서술형·단답형 문제]
${essayText}

[모둠 활동용 핵심 퀴즈]
${quizText}`;

    try {
      await navigator.clipboard.writeText(fullText);
      showToast('전체 문제 결과가 클립보드에 복사되었습니다!');
    } catch (err) {
      showToast('복사에 실패했습니다. 직접 선택해서 복사해 주세요.');
    }
  });
});
