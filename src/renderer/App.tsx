import { useState } from 'react';
import { APP_NAME } from '@shared/constants';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="text-gray-600 mt-2">Family Calendar App</p>
        </header>

        <main className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              Welcome to {APP_NAME}! Your family calendar is ready.
            </p>
            <button
              onClick={() => setCount((count) => count + 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Count is {count}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
