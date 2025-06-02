import { useState } from 'react'

export default function ConflictAlert({ conflicts, onProceed, onCancel, fileName }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!conflicts || conflicts.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                Potential Content Conflict Detected
              </h3>
              <p className="text-sm text-yellow-700">
                Found {conflicts.length} similar document{conflicts.length > 1 ? 's' : ''} in your knowledge base
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">New File:</h4>
              <p className="text-blue-800">{fileName}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Similar Files Found:</h4>
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">{conflict.name}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        conflict.similarity >= 95 ? 'bg-red-100 text-red-800' :
                        conflict.similarity >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {conflict.similarity}% similar
                      </span>
                    </div>
                    
                    {showDetails && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Content preview:</p>
                        <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded mt-1">
                          {conflict.content_preview}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Content Previews'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <div className="text-sm text-gray-600">
            What would you like to do?
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel Upload
            </button>
            <button
              onClick={onProceed}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Upload Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}