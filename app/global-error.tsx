// Error global: muestra error y botón de reintentar
"use client"

export default function GlobalError({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
          <h1 className="text-3xl font-bold text-red-600 mb-4">¡Ocurrió un error global!</h1>
          <p className="text-lg text-gray-700 mb-2">{error.message}</p>
          <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Reintentar</button>
        </div>
      </body>
    </html>
  )
}
