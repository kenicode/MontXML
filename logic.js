// --- Fiscal Processor Logic ---
const FiscalProcessor = {
    parseXML: async (file) => {
        const text = await file.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        
        const getTag = (parent, tag) => {
            const el = parent.getElementsByTagName(tag)[0];
            return el ? el.textContent : '';
        };

        const ide = xml.getElementsByTagName('ide')[0];
        const emit = xml.getElementsByTagName('emit')[0];
        const dest = xml.getElementsByTagName('dest')[0];
        const total = xml.getElementsByTagName('ICMSTot')[0];
        const infProt = xml.getElementsByTagName('infProt')[0];
        const pag = xml.getElementsByTagName('detPag');

        const chave = infProt ? getTag(infProt, 'chNFe') : '';
        const nNF = getTag(ide, 'nNF');
        const dEmi = getTag(ide, 'dhEmi') || getTag(ide, 'dEmi');
        
        const emitente = {
            cnpj: getTag(emit, 'CNPJ'),
            nome: getTag(emit, 'xNome'),
            uf: getTag(emit, 'UF'),
            mun: getTag(emit, 'xMun')
        };

        const destinatario = dest ? {
            documento: getTag(dest, 'CNPJ') || getTag(dest, 'CPF'),
            nome: getTag(dest, 'xNome'),
            uf: getTag(dest, 'UF')
        } : { documento: '', nome: 'Consumidor Final', uf: '' };

        const vNF = getTag(total, 'vNF');
        
        const pagamentos = Array.from(pag).map(p => ({
            meio: getTag(p, 'tPag'),
            valor: getTag(p, 'vPag')
        }));
        const tPag = pagamentos.map(p => p.meio).join(', ');
        const vPagTotal = pagamentos.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);

        const items = Array.from(xml.getElementsByTagName('det')).map(det => {
            const prod = det.getElementsByTagName('prod')[0];
            const imposto = det.getElementsByTagName('imposto')[0];
            const icms = imposto.getElementsByTagName('ICMS')[0];
            const icmsData = icms ? icms.children[0] : null;
            
            return {
                chave: chave,
                numero: nNF,
                data: dEmi,
                emitente: emitente.nome,
                cnpj_emit: emitente.cnpj,
                destinatario: destinatario.nome,
                item_n: det.getAttribute('nItem'),
                codigo: getTag(prod, 'cProd'),
                descricao: getTag(prod, 'xProd'),
                ncm: getTag(prod, 'NCM'),
                cfop: getTag(prod, 'CFOP'),
                uCom: getTag(prod, 'uCom'),
                qCom: parseFloat(getTag(prod, 'qCom')),
                vUnCom: parseFloat(getTag(prod, 'vUnCom')),
                vProd: parseFloat(getTag(prod, 'vProd')),
                vDesc: parseFloat(getTag(prod, 'vDesc') || 0),
                vOutro: parseFloat(getTag(prod, 'vOutro') || 0),
                cst_icms: icmsData ? (getTag(icmsData, 'CST') || getTag(icmsData, 'CSOSN')) : '',
                vBC_icms: parseFloat(getTag(icmsData, 'vBC') || 0),
                vICMS: parseFloat(getTag(icmsData, 'vICMS') || 0),
                pICMS: parseFloat(getTag(icmsData, 'pICMS') || 0),
                vNF_Total: parseFloat(vNF),
                meio_pagamento: tPag,
                valor_pago: vPagTotal
            };
        });

        return items;
    }
};

