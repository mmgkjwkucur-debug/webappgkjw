const CONFIG = {
  rootFolderName: 'GKJW Uploads',
  rootFolderId: '1VSzwfJKXV6mEG8D-Ktd7ysMfTXuSV2W3',
  maxBytes: 10 * 1024 * 1024,
  allowedMediaTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
};

// Jalankan sekali dari editor Apps Script untuk meminta izin Google Drive.
function authorizeDrive() {
  const properties = PropertiesService.getScriptProperties();
  const folderId = properties.getProperty('FOLDER_UTAMA') || properties.getProperty('DRIVE_ROOT_FOLDER_ID') || CONFIG.rootFolderId;
  const folder = DriveApp.getFolderById(folderId);
  Logger.log('Drive siap: ' + folder.getName() + ' (' + folder.getId() + ')');
}

function testDriveAccess() {
  authorizeDrive();
  Logger.log('Akses Drive dan folder utama berhasil.');
}

function doGet(event) {
  try {
    const fileId = String(event && event.parameter && event.parameter.fileId || '').trim();
    if (fileId) {
      const expectedSecret = getUploadSecret();
      const requestedSecret = normalizeSecret(event.parameter.secret);
      if (!expectedSecret || requestedSecret !== expectedSecret) {
        return jsonResponse({ success: false, message: 'Preview dokumen tidak diizinkan.' });
      }

      const file = DriveApp.getFileById(fileId);
      return jsonResponse({
        success: true,
        fileName: file.getName(),
        mimeType: file.getMimeType(),
        fileData: Utilities.base64Encode(file.getBlob().getBytes())
      });
    }

    const properties = PropertiesService.getScriptProperties();
    const folderId = properties.getProperty('FOLDER_UTAMA') || properties.getProperty('DRIVE_ROOT_FOLDER_ID') || CONFIG.rootFolderId;
    const folder = DriveApp.getFolderById(folderId);
    return jsonResponse({ ok: true, service: 'GKJW Drive Upload', folderName: folder.getName() });
  } catch (error) {
    return jsonResponse({ ok: false, error: 'DriveApp tidak dapat mengakses folder utama.', detail: error.message });
  }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}');
    const fileName = sanitizeFileName(body.fileName);
    const mimeType = String(body.fileMime || 'application/octet-stream');
    const folderName = sanitizeFolderName(body.folderName || 'Dokumen GKJW');
    const base64 = String(body.fileData || '');
    const configuredSecret = getUploadSecret();
    const idempotencyKey = String(body.idempotencyKey || '').trim();

    const missingFields = [];
    if (!fileName) missingFields.push('fileName');
    if (!folderName) missingFields.push('folderName');
    if (!base64) missingFields.push('fileData');
    if (missingFields.length) return jsonResponse({ success: false, message: 'Payload upload tidak lengkap: ' + missingFields.join(', ') });
    if (!configuredSecret || normalizeSecret(body.secret) !== configuredSecret) return jsonResponse({ ok: false, error: 'Secret upload tidak valid.' }, 403);
    if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,160}$/.test(idempotencyKey)) return jsonResponse({ success: false, message: 'Idempotency key dokumen tidak valid.' });
    if (Utilities.base64Decode(base64).length > CONFIG.maxBytes) return jsonResponse({ success: false, message: 'Ukuran file melebihi 10 MB.' });
    if (!isAllowedType(mimeType, folderName)) return jsonResponse({ success: false, message: 'Tipe file tidak diizinkan.' });

    const properties = PropertiesService.getScriptProperties();
    const configuredRootFolderId = properties.getProperty('FOLDER_UTAMA') || properties.getProperty('DRIVE_ROOT_FOLDER_ID') || CONFIG.rootFolderId;
    let rootFolder;
    try {
      rootFolder = configuredRootFolderId
        ? DriveApp.getFolderById(configuredRootFolderId)
        : getOrCreateFolder(DriveApp.getRootFolder(), CONFIG.rootFolderName);
    } catch (error) {
      return jsonResponse({ success: false, message: 'Folder utama Drive tidak dapat diakses: ' + error.message });
    }

    let file;
    let uploadWarning = '';
    try {
      const idempotencyProperties = PropertiesService.getScriptProperties();
      const existingFileId = idempotencyProperties.getProperty('UPLOAD_' + idempotencyKey);
      if (existingFileId) {
        try {
          const existingFile = DriveApp.getFileById(existingFileId);
          return jsonResponse({ success: true, fileId: existingFile.getId(), fileName: existingFile.getName(), fileUrl: existingFile.getUrl(), idempotent: true });
        } catch (existingFileError) {
          idempotencyProperties.deleteProperty('UPLOAD_' + idempotencyKey);
        }
      }

      const targetFolder = getOrCreateFolder(rootFolder, folderName);
      const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
      file = targetFolder.createFile(blob);
    } catch (error) {
      return jsonResponse({ success: false, message: 'Gagal membuat file di folder Drive: ' + error.message });
    }

    try {
      PropertiesService.getScriptProperties().setProperty('UPLOAD_' + idempotencyKey, file.getId());
    } catch (error) {
      uploadWarning = 'File tersimpan, tetapi penanda idempotensi gagal disimpan. Upload berikutnya dapat membuat salinan.';
    }

    // Media artikel perlu dapat ditampilkan pada halaman publik; dokumen tetap privat di Drive.
    let warning = '';
    if (folderName === 'Artikel Media') {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (error) {
        warning = 'File tersimpan, tetapi link publik Drive tidak dapat diaktifkan oleh kebijakan akun.';
      }
    }

    return jsonResponse({
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: folderName === 'Artikel Media' ? 'https://drive.google.com/uc?export=view&id=' + file.getId() : file.getUrl(),
      warning: [uploadWarning, warning].filter(Boolean).join(' ')
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || 'Upload Google Drive gagal.' }, 500);
  }
}

function isAllowedType(mimeType, folderName) {
  return folderName === 'Artikel Media' ? CONFIG.allowedMediaTypes.indexOf(mimeType) >= 0 : CONFIG.allowedDocumentTypes.indexOf(mimeType) >= 0;
}

function getUploadSecret() {
  const properties = PropertiesService.getScriptProperties();
  return normalizeSecret(properties.getProperty('NEXT_UPLOAD_SECRET') || properties.getProperty('UPLOAD_SHARED_SECRET') || properties.getProperty('GAS_UPLOAD_SECRET'));
}

function normalizeSecret(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function sanitizeFileName(value) {
  const safeName = String(value || 'dokumen').replace(/[^a-zA-Z0-9._ -]/g, '').trim().slice(0, 120);
  return safeName || 'dokumen';
}

function sanitizeFolderName(value) {
  return String(value || 'Dokumen GKJW').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 80) || 'Dokumen GKJW';
}

function getOrCreateFolder(parent, name) {
  if (!parent || typeof parent.getFoldersByName !== 'function') {
    throw new Error('Parent folder tidak valid. Jangan menjalankan getOrCreateFolder langsung dari editor.');
  }
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function jsonResponse(payload, status) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
