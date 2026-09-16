/*
  File Upload component — maps to powerappsui.com "File Upload".
  createFileUpload({ mountId, acceptExtensions, maxSizeMB, onChange }).
  No backend — files are validated client-side (extension + size) and kept
  as lightweight metadata ({ name, size, type }) for the list UI; the
  browser File objects themselves aren't persisted anywhere.
*/

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ICON_BY_EXT = {
  pdf: 'fa-solid fa-file-pdf',
  xlsx: 'fa-solid fa-file-excel',
  docx: 'fa-solid fa-file-word',
};

function createFileUpload({ mountId, acceptExtensions = ['pdf', 'xlsx', 'docx'], maxSizeMB = 25, initialFiles = [], onChange = () => {} }) {
  const mount = document.getElementById(mountId);
  let files = [...initialFiles];
  let errorText = '';

  function extOf(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  function render() {
    mount.innerHTML = `
      <div class="upload-dropzone" id="${mountId}-dropzone">
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <div class="upload-dropzone-main">Click to upload or drag and drop</div>
        <div class="upload-dropzone-sub">SUPPORTED DOCS: PDF, XLSX, DOCX — MAX ${maxSizeMB} MB EACH</div>
        <input type="file" id="${mountId}-input" multiple accept="${acceptExtensions.map((e) => `.${e}`).join(',')}" style="display:none;">
      </div>
      ${errorText ? `<div class="upload-error">${errorText}</div>` : ''}
      <div class="upload-file-list" id="${mountId}-list">
        ${files.map((f, i) => `
          <div class="upload-file-card">
            <span class="upload-file-icon"><i class="${FILE_ICON_BY_EXT[extOf(f.name)] || 'fa-solid fa-file'}"></i></span>
            <div class="upload-file-meta">
              <div class="upload-file-name">${f.name}</div>
              <div class="upload-file-size">${formatFileSize(f.size)}</div>
            </div>
            <button type="button" class="upload-file-delete" data-index="${i}" aria-label="Remove ${f.name}"><i class="fa-solid fa-trash"></i></button>
          </div>
        `).join('')}
      </div>
    `;

    const dropzone = document.getElementById(`${mountId}-dropzone`);
    const input = document.getElementById(`${mountId}-input`);

    dropzone.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => handleFiles(e.target.files));

    ['dragover', 'dragenter'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); });
    });
    dropzone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

    document.getElementById(`${mountId}-list`).querySelectorAll('.upload-file-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        files.splice(Number(btn.dataset.index), 1);
        onChange([...files]);
        render();
      });
    });
  }

  function handleFiles(fileList) {
    errorText = '';
    const accepted = [];
    for (const file of fileList) {
      const ext = extOf(file.name);
      if (!acceptExtensions.includes(ext)) {
        errorText = `"${file.name}" isn't a supported file type.`;
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        errorText = `"${file.name}" is over the ${maxSizeMB} MB limit.`;
        continue;
      }
      accepted.push({ name: file.name, size: file.size, type: file.type });
    }
    files = [...files, ...accepted];
    onChange([...files]);
    render();
  }

  render();

  return {
    getFiles: () => [...files],
    setFiles: (f) => { files = [...f]; render(); },
  };
}
