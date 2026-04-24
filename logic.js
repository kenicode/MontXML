// --- MontXML v5.0 Premium Logic ---

const appState = {
    files: new Map(), // filename -> { content: string, xml: Document, modified: boolean, items: [] }
    gridData: [],
    table: null,
    currentView: 'upload'
};

document.addEventListener('DOMContentLoaded', () => {
    initUI();
});

function initUI() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnOpenEditor = document.getElementById('btn-open-editor');
    const navHome = document.getElementById('nav-home');
    const navEditor = document.getElementById('nav-editor');

    // File Upload
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Navigation
    navHome.addEventListener('click', () => switchView('upload'));
    navEditor.addEventListener('click', () => {
        if (appState.files.size > 0) switchView('editor');
        else alert("Carregue arquivos XML primeiro.");
    });
    btnOpenEditor.addEventListener('click', () => switchView('editor'));

    // Actions
    document.getElementById('btn-save-modified-xml').addEventListener('click', () => downloadZip(true));
    document.getElementById('btn-save-all-xml').addEventListener('click', () => downloadZip(false));
    document.getElementById('btn-export-excel-all').addEventListener('click', () => exportExcel(false));
}

async function handleDrop(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
}

async function handleFiles(filesList) {
    updateStatus("Lendo arquivos...", "Processando...");
    const files = Array.from(filesList);
    
    for (const file of files) {
        if (file.name.endsWith('.xml')) {
            await processXML(file.name, await file.text());
        } else if (file.name.endsWith('.zip')) {
            await processZip(file);
        }
    }
    
    refreshUI();
}

async function processZip(zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const promises = [];
    zip.forEach((path, entry) => {
        if (entry.name.endsWith('.xml') && !entry.dir) {
            promises.push(entry.async("text").then(content => processXML(entry.name, content)));
        }
    });
    await Promise.all(promises);
}

async function processXML(filename, content) {
    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(content, "text/xml");
        const items = extractItems(xml, filename);
        appState.files.set(filename, { content, xml, modified: false, items });
        appState.gridData.push(...items);
    } catch (e) { console.error(e); }
}

function extractItems(xml, filename) {
    const getTag = (p, t) => { const el = p.getElementsByTagName(t)[0]; return el ? el.textContent : ''; };
    const ide = xml.getElementsByTagName('ide')[0];
    const emit = xml.getElementsByTagName('emit')[0];
    const prot = xml.getElementsByTagName('infProt')[0];
    const total = xml.getElementsByTagName('ICMSTot')[0];

    const nNF = getTag(ide, 'nNF');
    const dEmi = getTag(ide, 'dhEmi') || getTag(ide, 'dEmi');
    const chave = prot ? getTag(prot, 'chNFe') : '';

    return Array.from(xml.getElementsByTagName('det')).map(det => {
        const prod = det.getElementsByTagName('prod')[0];
        const imposto = det.getElementsByTagName('imposto')[0];
        const icms = imposto.getElementsByTagName('ICMS')[0].children[0];

        return {
            id: `${filename}-${det.getAttribute('nItem')}`,
            _filename: filename,
            _nItem: det.getAttribute('nItem'),
            chave, numero: nNF, data: dEmi,
            emitente: getTag(emit, 'xNome'),
            item_n: det.getAttribute('nItem'),
            codigo: getTag(prod, 'cProd'),
            descricao: getTag(prod, 'xProd'),
            ncm: getTag(prod, 'NCM'),
            cfop: getTag(prod, 'CFOP'),
            qCom: getTag(prod, 'qCom'),
            vUnCom: getTag(prod, 'vUnCom'),
            vProd: getTag(prod, 'vProd'),
            vBC: getTag(icms, 'vBC') || '0',
            vICMS: getTag(icms, 'vICMS') || '0',
            _modified: false
        };
    });
}

function switchView(view) {
    appState.currentView = view;
    document.querySelectorAll('.view-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`view-${view}`).classList.add('active');
    document.getElementById(`nav-${view === 'upload' ? 'home' : 'editor'}`).classList.add('active');
    document.getElementById('page-title').textContent = view === 'upload' ? 'Dashboard Conversor' : 'Editor Fiscal Avançado';

    if (view === 'editor') initGrid();
}

function initGrid() {
    if (appState.table) appState.table.destroy();
    appState.table = new Tabulator("#data-grid", {
        data: appState.gridData,
        layout: "fitColumns",
        pagination: "local",
        paginationSize: 20,
        columns: [
            {title:"Arquivo", field:"_filename", width:150, frozen:true},
            {title:"Nota", field:"numero", width:100},
            {title:"Item", field:"item_n", width:60},
            {title:"Descrição", field:"descricao", editor:"input", width:300},
            {title:"NCM", field:"ncm", editor:"input", width:100},
            {title:"CFOP", field:"cfop", editor:"input", width:100},
            {title:"Qtd", field:"qCom", editor:"number", width:100},
            {title:"Vlr Unit", field:"vUnCom", editor:"number", width:120},
            {title:"Editado", field:"_modified", hozAlign:"center", formatter:"tickCross", width:90},
        ]
    });

    appState.table.on("cellEdited", (cell) => {
        const row = cell.getRow().getData();
        row._modified = true;
        const file = appState.files.get(row._filename);
        if (file) {
            file.modified = true;
            syncXML(file.xml, row._nItem, cell.getField(), cell.getValue());
        }
        cell.getRow().update({_modified: true});
    });
}

function syncXML(xml, nItem, field, value) {
    const det = Array.from(xml.getElementsByTagName('det')).find(d => d.getAttribute('nItem') === nItem);
    if (!det) return;
    const map = { 'descricao': ['prod', 'xProd'], 'ncm': ['prod', 'NCM'], 'cfop': ['prod', 'CFOP'], 'qCom': ['prod', 'qCom'], 'vUnCom': ['prod', 'vUnCom'] };
    if (map[field]) {
        let el = det.getElementsByTagName(map[field][1])[0];
        if (el) el.textContent = value;
    }
}

async function downloadZip(onlyModified) {
    const zip = new JSZip();
    let count = 0;
    for (const [name, data] of appState.files) {
        if (!onlyModified || data.modified) {
            zip.file(name, new XMLSerializer().serializeToString(data.xml));
            count++;
        }
    }
    if (count === 0) return alert("Nada para salvar.");
    const blob = await zip.generateAsync({type:"blob"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = onlyModified ? "modificados.zip" : "todos.zip";
    a.click();
}

function exportExcel(onlyModified) {
    const data = onlyModified ? appState.gridData.filter(i => i._modified) : appState.gridData;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, "resumo.xlsx");
}

function refreshUI() {
    document.getElementById('results-area').style.display = 'block';
    document.getElementById('stat-files').textContent = appState.files.size;
    document.getElementById('stat-items').textContent = appState.gridData.length;
    
    const list = document.getElementById('file-list');
    list.innerHTML = '';
    Array.from(appState.files.keys()).slice(0, 12).forEach(name => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<i data-lucide="file-text" style="width:14px;color:var(--primary)"></i> <span>${name}</span>`;
        list.appendChild(item);
    });
    lucide.createIcons();
    updateStatus("Arquivos carregados", "Pronto");
}

function updateStatus(msg, stats) {
    document.getElementById('status-msg').textContent = msg;
}
