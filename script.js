let glossary = {
    metadata: {
        version: "14.15",
        last_updated: new Date().toISOString(),
        editor: "Ваше Имя"
    },
    terms: []
};

function showError(message) {
    const banner = document.getElementById('errorBanner');
    banner.textContent = `ОШИБКА: ${message}`;
    banner.style.display = 'block';
    document.getElementById('systemStatus').textContent = 'ОШИБКА';
    document.getElementById('systemStatus').className = 'status-error';
}

function showNotification(message, type = 'success') {
    const banner = document.getElementById('notificationBanner');
    banner.textContent = message;
    banner.className = `notification-banner ${type}`;
    banner.style.display = 'block';
    setTimeout(() => {
        banner.style.display = 'none';
    }, 3000);
}

function validateGlossary(data) {
    const errors = [];
    if (!data.metadata) errors.push("Отсутствует секция metadata");
    if (!Array.isArray(data.terms)) errors.push("terms не является массивом");
    data.terms?.forEach((term, index) => {
        if (!term.id) errors.push(`Термин ${index}: отсутствует id`);
        if (!term.original) errors.push(`Термин ${index}: отсутствует original`);
        if (!term.category) errors.push(`Термин ${index}: отсутствует category`);
        if (!term.translations?.nominative) errors.push(`Термин ${index}: отсутствует nominative`);
        if (!term.translations?.genitive) errors.push(`Термин ${index}: отсутствует genitive`);
    });
    return errors;
}

function initGlossary() {
    try {
        const savedGlossary = localStorage.getItem('glossary');
        if (savedGlossary) {
            glossary = JSON.parse(savedGlossary);
            const errors = validateGlossary(glossary);
            if (errors.length > 0) {
                showError(`Повреждены данные: ${errors.join('; ')}`);
                return;
            }
            showNotification('Глоссарий загружен успешно');
        } else {
            showNotification('Глоссарий не найден. Импортируйте данные.', 'warning');
        }
        updateStats();
        renderTable();
    } catch (e) {
        showError(`Ошибка при загрузке: ${e.message}`);
    }
}

function updateStats() {
    document.getElementById('version').textContent = glossary.metadata.version;
    document.getElementById('totalTerms').textContent = glossary.terms.length;
    document.getElementById('lastUpdate').textContent = new Date(glossary.metadata.last_updated).toLocaleString('ru-RU');
}

function renderTable(terms = glossary.terms) {
    const tbody = document.getElementById('termsList');
    const noDataRow = document.getElementById('noDataRow');
    tbody.innerHTML = '';
    if (terms.length === 0) {
        tbody.appendChild(noDataRow);
        return;
    }
    terms.forEach(term => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${term.id}</td>
            <td>${term.original}</td>
            <td>${getCategoryName(term.category)}</td>
            <td>${term.type || '-'}</td>
            <td>${term.translations.nominative}</td>
            <td>${term.translations.genitive}</td>
            <td>${term.source.file}:${term.source.line}</td>
            <td>
                <button onclick="editTerm('${term.id}')">Редактировать</button>
                <button onclick="deleteTerm('${term.id}')">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getCategoryName(category) {
    const names = {
        'quality_level': 'Уровень качества',
        'material': 'Материал',
        'base_type': 'Базовый тип'
    };
    return names[category] || category;
}

document.getElementById('search').addEventListener('input', filterTerms);
document.getElementById('categoryFilter').addEventListener('change', filterTerms);

function filterTerms() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    let filtered = glossary.terms;
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(term => term.category === categoryFilter);
    }
    if (searchTerm) {
        filtered = filtered.filter(term => 
            term.original.toLowerCase().includes(searchTerm) ||
            term.translations.nominative.toLowerCase().includes(searchTerm) ||
            term.translations.genitive.toLowerCase().includes(searchTerm)
        );
    }
    renderTable(filtered);
}

const modal = document.getElementById('editModal');
const span = document.getElementsByClassName('close')[0];

span.onclick = function() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

document.getElementById('category').addEventListener('change', function(e) {
    const typeField = document.getElementById('typeField');
    typeField.style.display = e.target.value === 'base_type' ? 'block' : 'none';
});

