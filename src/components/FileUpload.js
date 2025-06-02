import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { EmbeddingService } from '../lib/embeddingService'
import ConflictAlert from './conflictAlert'

export default function FileUpload({ onUploadSuccess, userId }) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [showConflictAlert, setShowConflictAlert] = useState(false)
  const [conflictData, setConflictData] = useState(null)
  const [pendingUpload, setPendingUpload] = useState(null)

  const embeddingService = new EmbeddingService()

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('Analyzing file content...')

    try {
      // Read file content if it's text
      let content = null
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        content = await file.text()
      }

      // Only check for conflicts if we have text content
      if (content && content.trim().length > 0) {
        setMessage('Checking for similar content...')
        
        // Check for conflicts using embeddings
        const conflictResult = await embeddingService.detectConflicts(content, file.name, userId)
        
        if (conflictResult.error) {
          setMessage(`Warning: Could not check for conflicts. ${conflictResult.error}`)
          // Continue with upload even if conflict detection fails
        } else if (conflictResult.hasConflicts) {
          // Show conflict alert
          setConflictData(conflictResult)
          setPendingUpload({ file, content, embedding: conflictResult.embedding })
          setShowConflictAlert(true)
          setUploading(false)
          return
        }

        // No conflicts, proceed with upload
        await proceedWithUpload(file, content, conflictResult.embedding)
      } else {
        // No text content to analyze, upload directly
        await proceedWithUpload(file, content, null)
      }

      // Clear the input
      event.target.value = ''
      
    } catch (error) {
      setMessage(`Error: ${error.message}`)
      setUploading(false)
    }
  }

  const proceedWithUpload = async (file, content, embedding) => {
    try {
      setMessage('Uploading file...')

      // Upload file to storage
      const fileName = `${userId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Save file info to database with embedding
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: userId,
          name: file.name,
          size: file.size,
          type: file.type,
          content: content,
          embedding: embedding
        })

      if (dbError) throw dbError

      setMessage('File uploaded successfully!')
      onUploadSuccess()
      
    } catch (error) {
      throw error
    } finally {
      setUploading(false)
    }
  }

  const handleConflictProceed = async () => {
    setShowConflictAlert(false)
    setUploading(true)
    
    try {
      await proceedWithUpload(
        pendingUpload.file, 
        pendingUpload.content, 
        pendingUpload.embedding
      )
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
    
    setPendingUpload(null)
    setConflictData(null)
  }

  const handleConflictCancel = () => {
    setShowConflictAlert(false)
    setPendingUpload(null)
    setConflictData(null)
    setUploading(false)
    setMessage('')
  }

  return (
    <>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Upload a file</h3>
            <p className="text-gray-500">Select a file to add to your Second Brain</p>
            <p className="text-sm text-gray-400 mt-1">
              We'll automatically check for similar content
            </p>
          </div>
          
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          
          {uploading && (
            <div className="text-blue-600">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              {message || 'Processing...'}
            </div>
          )}
          
          {message && !uploading && (
            <div className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Conflict Alert Modal */}
      {showConflictAlert && (
        <ConflictAlert
          conflicts={conflictData?.conflicts}
          fileName={pendingUpload?.file?.name}
          onProceed={handleConflictProceed}
          onCancel={handleConflictCancel}
        />
      )}
    </>
  )
}