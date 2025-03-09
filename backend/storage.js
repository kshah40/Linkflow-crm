import { supabase } from './supabaseClient'

// Storage bucket names
export const STORAGE_BUCKETS = {
    DOCUMENTS: 'documents',
    AVATARS: 'avatars',
    ATTACHMENTS: 'attachments'
}

// Create storage buckets if they don't exist
export const initializeStorage = async () => {
    for (const bucket of Object.values(STORAGE_BUCKETS)) {
        const { data, error } = await supabase.storage.createBucket(bucket, {
            public: false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: [
                'image/*',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        })
        if (error && error.message !== 'Bucket already exists') {
            throw error
        }
    }
}

// Upload file to storage
export const uploadFile = async (bucket, file, path = '') => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = path ? `${path}/${fileName}` : fileName

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

    return {
        fileName,
        filePath,
        publicUrl
    }
}

// Download file from storage
export const downloadFile = async (bucket, filePath) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath)

    if (error) throw error
    return data
}

// Delete file from storage
export const deleteFile = async (bucket, filePath) => {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

    if (error) throw error
}

// List files in a bucket/folder
export const listFiles = async (bucket, path = '') => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .list(path)

    if (error) throw error
    return data
}

// Get signed URL for temporary access
export const getSignedUrl = async (bucket, filePath, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn)

    if (error) throw error
    return data.signedUrl
}

// Move/Copy file within storage
export const moveFile = async (bucket, fromPath, toPath) => {
    const { error } = await supabase.storage
        .from(bucket)
        .move(fromPath, toPath)

    if (error) throw error
}

// Create folder in storage
export const createFolder = async (bucket, folderPath) => {
    const { error } = await supabase.storage
        .from(bucket)
        .upload(`${folderPath}/.keep`, new Blob(['']))

    if (error) throw error
}

// Update storage policies
export const updateStoragePolicies = async () => {
    // Documents bucket policy
    await supabase.storage.from(STORAGE_BUCKETS.DOCUMENTS).createBucket({
        public: false,
        allowedMimeTypes: ['application/pdf', 'image/*'],
        fileSizeLimit: 52428800
    })

    // Avatars bucket policy
    await supabase.storage.from(STORAGE_BUCKETS.AVATARS).createBucket({
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880
    })

    // Attachments bucket policy
    await supabase.storage.from(STORAGE_BUCKETS.ATTACHMENTS).createBucket({
        public: false,
        fileSizeLimit: 52428800
    })
} 