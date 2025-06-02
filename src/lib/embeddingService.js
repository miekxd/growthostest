import { supabase } from './supabase'

export class EmbeddingService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    console.log('🔑 OpenAI API Key present:', !!this.apiKey)
    console.log('🔑 API Key starts with sk-:', this.apiKey?.startsWith('sk-'))
  }

  // Generate embedding for text content
  async generateEmbedding(text) {
    console.log('📝 Generating embedding for text:', text.substring(0, 100) + '...')
    
    if (!text || text.trim().length === 0) {
      console.log('❌ No text provided for embedding')
      return null
    }

    if (!this.apiKey) {
      console.error('❌ OpenAI API key is missing!')
      throw new Error('OpenAI API key is not configured')
    }

    try {
      console.log('🚀 Calling OpenAI API...')
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002'
        })
      })

      console.log('📡 OpenAI API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ OpenAI API error:', response.status, errorText)
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Embedding generated successfully, length:', data.data[0].embedding.length)
      return data.data[0].embedding
    } catch (error) {
      console.error('❌ Error generating embedding:', error)
      throw error
    }
  }

  // Check for similar documents in the database
  async findSimilarDocuments(embedding, userId, similarityThreshold = 0.85) {
    console.log('🔍 Searching for similar documents...')
    console.log('👤 User ID:', userId)
    console.log('📊 Similarity threshold:', similarityThreshold)
    console.log('🧮 Embedding length:', embedding?.length)

    if (!embedding) {
      console.log('❌ No embedding provided for similarity search')
      return []
    }

    try {
      // First, let's check what files exist for this user
      const { data: allFiles, error: filesError } = await supabase
        .from('files')
        .select('id, name, content, embedding')
        .eq('user_id', userId)

      console.log('📁 All files for user:', allFiles?.length || 0)
      allFiles?.forEach(file => {
        console.log(`  - ${file.name}, has embedding: ${!!file.embedding}`)
      })

      if (filesError) {
        console.error('❌ Error fetching files:', filesError)
      }

      // Try the similarity search
      console.log('🚀 Calling find_similar_documents function...')
      const { data, error } = await supabase.rpc('find_similar_documents', {
        query_embedding: embedding,
        user_id: userId,
        similarity_threshold: similarityThreshold,
        match_count: 5
      })

      console.log('📊 Similarity search results:', data?.length || 0)
      
      if (error) {
        console.error('❌ Error in similarity search:', error)
        
        // Try manual similarity calculation as fallback
        console.log('🔄 Attempting manual similarity calculation...')
        return await this.manualSimilarityCheck(embedding, userId, similarityThreshold)
      }

      if (data && data.length > 0) {
        console.log('✅ Similar documents found:')
        data.forEach(doc => {
          console.log(`  - ${doc.name}: ${(doc.similarity * 100).toFixed(1)}% similar`)
        })
      } else {
        console.log('ℹ️ No similar documents found')
      }

      return data || []
    } catch (error) {
      console.error('❌ Error in similarity search:', error)
      return []
    }
  }

  // Manual similarity calculation fallback
  async manualSimilarityCheck(queryEmbedding, userId, threshold) {
    try {
      const { data: files } = await supabase
        .from('files')
        .select('id, name, content, embedding')
        .eq('user_id', userId)
        .not('embedding', 'is', null)

      const similarities = []
      
      for (const file of files || []) {
        if (file.embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, file.embedding)
          console.log(`📊 Manual similarity for ${file.name}: ${(similarity * 100).toFixed(1)}%`)
          
          if (similarity > threshold) {
            similarities.push({
              id: file.id,
              name: file.name,
              content: file.content,
              similarity: similarity
            })
          }
        }
      }

      return similarities
    } catch (error) {
      console.error('❌ Manual similarity calculation failed:', error)
      return []
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  // Process file content and detect conflicts
  async detectConflicts(fileContent, fileName, userId) {
    console.log('🔍 Starting conflict detection...')
    console.log('📄 File name:', fileName)
    console.log('📝 Content length:', fileContent?.length || 0)

    try {
      // Generate embedding for the new file
      console.log('1️⃣ Generating embedding...')
      const embedding = await this.generateEmbedding(fileContent)
      
      if (!embedding) {
        console.log('❌ Failed to generate embedding')
        return { hasConflicts: false, conflicts: [] }
      }

      console.log('2️⃣ Searching for similar documents...')
      // Find similar documents
      const similarDocs = await this.findSimilarDocuments(embedding, userId, 0.85)

      console.log('3️⃣ Processing results...')
      if (similarDocs.length > 0) {
        console.log('⚠️ CONFLICTS DETECTED!')
        const conflicts = similarDocs.map(doc => ({
          id: doc.id,
          name: doc.name,
          similarity: Math.round(doc.similarity * 100),
          content_preview: doc.content ? doc.content.substring(0, 100) + '...' : 'No preview available'
        }))

        return {
          hasConflicts: true,
          conflicts: conflicts,
          embedding: embedding
        }
      }

      console.log('✅ No conflicts detected')
      return { hasConflicts: false, conflicts: [], embedding: embedding }
    } catch (error) {
      console.error('❌ Error in conflict detection:', error)
      return { hasConflicts: false, conflicts: [], error: error.message }
    }
  }
}