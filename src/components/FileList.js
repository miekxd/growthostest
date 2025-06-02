import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function FileList({ userId, refreshTrigger }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    loadFiles()
  }, [userId, refreshTrigger])

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (fileId, fileName) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([`${userId}/${fileName}`])

      if (storageError) console.warn('Storage deletion error:', storageError)

      // Refresh the list
      loadFiles()
      setSelectedFile(null)
    } catch (error) {
      alert(`Error deleting file: ${error.message}`)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return <div className="text-center py-8">Loading your files...</div>
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No files uploaded yet.</p>
        <p className="text-sm">Upload your first file to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Your Files ({files.length})</h2>
      
      <div className="grid gap-4">
        {files.map((file) => (
          <div key={file.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{file.name}</h3>
                <div className="text-sm text-gray-500 space-x-4">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{file.type}</span>
                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                </div>
                {file.content && (
                  <p className="text-sm text-gray-600 mt-2">
                    {file.content.slice(0, 100)}...
                  </p>
                )}
              </div>
              
              <div className="flex space-x-2 ml-4">
                {file.content && (
                  <button
                    onClick={() => setSelectedFile(selectedFile?.id === file.id ? null : file)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {selectedFile?.id === file.id ? 'Hide' : 'View'}
                  </button>
                )}
                <button
                  onClick={() => deleteFile(file.id, file.name)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            
            {selectedFile?.id === file.id && file.content && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
                <h4 className="font-medium mb-2">File Content:</h4>
                <pre className="whitespace-pre-wrap text-gray-700">{file.content}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}