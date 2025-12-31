import axios from 'axios';

// Create instance without baseURL to avoid slash confusion
const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

const BASE_PATH = '/transfers';

export const createTransfer = (expiresAt, maxDownloads) => {
    // expiresAt should be ISO string
    return api.post(BASE_PATH, {
        expires_at: expiresAt,
        max_downloads: parseInt(maxDownloads)
    });
};

export const getUploadUrl = (id, filename, contentType) => {
    return api.post(`${BASE_PATH}/${id}/upload-url`, { filename, content_type: contentType });
};

export const completeTransfer = (id) => {
    return api.post(`${BASE_PATH}/${id}/complete`);
};

export const getTransfer = (id) => {
    return api.get(`${BASE_PATH}/${id}/`);
};

export const getDownloadUrl = (id, expiryMinutes = 5) => {
    return api.get(`${BASE_PATH}/${id}/download-url?expiry_minutes=${expiryMinutes}`);
};

export const listTransfers = (limit = 10, offset = 0, status = '', sortBy = '', order = '') => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.append('status', status);
    if (sortBy) params.append('sort_by', sortBy);
    if (order) params.append('order', order);
    return api.get(`${BASE_PATH}?${params.toString()}`);
};

// Direct S3 upload (not using the main api instance)
export const uploadFileToS3 = async (url, file, onProgress) => {
    return axios.put(url, file, {
        headers: {
            'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });
};

export const deleteTransfer = (id) => {
    // Backend expects trailing slash for single object operations on root /{id}/
    return api.delete(`${BASE_PATH}/${id}/`);
};

export const updateTransfer = (id, data) => {
    // Backend expects trailing slash for single object operations on root /{id}/
    return api.patch(`${BASE_PATH}/${id}/`, data);
};

// TODO: Replace direct S3 URLs with application-level download links
export const shareDownload = (id, emails) => {
    return api.post(`${BASE_PATH}/${id}/share-download`, { emails });
};