// --- UI Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnSelectText = document.getElementById('btn-select-text');
    const btnClear = document.getElementById('btn-clear');
    const btnProcess = document.getElementById('btn-process');
    const fileList = document.getElementById('file-list');
    const fileSummary = document.getElementById('file-summary');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('status-text');
    const processInfo = document.getElementById('process-info');
    const fileCountText = document.getElementById('file-count');
    const duplicateBanner = document.getElementById('duplicate-banner');
    const duplicateMsg = document.getElementById('duplicate-msg');
    const btnViewDupes = document.getElementById('btn-view-dupes');
    const btnRemoveDupes = document.getElementById('btn-remove-dupes');

    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalConfirm = document.getElementById('btn-modal-confirm');

    let uploadedFiles = []; // Array of { file, isDuplicate: bool, id: string }

    // Init Lucide
    if (window.lucide) window.lucide.createIcons();

    // Modal Control Functions
    const showModal = () => {
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    const hideModal = () => {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Event Listeners
    dropZone.addEventListener('click', () => fileInput.click());
    
    btnClear.addEventListener('click', () => {
        if (uploadedFiles.length === 0) return;
        showModal();
    });

    btnModalCancel.addEventListener('click', hideModal);
    
    btnModalConfirm.addEventListener('click', () => {
        uploadedFiles = [];
        checkDuplicates();
        updateUI();
        hideModal();
    });

    // Close modal on escape or clicking outside
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideModal();
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    btnRemoveDupes.addEventListener('click', () => {
        const names = new Set();
        const unique = [];
        uploadedFiles.forEach(item => {
            if (!names.has(item.file.name)) {
                names.add(item.file.name);
                unique.push(item);
            }
        });
        uploadedFiles = unique;
        checkDuplicates();
        updateUI();
    });

    btnViewDupes.addEventListener('click', () => {
        const dupes = document.querySelectorAll('.file-item.duplicate');
        dupes.forEach(el => {
            el.style.transform = 'scale(1.05)';
            el.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
            setTimeout(() => {
                el.style.transform = '';
                el.style.boxShadow = '';
            }, 1000);
        });
    });

    function handleFiles(files) {
        const newItems = Array.from(files)
            .filter(f => f.name.endsWith('.xml'))
            .map(f => ({
                file: f,
                id: Math.random().toString(36).substr(2, 9),
                isDuplicate: false
            }));

        uploadedFiles = [...uploadedFiles, ...newItems];
        checkDuplicates();
        updateUI();
        
        fileInput.value = '';
    }

    function checkDuplicates() {
        const counts = {};
        uploadedFiles.forEach(item => {
            counts[item.file.name] = (counts[item.file.name] || 0) + 1;
        });

        uploadedFiles.forEach(item => {
            item.isDuplicate = counts[item.file.name] > 1;
        });

        const totalDupes = Object.values(counts).filter(c => c > 1).length;
        if (totalDupes > 0) {
            duplicateBanner.style.display = 'flex';
            duplicateMsg.textContent = `${totalDupes} nomes repetidos encontrados.`;
        } else {
            duplicateBanner.style.display = 'none';
        }
    }

    function updateUI() {
        if (uploadedFiles.length > 0) {
            fileSummary.style.display = 'block';
            btnSelectText.textContent = "Selecionar Mais";
            btnProcess.disabled = false;
            renderFileList();
            fileCountText.textContent = `${uploadedFiles.length} arquivos carregados`;
            statusText.textContent = `Pronto para processar ${uploadedFiles.length} arquivos.`;
        } else {
            fileSummary.style.display = 'none';
            btnSelectText.textContent = "Selecionar Arquivos";
            btnProcess.disabled = true;
            statusText.textContent = 'Aguardando arquivos...';
            duplicateBanner.style.display = 'none';
        }
        
        if (window.lucide) window.lucide.createIcons();
    }

    function renderFileList() {
        fileList.innerHTML = '';
        uploadedFiles.forEach((item) => {
            const div = document.createElement('div');
            div.className = `file-item ${item.isDuplicate ? 'duplicate' : ''}`;
            div.title = item.file.name;
            
            div.innerHTML = `
                <span>${item.file.name}</span>
                <button class="remove-file-btn" data-id="${item.id}">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                </button>
            `;
            
            div.querySelector('.remove-file-btn').onclick = (e) => {
                e.stopPropagation();
                removeFile(item.id);
            };
            
            fileList.appendChild(div);
        });
        if (window.lucide) window.lucide.createIcons();
    }

    function removeFile(id) {
        uploadedFiles = uploadedFiles.filter(f => f.id !== id);
        checkDuplicates();
        updateUI();
    }

    btnProcess.addEventListener('click', async () => {
        if (uploadedFiles.length === 0) return;

        btnProcess.disabled = true;
        processInfo.style.display = 'block';
        let allItems = [];

        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileObj = uploadedFiles[i];
            const progress = ((i + 1) / uploadedFiles.length) * 100;
            progressBar.style.width = `${progress}%`;
            statusText.textContent = `Lendo: ${fileObj.file.name} (${i + 1}/${uploadedFiles.length})`;
            
            try {
                const items = await FiscalProcessor.parseXML(fileObj.file);
                allItems = allItems.concat(items);
            } catch (err) {
                console.error(`Erro ao processar ${fileObj.file.name}:`, err);
            }
        }

        statusText.textContent = `Compilando registros...`;
        
        try {
            const worksheet = XLSX.utils.json_to_sheet(allItems);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo Fiscal");
            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Resumo_Fiscal_Consolidado_${dateStr}.xlsx`);
            statusText.textContent = `✅ Sucesso! Excel gerado com ${allItems.length} itens.`;
        } catch (err) {
            statusText.textContent = `❌ Erro ao gerar Excel.`;
        }
        
        btnProcess.disabled = false;
    });
});
