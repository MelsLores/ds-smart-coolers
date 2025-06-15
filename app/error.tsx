// Error de página: muestra mensaje de error
"use client"

export default function Error({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
      <h1 className="text-3xl font-bold text-red-600 mb-4">¡Ocurrió un error!</h1>
      <p className="text-lg text-gray-700 mb-2">{error.message}</p>
      <p className="text-gray-500">Por favor, recarga la página o contacta al administrador.</p>
    </div>
  )
}
