'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { EmbeddingService } from '../../lib/embeddingService'

export default function TestPage() {
  const [results, setResults] = useState('')
  const [loading, setLoading] = useState(false)

  const embeddingService = new EmbeddingService()

  const testEmbeddings = async () => {
    setLoading(true)
    setResults('Starting tests...\n')
    
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setResults('❌ No user logged in')
        return
      }

      const userId = session.user.id
      setResults(prev => prev + `✅ User ID: ${userId}\n`)

      // Test 1: Check existing files
      setResults(prev => prev + '\n📁 Checking existing files...\n')
      const { data: files } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)

      setResults(prev => prev + `Found ${files?.length || 0} files:\n`)
      files?.forEach(file => {
        setResults(prev => prev + `  - ${file.name} (has embedding: ${!!file.embedding})\n`)
      })

      // Test 2: Generate test embedding
      setResults(prev => prev + '\n🧮 Testing embedding generation...\n')
      const testText = "The weather today is sunny and warm. Perfect for a walk in the park."
      const embedding = await embeddingService.generateEmbedding(testText)
      
      if (embedding) {
        setResults(prev => prev + `✅ Embedding generated: ${embedding.length} dimensions\n`)
      } else {
        setResults(prev => prev + '❌ Failed to generate embedding\n')
        return
      }

      // Test 3: Test similarity function
      setResults(prev => prev + '\n🔍 Testing similarity search...\n')
      const similarDocs = await embeddingService.findSimilarDocuments(embedding, userId, 0.5) // Lower threshold for testing
      
      setResults(prev => prev + `Found ${similarDocs.length} similar documents\n`)
      similarDocs.forEach(doc => {
        setResults(prev => prev + `  - ${doc.name}: ${(doc.similarity * 100).toFixed(1)}%\n`)
      })

      // Test 4: Full conflict detection
      setResults(prev => prev + '\n⚔️ Testing full conflict detection...\n')
      const conflictResult = await embeddingService.detectConflicts(testText, 'test-file.txt', userId)
      
      setResults(prev => prev + `Has conflicts: ${conflictResult.hasConflicts}\n`)
      setResults(prev => prev + `Conflicts found: ${conflictResult.conflicts?.length || 0}\n`)
      if (conflictResult.error) {
        setResults(prev => prev + `Error: ${conflictResult.error}\n`)
      }

    } catch (error) {
      setResults(prev => prev + `❌ Test failed: ${error.message}\n`)
    } finally {
      setLoading(false)
    }
  }

  const clearFiles = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const confirmed = confirm('Are you sure you want to delete all your files? This cannot be undone.')
    if (!confirmed) return

    try {
      await supabase
        .from('files')
        .delete()
        .eq('user_id', session.user.id)
      
      setResults('✅ All files deleted\n')
    } catch (error) {
      setResults(`❌ Error deleting files: ${error.message}\n`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Embedding Debug Test</h1>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={testEmbeddings}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run Embedding Tests'}
          </button>
          
          <button
            onClick={clearFiles}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ml-4"
          >
            Clear All Files (for testing)
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 border">
          <h2 className="text-lg font-semibold mb-4">Test Results:</h2>
          <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {results || 'Click "Run Embedding Tests" to start debugging...'}
          </pre>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p><strong>How to use this test:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Make sure you have uploaded some text files first</li>
            <li>Click "Run Embedding Tests" to see what's happening</li>
            <li>Check the console for detailed logs</li>
            <li>Look for any errors in the API calls</li>
          </ol>
        </div>
      </div>
    </div>
  )
}