document.getElementById('addTerm').addEventListener('click', function() {
    document.getElementById('modalTitle').textContent = 'Добавить термин';
    document.getElementById('termForm').reset();
    document.getElementById('termId').value = '';
    modal.style.display = 'block';
});

function editTerm(id) {
    const term = glossary.terms.find(t => t.id === id);
    if (!term) return;
    document.getElementById('modalTitle').textContent = 'Редактировать термин';
    document.getElementById('termId').value = term.id;
    document.getElementById('original').value = term.original;
    document.getElementById('category').value = term.category;
    document.getElementById('type').value = term.type || '';
    document.getElementById('nominative').value = term.translations.nominative;
    document.getElementById('genitive').value = term.translations.genitive;
    document.getElementById('sourceFile').value = term.source.file;
    document.getElementById('sourceLine').value = term.source.line;
    document.getElementById('notes').value = term.notes || '';
    const typeField = document.getElementById('typeField');
    typeField.style.display = term.category === 'base_type' ? 'block' : 'none';
    modal.style.display = 'block';
}

function deleteTerm(id) {
    if (confirm('Вы уверены, что хотите удалить этот термин?')) {
        glossary.terms = glossary.terms.filter(t => t.id !== id);
        saveGlossary();
        renderTable();
        showNotification('Термин удален');
    }
}

document.getElementById('termForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('termId').value;
    const termData = {
        original: document.getElementById('original').value,
        category: document.getElementById('category').value,
        type: document.getElementById('category').value === 'base_type' ? document.getElementById('type').value : undefined,
        translations: {
            nominative: document.getElementById('nominative').value,
            genitive: document.getElementById('genitive').value
        },
        source: {
            file: document.getElementById('sourceFile').value || 'manual_entry',
            line: parseInt(document.getElementById('sourceLine').value) || 0
        },
        notes: document.getElementById('notes').value
    };
    if (id) {
        const index = glossary.terms.findIndex(t => t.id === id);
        if (index !== -1) {
            glossary.terms[index] = { ...glossary.terms[index], ...termData };
        }
    } else {
        termData.id = generateId();
        glossary.terms.push(termData);
    }
    saveGlossary();
    renderTable();
    modal.style.display = 'none';
    showNotification('Термин сохранен');
});

function generateId() {
    const prefix = {
        'quality_level': 'ql',
        'material': 'mat',
        'base_type': 'bt'
    };
    const category = document.getElementById('category').value;
    const maxId = glossary.terms
        .filter(t => t.id.startsWith(prefix[category]))
        .map(t => parseInt(t.id.split('_')[1]))
        .reduce((max, current) => current > max ? current : max, 0);
    return `${prefix[category]}_${String(maxId + 1).padStart(3, '0')}`;
}

function saveGlossary() {
    glossary.metadata.last_updated = new Date().toISOString();
    localStorage.setItem('glossary', JSON.stringify(glossary));
    updateStats();
}

document.getElementById('exportBtn').addEventListener('click', function() {
    const dataStr = JSON.stringify(glossary, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `glossary_v${glossary.metadata.version}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showNotification('Глоссарий экспортирован');
});

document.getElementById('importBtn').addEventListener('click', function() {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedGlossary = JSON.parse(event.target.result);
            const errors = validateGlossary(importedGlossary);
            if (errors.length > 0) {
                showError(`Ошибка импорта: ${errors.join('; ')}`);
                return;
            }
            glossary = importedGlossary;
            saveGlossary();
            renderTable();
            showNotification('Глоссарий импортирован');
        } catch (error) {
            showError(`Ошибка при чтении файла: ${error.message}`);
        }
    };
    reader.readAsText(file);
});

document.getElementById('validateBtn').addEventListener('click', function() {
    const errors = validateGlossary(glossary);
    if (errors.length === 0) {
        showNotification('Глоссарий в порядке', 'success');
    } else {
        showError(`Обнаружены ошибки: ${errors.join('; ')}`);
    }
});

window.onload = initGlossary;

