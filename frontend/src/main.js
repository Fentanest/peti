import './style.css';
import {ConvertFiles, SelectDirectory, SelectFiles} from '../wailsjs/go/main/App';

let files = [];
let outputDir = "";

document.querySelector('#app').innerHTML = `
    <h1>TXT to Excel Converter</h1>
    
    <div id="drop-zone" class="drop-zone">
        여기에 .txt 파일을 드래그 앤 드롭 하세요<br>(또는 클릭하여 파일 선택)
    </div>
    
    <ul id="file-list" class="file-list"></ul>
    
    <div class="controls">
        <div class="dir-selector">
            <input type="text" id="output-dir" readonly placeholder="기본 저장 경로 (현재 폴더)" />
            <button id="btn-select-dir">경로 변경</button>
        </div>
        <button id="btn-start" class="start-btn">변환 시작</button>
        <div id="result-msg"></div>
    </div>
`;

const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');
const btnSelectDir = document.getElementById('btn-select-dir');
const outputDirInput = document.getElementById('output-dir');
const btnStart = document.getElementById('btn-start');
const resultMsg = document.getElementById('result-msg');

// Native Wails Drop event
window.runtime.EventsOn("wails:file-drop", (x, y, paths) => {
    paths.forEach(path => {
        if (path.toLowerCase().endsWith('.txt')) {
            // Extract filename from path
            const name = path.replace(/^.*[\\\\/]/, '');
            addFile(path, name);
        }
    });
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    // Actual paths are handled by wails:file-drop
});

dropZone.addEventListener('click', async () => {
    try {
        const selectedFiles = await SelectFiles();
        if (selectedFiles && selectedFiles.length > 0) {
            selectedFiles.forEach(path => {
                const name = path.replace(/^.*[\\\\/]/, '');
                addFile(path, name);
            });
        }
    } catch (err) {
        console.error(err);
    }
});

function addFile(path, name) {
    if (!files.some(f => f.path === path)) {
        files.push({ path, name });
        renderFileList();
    }
}

function removeFile(index) {
    files.splice(index, 1);
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = '';
    files.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.draggable = true;
        
        li.innerHTML = `
            <span class="file-item-name">${file.name}</span>
            <button class="remove-btn" onclick="removeFile(${index})">삭제</button>
        `;
        
        // Simple drag and drop reordering
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
        });
        
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex && !isNaN(fromIndex)) {
                // Swap or move
                const movedItem = files.splice(fromIndex, 1)[0];
                files.splice(toIndex, 0, movedItem);
                renderFileList();
            }
        });
        
        fileList.appendChild(li);
    });
}

// Make removeFile global so it can be called from onclick
window.removeFile = removeFile;

btnSelectDir.addEventListener('click', async () => {
    try {
        const dir = await SelectDirectory();
        if (dir) {
            outputDir = dir;
            outputDirInput.value = dir;
        }
    } catch (err) {
        console.error(err);
    }
});

btnStart.addEventListener('click', async () => {
    if (files.length === 0) {
        resultMsg.innerText = "파일을 먼저 추가해주세요.";
        resultMsg.style.color = "red";
        return;
    }
    
    resultMsg.innerText = "변환 중...";
    resultMsg.style.color = "black";
    btnStart.disabled = true;
    
    try {
        const filePaths = files.map(f => f.path);
        const result = await ConvertFiles(filePaths, outputDir);
        resultMsg.innerText = result;
        if (result.includes("성공")) {
            resultMsg.style.color = "green";
        } else {
            resultMsg.style.color = "red";
        }
    } catch (err) {
        resultMsg.innerText = "오류 발생: " + err;
        resultMsg.style.color = "red";
    } finally {
        btnStart.disabled = false;
    }
});
